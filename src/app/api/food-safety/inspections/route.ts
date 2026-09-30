import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionActor } from "@/lib/auth/session";
import { authorizeMutation, SecurityError } from "@/lib/security/mutation-guard";

export async function GET() {
  const actor = await getSessionActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [inspections, checklists, trainings] = await Promise.all([
    prisma.foodSafetyInspection.findMany({
      where: { organizationId: actor.organizationId },
      include: {
        checklist: true,
        findings: true,
        branch: { select: { id: true, nameEn: true, nameAr: true } },
      },
      orderBy: { inspectionDate: "desc" },
    }),
    prisma.foodSafetyChecklist.findMany({
      where: { organizationId: actor.organizationId },
    }),
    prisma.foodHandlerTraining.findMany({
      where: { organizationId: actor.organizationId },
      include: {
        employee: { select: { id: true, nameEn: true, nameAr: true, employeeCode: true, jobTitle: true } },
      },
    }),
  ]);

  return NextResponse.json({
    inspections,
    checklists,
    trainings,
  });
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getSessionActor();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      branchId,
      checklistId,
      score = 100,
      notes,
      findings = [],
      authorizationPassword,
    } = body;

    const mutationCtx = await authorizeMutation({
      actor,
      permission: "food_safety.create",
      targetBranchId: branchId,
      authorizationPassword,
      module: "compliance",
      action: "SUBMIT_FOOD_SAFETY_INSPECTION",
      entityType: "FOOD_SAFETY_INSPECTION",
      entityDisplayName: `Inspection Score: ${score}%`,
    });

    const status = Number(score) >= 90 ? (findings.length > 0 ? "NEEDS_ACTION" : "PASSED") : "FAILED";

    const inspection = await prisma.foodSafetyInspection.create({
      data: {
        organizationId: actor.organizationId,
        branchId: branchId || null,
        checklistId,
        inspectorName: actor.name,
        score: Number(score),
        status,
        notes,
        findings: {
          create: findings.map((f: any) => ({
            section: f.section || "General",
            question: f.question,
            severity: f.severity || "MEDIUM",
            description: f.description,
            correctiveAction: f.correctiveAction,
            assignedTo: f.assignedTo,
            status: "OPEN",
          })),
        },
      },
      include: { findings: true },
    });

    await mutationCtx.audit({
      inspectionId: inspection.id,
      score: inspection.score,
      status: inspection.status,
      findingsCount: inspection.findings.length,
    });

    return NextResponse.json({ success: true, inspection });
  } catch (error: any) {
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    console.error("Food safety inspection error:", error);
    return NextResponse.json({ error: error.message || "Failed to submit inspection" }, { status: 500 });
  }
}
