import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionActor } from "@/lib/auth/session";
import { authorizeMutation, SecurityError } from "@/lib/security/mutation-guard";

export async function GET() {
  const actor = await getSessionActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payments = await prisma.payment.findMany({
    where: { organizationId: actor.organizationId },
    include: {
      branch: { select: { id: true, nameEn: true, nameAr: true } },
    },
    orderBy: { paymentDate: "desc" },
  });

  return NextResponse.json({ data: payments });
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
      paymentType,
      payee,
      amount,
      paymentMethod = "BANK_TRANSFER",
      reference,
      notes,
      authorizationPassword,
    } = body;

    if (!paymentType || !payee || !amount) {
      return NextResponse.json(
        { error: "Payment type, Payee, and Amount are required." },
        { status: 400 }
      );
    }

    const mutationCtx = await authorizeMutation({
      actor,
      permission: "payment.create",
      targetBranchId: branchId,
      authorizationPassword,
      module: "finance",
      action: "EXECUTE_PAYMENT",
      entityType: "PAYMENT",
      entityDisplayName: `${payee} (AED ${amount})`,
    });

    const count = await prisma.payment.count({
      where: { organizationId: actor.organizationId },
    });
    const paymentNumber = `PAY-2026-${String(count + 1).padStart(3, "0")}`;

    const payment = await prisma.payment.create({
      data: {
        organizationId: actor.organizationId,
        branchId: branchId || null,
        paymentNumber,
        paymentType,
        payee,
        amount: Number(amount),
        currency: "AED",
        paymentMethod,
        reference: reference || null,
        status: "COMPLETED",
        notes: notes || null,
        createdBy: actor.name,
      },
    });

    await mutationCtx.audit({
      paymentId: payment.id,
      paymentNumber: payment.paymentNumber,
      payee: payment.payee,
      amount: payment.amount,
      type: payment.paymentType,
    });

    return NextResponse.json({ success: true, payment });
  } catch (error: any) {
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    console.error("Payment error:", error);
    return NextResponse.json({ error: error.message || "Payment execution failed" }, { status: 500 });
  }
}
