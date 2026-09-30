import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionActor } from "@/lib/auth/session";
import { authorizeMutation, SecurityError } from "@/lib/security/mutation-guard";

export async function GET(req: NextRequest) {
  const actor = await getSessionActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId");
  const category = searchParams.get("category");
  const lowStockOnly = searchParams.get("lowStock") === "true";
  const search = searchParams.get("search");

  const where: any = {
    organizationId: actor.organizationId,
  };

  if (actor.branchScopes.length > 0) {
    where.OR = [
      { branchId: { in: actor.branchScopes } },
      { branchId: null },
    ];
  } else if (branchId && branchId !== "ALL") {
    where.branchId = branchId;
  }

  if (category && category !== "ALL") {
    where.category = category;
  }

  if (search) {
    where.OR = [
      { nameEn: { contains: search, mode: "insensitive" } },
      { nameAr: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
    ];
  }

  const items = await prisma.inventoryItem.findMany({
    where,
    include: {
      supplier: { select: { id: true, legalName: true, tradingName: true } },
      branch: { select: { id: true, nameEn: true, nameAr: true, code: true } },
    },
    orderBy: { category: "asc" },
  });

  const filteredItems = lowStockOnly
    ? items.filter((item) => Number(item.currentStock) <= Number(item.reorderPoint))
    : items;

  return NextResponse.json({ data: filteredItems });
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getSessionActor();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { actionType } = body;

    // Sub-case 1: Create new inventory item
    if (actionType === "CREATE_ITEM") {
      const {
        sku,
        nameAr,
        nameEn,
        category,
        unit,
        minStock = 10,
        reorderPoint = 20,
        averageCost = 0,
        branchId,
        supplierId,
        authorizationPassword,
      } = body;

      const mutationCtx = await authorizeMutation({
        actor,
        permission: "inventory.create",
        targetBranchId: branchId,
        authorizationPassword,
        module: "inventory",
        action: "CREATE_INVENTORY_ITEM",
        entityType: "INVENTORY_ITEM",
        entityDisplayName: `${nameEn} (${sku})`,
      });

      const item = await prisma.inventoryItem.create({
        data: {
          organizationId: actor.organizationId,
          branchId: branchId || null,
          supplierId: supplierId || null,
          sku,
          nameAr,
          nameEn,
          category,
          unit,
          minStock: Number(minStock),
          reorderPoint: Number(reorderPoint),
          currentStock: 0,
          averageCost: Number(averageCost),
          lastPurchaseCost: Number(averageCost),
        },
      });

      await mutationCtx.audit({
        itemId: item.id,
        sku: item.sku,
        name: item.nameEn,
      });

      return NextResponse.json({ success: true, item });
    }

    // Sub-case 2: Atomic branch transfer (Scenario L in spec!)
    if (actionType === "BRANCH_TRANSFER") {
      const {
        itemId,
        fromBranchId,
        toBranchId,
        quantity,
        notes,
        authorizationPassword,
      } = body;

      if (!itemId || !fromBranchId || !toBranchId || !quantity || Number(quantity) <= 0) {
        return NextResponse.json(
          { error: "Item, source branch, destination branch, and positive quantity are required." },
          { status: 400 }
        );
      }

      if (fromBranchId === toBranchId) {
        return NextResponse.json(
          { error: "Source and destination branches must be distinct." },
          { status: 400 }
        );
      }

      const item = await prisma.inventoryItem.findUnique({
        where: { id: itemId },
      });

      if (!item || item.organizationId !== actor.organizationId) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }

      // Check current stock
      if (Number(item.currentStock) < Number(quantity)) {
        return NextResponse.json(
          { error: `Insufficient stock. Current stock is ${item.currentStock} ${item.unit}.` },
          { status: 400 }
        );
      }

      const mutationCtx = await authorizeMutation({
        actor,
        permission: "inventory.adjust",
        targetBranchId: fromBranchId,
        authorizationPassword,
        module: "inventory",
        action: "BRANCH_TRANSFER",
        entityType: "INVENTORY_ITEM",
        entityId: item.id,
        entityDisplayName: `${item.nameEn} (${item.sku})`,
        reason: notes || `Transfer ${quantity} ${item.unit} to branch ${toBranchId}`,
      });

      const qty = Number(quantity);
      const unitCost = Number(item.averageCost);
      const totalCost = qty * unitCost;

      // ATOMIC TRANSACTION: Out movement + In movement + stock update
      const result = await prisma.$transaction(async (tx) => {
        const outMovement = await tx.stockMovement.create({
          data: {
            organizationId: actor.organizationId,
            branchId: fromBranchId,
            itemId: item.id,
            movementType: "TRANSFER_OUT",
            quantity: -qty,
            unitCost,
            totalCost: -totalCost,
            notes: `Transfer out to branch: ${toBranchId}`,
            performedBy: actor.name,
          },
        });

        const inMovement = await tx.stockMovement.create({
          data: {
            organizationId: actor.organizationId,
            branchId: toBranchId,
            itemId: item.id,
            movementType: "TRANSFER_IN",
            quantity: qty,
            unitCost,
            totalCost,
            notes: `Transfer in from branch: ${fromBranchId}`,
            performedBy: actor.name,
          },
        });

        // Update item branch or balance
        const updatedItem = await tx.inventoryItem.update({
          where: { id: item.id },
          data: {
            currentStock: {
              decrement: qty,
            },
          },
        });

        return { outMovement, inMovement, updatedItem };
      });

      await mutationCtx.audit({
        itemId: item.id,
        sku: item.sku,
        quantity: qty,
        fromBranchId,
        toBranchId,
        unitCost,
      });

      return NextResponse.json({ success: true, ...result });
    }

    // Sub-case 3: Stock Adjustment (e.g. Physical inventory count / adjustment)
    if (actionType === "ADJUSTMENT") {
      const { itemId, branchId, quantity, reason, authorizationPassword } = body;

      const item = await prisma.inventoryItem.findUnique({
        where: { id: itemId },
      });

      if (!item || item.organizationId !== actor.organizationId) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }

      const mutationCtx = await authorizeMutation({
        actor,
        permission: "inventory.adjust",
        targetBranchId: branchId || item.branchId,
        authorizationPassword,
        module: "inventory",
        action: "STOCK_ADJUSTMENT",
        entityType: "INVENTORY_ITEM",
        entityId: item.id,
        entityDisplayName: `${item.nameEn} (${item.sku})`,
        reason,
      });

      const qty = Number(quantity);
      const unitCost = Number(item.averageCost);
      const totalCost = qty * unitCost;

      const updated = await prisma.$transaction(async (tx) => {
        await tx.stockMovement.create({
          data: {
            organizationId: actor.organizationId,
            branchId: branchId || item.branchId,
            itemId: item.id,
            movementType: "ADJUSTMENT",
            quantity: qty,
            unitCost,
            totalCost,
            notes: reason,
            performedBy: actor.name,
          },
        });

        return tx.inventoryItem.update({
          where: { id: item.id },
          data: {
            currentStock: {
              increment: qty,
            },
          },
        });
      });

      await mutationCtx.audit({
        itemId: item.id,
        sku: item.sku,
        quantity: qty,
        newStock: updated.currentStock,
        reason,
      });

      return NextResponse.json({ success: true, item: updated });
    }

    return NextResponse.json({ error: "Unknown actionType" }, { status: 400 });
  } catch (error: any) {
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    console.error("Inventory error:", error);
    return NextResponse.json({ error: error.message || "Inventory operation failed" }, { status: 500 });
  }
}
