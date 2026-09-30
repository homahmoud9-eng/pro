import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionActor } from "@/lib/auth/session";
import { authorizeMutation, SecurityError } from "@/lib/security/mutation-guard";

export async function GET() {
  const actor = await getSessionActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [expenses, categories, branches] = await Promise.all([
    prisma.expense.findMany({
      where: { organizationId: actor.organizationId },
      include: {
        category: true,
        branch: { select: { id: true, nameEn: true, nameAr: true } },
      },
      orderBy: { date: "desc" },
    }),
    prisma.expenseCategory.findMany({
      where: { organizationId: actor.organizationId },
    }),
    prisma.branch.findMany({
      where: { organizationId: actor.organizationId },
      select: { id: true, nameEn: true, nameAr: true },
    }),
  ]);

  return NextResponse.json({ data: expenses, categories, branches });
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getSessionActor();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      categoryId,
      branchId,
      payee,
      amount,
      vatAmount = 0,
      paymentMethod = "BANK_TRANSFER",
      description,
      authorizationPassword,
    } = body;

    if (!categoryId || !payee || !amount) {
      return NextResponse.json(
        { error: "Category, Payee, and Amount are required." },
        { status: 400 }
      );
    }

    const mutationCtx = await authorizeMutation({
      actor,
      permission: "expense.create",
      targetBranchId: branchId,
      authorizationPassword,
      module: "finance",
      action: "CREATE_EXPENSE",
      entityType: "EXPENSE",
      entityDisplayName: `${payee} (AED ${amount})`,
    });

    const count = await prisma.expense.count({
      where: { organizationId: actor.organizationId },
    });
    const expenseNumber = `EXP-2026-${String(count + 1).padStart(3, "0")}`;

    const expense = await prisma.expense.create({
      data: {
        organizationId: actor.organizationId,
        branchId: branchId || null,
        expenseNumber,
        categoryId,
        payee,
        amount: Number(amount),
        currency: "AED",
        vatAmount: Number(vatAmount),
        paymentMethod,
        status: "APPROVED",
        description,
        createdBy: actor.name,
        approvedBy: actor.name,
      },
      include: { category: true },
    });

    await mutationCtx.audit({
      expenseId: expense.id,
      expenseNumber: expense.expenseNumber,
      payee: expense.payee,
      amount: expense.amount,
      vatAmount: expense.vatAmount,
    });

    return NextResponse.json({ success: true, expense });
  } catch (error: any) {
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    console.error("Expense error:", error);
    return NextResponse.json({ error: error.message || "Failed to create expense" }, { status: 500 });
  }
}
