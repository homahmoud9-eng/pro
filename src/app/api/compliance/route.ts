import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionActor } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const actor = await getSessionActor();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");
    const category = searchParams.get("category");

    const orgId = actor.organizationId;
    const branchFilter = branchId && branchId !== "ALL" ? { branchId } : {};

    const [
      organization,
      branches,
      requirements,
      inspections,
      findings,
      correctiveActions,
      efstTrainings,
      foodSafetyLogs,
      traceabilityRecords,
      employees,
      expiringDocs,
    ] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: orgId },
        select: { id: true, nameAr: true, nameEn: true, code: true, licenseNumbers: true, trn: true },
      }),
      prisma.branch.findMany({
        where: { organizationId: orgId, status: "ACTIVE" },
        select: { id: true, code: true, nameAr: true, nameEn: true, address: true },
        orderBy: { code: "asc" },
      }),
      prisma.regulatoryRequirement.findMany({
        where: {
          organizationId: orgId,
          status: "ACTIVE",
          ...(category && category !== "ALL" ? { category } : {}),
        },
        include: {
          complianceRecords: {
            where: branchId && branchId !== "ALL" ? { branchId } : {},
            include: { branch: { select: { id: true, nameAr: true, nameEn: true, code: true } } },
          },
          versions: { orderBy: { versionNumber: "desc" }, take: 1 },
        },
        orderBy: { code: "asc" },
      }),
      prisma.foodSafetyInspection.findMany({
        where: { organizationId: orgId, ...branchFilter },
        include: {
          branch: { select: { id: true, nameAr: true, nameEn: true, code: true } },
          findings: true,
        },
        orderBy: { inspectionDate: "desc" },
        take: 50,
      }),
      prisma.foodSafetyFinding.findMany({
        where: {
          inspection: { organizationId: orgId },
          ...(branchId && branchId !== "ALL" ? { branchId } : {}),
        },
        include: {
          inspection: { select: { id: true, authority: true, inspectionType: true, inspectionDate: true, referenceNumber: true } },
          branch: { select: { id: true, nameAr: true, nameEn: true, code: true } },
          correctiveActions: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.correctiveAction.findMany({
        where: { organizationId: orgId, ...branchFilter },
        include: {
          branch: { select: { id: true, nameAr: true, nameEn: true, code: true } },
          finding: { select: { id: true, findingNumber: true, description: true, severity: true } },
        },
        orderBy: { dueDate: "asc" },
        take: 50,
      }),
      prisma.foodHandlerTraining.findMany({
        where: { organizationId: orgId, ...branchFilter },
        include: {
          employee: { select: { id: true, nameAr: true, nameEn: true, employeeCode: true, jobTitle: true } },
          branch: { select: { id: true, nameAr: true, nameEn: true, code: true } },
        },
        orderBy: { trainingDate: "desc" },
      }),
      prisma.foodSafetyLog.findMany({
        where: { organizationId: orgId, ...branchFilter },
        include: {
          branch: { select: { id: true, nameAr: true, nameEn: true, code: true } },
        },
        orderBy: { recordedAt: "desc" },
        take: 50,
      }),
      prisma.traceabilityRecord.findMany({
        where: { organizationId: orgId, ...branchFilter },
        include: {
          branch: { select: { id: true, nameAr: true, nameEn: true, code: true } },
        },
        orderBy: { receivedDate: "desc" },
        take: 50,
      }),
      prisma.employee.findMany({
        where: { organizationId: orgId, status: "ACTIVE", ...branchFilter },
        select: { id: true, nameEn: true, nameAr: true, employeeCode: true, jobTitle: true },
      }),
      prisma.document.findMany({
        where: {
          organizationId: orgId,
          status: { in: ["EXPIRED", "EXPIRING_SOON"] },
          ...(branchId && branchId !== "ALL" ? { branchId } : {}),
        },
        include: {
          documentType: { select: { nameAr: true, nameEn: true, category: true } },
          branch: { select: { id: true, nameAr: true, nameEn: true, code: true } },
        },
        take: 20,
      }),
    ]);

    // Live Metrics Computation
    const now = new Date();
    const openFindingsCount = findings.filter((f) => f.status !== "CLOSED").length;
    const openCorrectiveActionsCount = correctiveActions.filter((c) => c.status !== "CLOSED").length;
    const overdueCorrectiveActionsCount = correctiveActions.filter(
      (c) => c.status !== "CLOSED" && new Date(c.dueDate) < now
    ).length;
    const upcomingInspectionsCount = inspections.filter(
      (i) => i.status === "SCHEDULED" || i.status === "IN_PROGRESS" || i.status === "FOLLOW_UP_REQUIRED"
    ).length;

    // EFST Food Handlers Coverage
    const totalFoodHandlers = employees.length;
    const validEfstCount = efstTrainings.filter(
      (t) => t.status === "COMPLETED" && (!t.expiryDate || new Date(t.expiryDate) >= now)
    ).length;
    const efstCoveragePercent =
      totalFoodHandlers > 0 ? Math.round((validEfstCount / totalFoodHandlers) * 100) : null;

    // Real compliance verification metrics
    const allComplianceRecords = requirements.flatMap((r) => r.complianceRecords);
    const compliantCount = allComplianceRecords.filter((r) => r.status === "COMPLIANT").length;
    const pendingCount = allComplianceRecords.filter((r) => r.status === "PENDING").length;
    const nonCompliantCount = allComplianceRecords.filter((r) => r.status === "NON_COMPLIANT").length;

    const hasRealData =
      inspections.length > 0 ||
      findings.length > 0 ||
      correctiveActions.length > 0 ||
      efstTrainings.length > 0 ||
      allComplianceRecords.length > 0 ||
      foodSafetyLogs.length > 0 ||
      traceabilityRecords.length > 0;

    return NextResponse.json({
      organization,
      branches,
      metrics: {
        totalRequirements: requirements.length,
        compliantRecords: compliantCount,
        pendingRecords: pendingCount,
        nonCompliantRecords: nonCompliantCount,
        openFindings: openFindingsCount,
        openCorrectiveActions: openCorrectiveActionsCount,
        overdueCorrectiveActions: overdueCorrectiveActionsCount,
        upcomingInspections: upcomingInspectionsCount,
        expiringDocumentsCount: expiringDocs.length,
        efstTotalHandlers: totalFoodHandlers,
        efstCertifiedCount: validEfstCount,
        efstCoveragePercent,
        hasRealData,
      },
      requirements,
      inspections,
      findings,
      correctiveActions,
      efstTrainings,
      foodSafetyLogs,
      traceabilityRecords,
      expiringDocuments: expiringDocs,
    });
  } catch (error: any) {
    console.error("GET /api/compliance error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
