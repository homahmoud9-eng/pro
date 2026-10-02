import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionActor } from "@/lib/auth/session";
import { authorizeMutation, SecurityError } from "@/lib/security/mutation-guard";

export async function GET() {
  const actor = await getSessionActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const wasteRecords = await prisma.wasteRecord.findMany({
    where: { organizationId: actor.organizationId },
    include: {
      item: { select: { id: true, nameEn: true, nameAr: true, sku: true, unit: true } },
      branch: { select: { id: true, nameEn: true, nameAr: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: wasteRecords, wasteRecords });
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getSessionActor();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { itemId, branchId, quantity, reason, notes, authorizationPassword } = body;

    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
    });

    if (!item || item.organizationId !== actor.organizationId) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const qty = Number(quantity);
    const unitCost = Number(item.averageCost);
    const cost = qty * unitCost;

    const mutationCtx = await authorizeMutation({
      actor,
      permission: "inventory.adjust",
      targetBranchId: branchId || item.branchId,
      authorizationPassword,
      module: "operations",
      action: "RECORD_WASTE",
      entityType: "WASTE_RECORD",
      entityDisplayName: `${item.nameEn} (${qty} ${item.unit})`,
      reason,
    });

    const waste = await prisma.$transaction(async (tx) => {
      const rec = await tx.wasteRecord.create({
        data: {
          organizationId: actor.organizationId,
          branchId: branchId || item.branchId,
          itemId: item.id,
          quantity: qty,
          unit: item.unit,
          cost,
          reason,
          employeeName: actor.name,
          notes,
        },
      });

      await tx.stockMovement.create({
        data: {
          organizationId: actor.organizationId,
          branchId: branchId || item.branchId,
          itemId: item.id,
          movementType: "WASTE",
          quantity: -qty,
          unitCost,
          totalCost: -cost,
          referenceType: "WASTE",
          referenceId: rec.id,
          performedBy: actor.name,
        },
      });

      await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          currentStock: {
            decrement: qty,
          },
        },
      });

      return rec;
    });

    await mutationCtx.audit({
      wasteId: waste.id,
      item: item.nameEn,
      quantity: qty,
      cost,
      reason,
    });

    return NextResponse.json({ success: true, waste });
  } catch (error: any) {
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    console.error("Waste record error:", error);
    return NextResponse.json({ error: error.message || "Failed to record waste" }, { status: 500 });
  }
}
