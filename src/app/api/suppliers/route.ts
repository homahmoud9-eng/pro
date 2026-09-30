import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionActor } from "@/lib/auth/session";
import { authorizeMutation, SecurityError } from "@/lib/security/mutation-guard";

export async function GET() {
  const actor = await getSessionActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const suppliers = await prisma.supplier.findMany({
    where: { organizationId: actor.organizationId },
    include: {
      _count: { select: { inventoryItems: true, purchaseOrders: true } },
    },
    orderBy: { legalName: "asc" },
  });

  return NextResponse.json({ data: suppliers });
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getSessionActor();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { legalName, tradingName, contactPerson, phone, email, address, trn, paymentTerms, authorizationPassword } = body;

    if (!legalName) {
      return NextResponse.json({ error: "Supplier legal name is required." }, { status: 400 });
    }

    const mutationCtx = await authorizeMutation({
      actor,
      permission: "supplier.create",
      authorizationPassword,
      module: "operations",
      action: "CREATE_SUPPLIER",
      entityType: "SUPPLIER",
      entityDisplayName: legalName,
    });

    const count = await prisma.supplier.count({
      where: { organizationId: actor.organizationId },
    });
    const code = `SUPP-${String(count + 1).padStart(2, "0")}`;

    const supplier = await prisma.supplier.create({
      data: {
        organizationId: actor.organizationId,
        code,
        legalName,
        tradingName: tradingName || null,
        contactPerson: contactPerson || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        trn: trn || null,
        paymentTerms: paymentTerms || "Net 30",
        status: "ACTIVE",
      },
    });

    await mutationCtx.audit({
      supplierId: supplier.id,
      code: supplier.code,
      legalName: supplier.legalName,
      trn: supplier.trn,
    });

    return NextResponse.json({ success: true, supplier });
  } catch (error: any) {
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    console.error("Supplier create error:", error);
    return NextResponse.json({ error: error.message || "Failed to create supplier" }, { status: 500 });
  }
}
