import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionActor } from "@/lib/auth/session";

export async function GET() {
  const actor = await getSessionActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Aggregate financial metrics from real database records
  const [expenses, payments, taxRecords, inventoryItems, branches, organization] = await Promise.all([
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
    prisma.branch.findMany({
      where: { organizationId: actor.organizationId },
      select: { id: true, nameEn: true, nameAr: true, code: true },
    }),
    prisma.organization.findUnique({
      where: { id: actor.organizationId },
      select: { nameEn: true, nameAr: true, trn: true },
    }),
  ]);

  const totalExpenses = expenses.reduce((acc, exp) => acc + Number(exp.amount || 0), 0);
  const totalVatOnExpenses = expenses.reduce((acc, exp) => acc + Number(exp.vatAmount || 0), 0);
  const totalPaymentsMade = payments.reduce((acc, pay) => acc + Number(pay.amount || 0), 0);

  // Real inventory asset valuation
  const inventoryValuation = inventoryItems.reduce(
    (acc, it) => acc + Number(it.currentStock || 0) * Number(it.averageCost || 0),
    0
  );

  // Revenue from recorded sales transactions / tax records (0 if clean/no records)
  const totalRevenue = taxRecords.reduce(
    (acc, rec) => acc + Number(rec.taxableSales || 0),
    0
  );

  const netCashFlow = totalRevenue - totalPaymentsMade - totalExpenses;

  const currentVatLiability = taxRecords.reduce(
    (acc, rec) => acc + Number(rec.netTaxPayable || 0),
    0
  );

  // Construct dynamic corporate vaults from real database state
  const wallets = [
    {
      id: "vault_corporate_main",
      name: organization?.nameEn ? `${organization.nameEn} Operating Vault` : "Corporate Operating Treasury",
      type: "OPERATING_TREASURY",
      accountNumber: organization?.trn ? `AE-TRN-${organization.trn}` : "AE-TREASURY-01",
      balance: Math.max(0, netCashFlow),
      currency: "AED",
      branch: null,
    },
    ...branches.map((b) => {
      const branchExpenses = expenses
        .filter((e) => e.branchId === b.id)
        .reduce((acc, e) => acc + Number(e.amount || 0), 0);
      const branchPayments = payments
        .filter((p) => p.branchId === b.id)
        .reduce((acc, p) => acc + Number(p.amount || 0), 0);
      return {
        id: `vault_branch_${b.id}`,
        name: `${b.nameEn} Petty Cash & Ops Vault`,
        type: "BRANCH_PETTY_CASH",
        accountNumber: `BRANCH-${b.code}`,
        balance: 0,
        currency: "AED",
        branch: { nameEn: b.nameEn },
      };
    }),
  ];

  return NextResponse.json({
    wallet: {
      currency: "AED",
      estimatedRevenue: Number(totalRevenue.toFixed(2)),
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalExpenses: Number(totalExpenses.toFixed(2)),
      totalVatOnExpenses: Number(totalVatOnExpenses.toFixed(2)),
      totalPaymentsMade: Number(totalPaymentsMade.toFixed(2)),
      netCashPosition: Number(netCashFlow.toFixed(2)),
      inventoryValuation: Number(inventoryValuation.toFixed(2)),
      currentVatLiability: Number(currentVatLiability.toFixed(2)),
      recentExpenses: expenses.slice(0, 5),
      recentPayments: payments.slice(0, 5),
    },
    wallets,
  });
}
