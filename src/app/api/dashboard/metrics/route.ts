import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionActor } from "@/lib/auth/session";
import { DashboardDataResponse, DEFAULT_DASHBOARD_METRICS } from "@/types/dashboard";

export async function GET() {
  try {
    const actor = await getSessionActor();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = actor.organizationId;

    // Real database queries with Promise.all
    const [
      totalEmployees,
      activeEmployees,
      totalDocuments,
      activeDocuments,
      expiredDocs,
      expiringDocs,
      totalProcedures,
      openProcedures,
      inProgressProcedures,
      expenses,
      inventoryItems,
      recipes,
      taxRecords,
      openFindings,
      recentAudits,
    ] = await Promise.all([
      prisma.employee.count({ where: { organizationId: orgId } }),
      prisma.employee.count({ where: { organizationId: orgId, status: "ACTIVE" } }),
      prisma.document.count({ where: { organizationId: orgId } }),
      prisma.document.count({ where: { organizationId: orgId, status: "ACTIVE" } }),
      prisma.document.count({ where: { organizationId: orgId, status: "EXPIRED" } }),
      prisma.document.count({ where: { organizationId: orgId, status: "EXPIRING_SOON" } }),
      prisma.procedure.count({ where: { organizationId: orgId } }),
      prisma.procedure.count({ where: { organizationId: orgId, status: { in: ["PENDING", "DRAFT"] } } }),
      prisma.procedure.count({ where: { organizationId: orgId, status: "IN_PROGRESS" } }),
      prisma.expense.findMany({ where: { organizationId: orgId } }),
      prisma.inventoryItem.findMany({ where: { organizationId: orgId } }),
      prisma.recipe.findMany({ where: { organizationId: orgId } }),
      prisma.taxRecord.findMany({ where: { organizationId: orgId } }),
      prisma.foodSafetyFinding.count({
        where: {
          inspection: { organizationId: orgId },
          status: { in: ["OPEN", "IN_PROGRESS"] },
        },
      }),
      prisma.auditLog.findMany({
        where: { organizationId: orgId },
        orderBy: { occurredAt: "desc" },
        take: 6,
      }),
    ]);

    // Financial aggregations safely handled for zero / non-zero state
    const monthExpenses = expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
    const inventoryValue = inventoryItems.reduce(
      (acc, it) => acc + Number(it.currentStock || 0) * Number(it.averageCost || 0),
      0
    );

    const monthSales = taxRecords.reduce((acc, tr) => acc + Number(tr.taxableSales || 0), 0);
    const todaySales = monthSales > 0 ? Number((monthSales / 30).toFixed(2)) : 0;
    const netWallet = monthSales - monthExpenses;

    const foodCostPercent =
      recipes.length > 0
        ? Number(
            (
              recipes.reduce((acc, r) => acc + Number(r.foodCostPercentage || 0), 0) /
              recipes.length
            ).toFixed(2)
          )
        : 0;

    // Compute Employee Documents breakdown
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const employeeDocs = await prisma.document.findMany({
      where: {
        organizationId: orgId,
        OR: [{ entityType: "EMPLOYEE" }, { employeeId: { not: null } }],
      },
      select: { id: true, status: true, expiryDate: true },
    });

    const validEmployeeDocs = employeeDocs.filter(
      (d) =>
        (d.expiryDate && d.expiryDate > ninetyDaysFromNow) ||
        (d.status === "ACTIVE" && (!d.expiryDate || d.expiryDate > ninetyDaysFromNow))
    ).length;

    const expiring90Docs = employeeDocs.filter(
      (d) => d.expiryDate && d.expiryDate > thirtyDaysFromNow && d.expiryDate <= ninetyDaysFromNow
    ).length;

    const expiring30Docs = employeeDocs.filter(
      (d) => d.expiryDate && d.expiryDate >= now && d.expiryDate <= thirtyDaysFromNow
    ).length;

    const expiredEmployeeDocs = employeeDocs.filter(
      (d) => (d.expiryDate && d.expiryDate < now) || d.status === "EXPIRED"
    ).length;

    const expectedDocs = Number(activeEmployees || 0) * 6;
    const missingDocs = Math.max(0, expectedDocs - employeeDocs.length);

    const responsePayload: DashboardDataResponse = {
      metrics: {
        totalEmployees: Number(totalEmployees || 0),
        activeEmployees: Number(activeEmployees || 0),
        totalDocuments: Number(totalDocuments || 0),
        activeDocuments: Number(activeDocuments || 0),
        expiredDocs: Number(expiredDocs || 0),
        expiringDocs: Number(expiringDocs || 0),
        totalProcedures: Number(totalProcedures || 0),
        openProcedures: Number(openProcedures || 0) + Number(inProgressProcedures || 0),
        inProgressProcedures: Number(inProgressProcedures || 0),
        todaySales: Number(todaySales.toFixed(2)),
        monthSales: Number(monthSales.toFixed(2)),
        monthExpenses: Number(monthExpenses.toFixed(2)),
        netWallet: Number(netWallet.toFixed(2)),
        inventoryValue: Number(inventoryValue.toFixed(2)),
        foodCostPercent,
        openFindings: Number(openFindings || 0),
        currency: "AED",
        employeeDocStats: {
          valid: validEmployeeDocs,
          expiring90: expiring90Docs,
          expiring30: expiring30Docs,
          expired: expiredEmployeeDocs,
          missing: missingDocs,
        },
      },
      recentAudits: recentAudits.map((a) => ({
        id: a.id,
        sequenceNumber: a.sequenceNumber,
        action: a.action,
        actorNameSnapshot: a.actorNameSnapshot,
        occurredAt: a.occurredAt.toISOString(),
        entityType: a.entityType,
        entityDisplayName: a.entityDisplayName || undefined,
        reason: a.reason || undefined,
      })),
    };

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error("Dashboard metrics route error:", error);
    return NextResponse.json(
      {
        error: "Failed to compute dashboard metrics",
        details: error?.message || "Unknown error",
        metrics: DEFAULT_DASHBOARD_METRICS,
        recentAudits: [],
      },
      { status: 500 }
    );
  }
}
