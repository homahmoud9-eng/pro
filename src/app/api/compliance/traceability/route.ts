import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionActor } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/audit-service";

export async function GET(req: NextRequest) {
  try {
    const actor = await getSessionActor();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");
    const where: any = { organizationId: actor.organizationId };
    if (branchId && branchId !== "ALL") where.branchId = branchId;

    const records = await prisma.traceabilityRecord.findMany({
      where,
      include: { branch: { select: { id: true, nameAr: true, nameEn: true, code: true } } },
      orderBy: { receivedDate: "desc" },
      take: 100,
    });

    return NextResponse.json({ records });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
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
      batchLotNumber,
      productName,
      supplierName,
      receivedDate = new Date(),
      expiryDate,
      quantityReceived,
      storageLocation,
      notes,
    } = body;

    if (!batchLotNumber || !productName || !supplierName) {
      return NextResponse.json(
        { error: "batchLotNumber, productName, and supplierName are required" },
        { status: 400 }
      );
    }

    const record = await prisma.traceabilityRecord.create({
      data: {
        organizationId: actor.organizationId,
        branchId: branchId || null,
        batchLotNumber,
        productName,
        supplierName,
        receivedDate: new Date(receivedDate),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        quantityReceived: quantityReceived ? Number(quantityReceived) : null,
        storageLocation,
        notes,
      },
    });

    await writeAuditLog({
      organizationId: actor.organizationId,
      branchId: branchId || null,
      actorUserId: actor.id,
      actorNameSnapshot: actor.name,
      action: "TRACEABILITY_RECORD_CREATED",
      module: "COMPLIANCE",
      entityType: "TRACEABILITY_RECORD",
      entityId: record.id,
      entityDisplayName: `${productName} (Lot #${batchLotNumber})`,
      metadata: { supplierName, batchLotNumber, storageLocation },
    });

    return NextResponse.json({ success: true, record });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
