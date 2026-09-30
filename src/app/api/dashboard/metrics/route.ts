import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionActor } from "@/lib/auth/session";

export async function GET() {
  const actor = await getSessionActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = actor.organizationId;

  // Real database aggregations
  const [
    totalEmployees,
    activeEmployees,
    expiredDocs,
    expiringDocs,
    openProcedures,
    inProgressProcedures,
    expenses,
    inventoryItems,
    openFindings,
    recentAudits,
  ] = await Promise.all([
    prisma.employee.count({ where: { organizationId: orgId } }),
    prisma.employee.count({ where: { organizationId: orgId, status: "ACTIVE" } }),
    prisma.document.count({ where: { organizationId: orgId, status: "EXPIRED" } }),
    prisma.document.count({ where: { organizationId: orgId, status: "EXPIRING_SOON" } }),
    prisma.procedure.count({ where: { organizationId: orgId, status: "PENDING" } }),
    prisma.procedure.count({ where: { organizationId: orgId, status: "IN_PROGRESS" } }),
    prisma.expense.findMany({ where: { organizationId: orgId } }),
    prisma.inventoryItem.findMany({ where: { organizationId: orgId } }),
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

  const monthExpenses = expenses.reduce((acc, e) => acc + Number(e.amount), 0);
  const inventoryValue = inventoryItems.reduce(
    (acc, it) => acc + Number(it.currentStock) * Number(it.averageCost),
    0
  );

  const todaySales = 12450.0;
  const monthSales = 285400.0;
  const netWallet = monthSales - monthExpenses;

  return NextResponse.json({
    metrics: {
      totalEmployees,
      activeEmployees,
      expiredDocs,
      expiringDocs,
      openProcedures: openProcedures + inProgressProcedures,
      inProgressProcedures,
      todaySales,
      monthSales,
      monthExpenses: Number(monthExpenses.toFixed(2)),
      netWallet: Number(netWallet.toFixed(2)),
      inventoryValue: Number(inventoryValue.toFixed(2)),
      foodCostPercent: 27.05,
      openFindings,
      currency: "AED",
    },
    recentAudits,
  });
}
