import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionActor } from "@/lib/auth/session";

export async function GET() {
  const actor = await getSessionActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Aggregate financial metrics
  const [expenses, payments, taxRecords, inventoryItems] = await Promise.all([
    prisma.expense.findMany({
      where: { organizationId: actor.organizationId },
    }),
    prisma.payment.findMany({
      where: { organizationId: actor.organizationId, status: "COMPLETED" },
    }),
    prisma.taxRecord.findMany({
      where: { organizationId: actor.organizationId },
    }),
    prisma.inventoryItem.findMany({
      where: { organizationId: actor.organizationId },
    }),
  ]);

  const totalExpenses = expenses.reduce((acc, exp) => acc + Number(exp.amount), 0);
  const totalVatOnExpenses = expenses.reduce((acc, exp) => acc + Number(exp.vatAmount), 0);
  const totalPaymentsMade = payments.reduce((acc, pay) => acc + Number(pay.amount), 0);

  // Approximate inventory asset valuation
  const inventoryValuation = inventoryItems.reduce(
    (acc, it) => acc + Number(it.currentStock) * Number(it.averageCost),
    0
  );

  // Estimated gross revenue benchmark
  const estimatedRevenue = 285400.0;
  const netCashFlow = estimatedRevenue - totalPaymentsMade;

  const currentVatLiability = taxRecords.reduce(
    (acc, rec) => acc + Number(rec.netTaxPayable),
    0
  );

  return NextResponse.json({
    wallet: {
      currency: "AED",
      estimatedRevenue,
      totalExpenses: Number(totalExpenses.toFixed(2)),
      totalVatOnExpenses: Number(totalVatOnExpenses.toFixed(2)),
      totalPaymentsMade: Number(totalPaymentsMade.toFixed(2)),
      netCashPosition: Number(netCashFlow.toFixed(2)),
      inventoryValuation: Number(inventoryValuation.toFixed(2)),
      currentVatLiability: Number(currentVatLiability.toFixed(2)),
      recentExpenses: expenses.slice(0, 5),
      recentPayments: payments.slice(0, 5),
    },
  });
}
