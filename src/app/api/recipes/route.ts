import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionActor } from "@/lib/auth/session";
import { authorizeMutation, SecurityError } from "@/lib/security/mutation-guard";

export async function GET() {
  const actor = await getSessionActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const recipes = await prisma.recipe.findMany({
    where: { organizationId: actor.organizationId },
    include: {
      ingredients: {
        include: {
          item: {
            select: { id: true, nameEn: true, nameAr: true, unit: true, averageCost: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate live ingredient costs based on current averageCost
  const calculatedRecipes = recipes.map((recipe) => {
    let calculatedCost = 0;
    const ingredientsWithLiveCost = recipe.ingredients.map((ing) => {
      const unitCost = Number(ing.item.averageCost);
      const qty = Number(ing.quantity);
      const wasteFactor = 1 + Number(ing.wastePercent) / 100;
      const ingredientCost = qty * unitCost * wasteFactor;
      calculatedCost += ingredientCost;

      return {
        ...ing,
        liveUnitCost: unitCost,
        liveTotalCost: Number(ingredientCost.toFixed(2)),
      };
    });

    const yieldQty = Number(recipe.yieldQuantity) || 1;
    const costPerPortion = Number((calculatedCost / yieldQty).toFixed(2));
    const sellingPrice = Number(recipe.sellingPrice);
    const foodCostPct =
      sellingPrice > 0 ? Number(((costPerPortion / sellingPrice) * 100).toFixed(2)) : 0;
    const grossMargin = Number((sellingPrice - costPerPortion).toFixed(2));

    return {
      ...recipe,
      liveCostPerPortion: costPerPortion,
      liveFoodCostPercentage: foodCostPct,
      grossMargin,
      ingredients: ingredientsWithLiveCost,
    };
  });

  return NextResponse.json({ data: calculatedRecipes });
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getSessionActor();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      sku,
      nameAr,
      nameEn,
      category,
      yieldQuantity = 1,
      portionSize = "1 portion",
      sellingPrice = 0,
      preparationNotes,
      ingredients = [], // Array of { itemId, quantity, unit, wastePercent }
      authorizationPassword,
    } = body;

    if (!sku || !nameEn || !nameAr) {
      return NextResponse.json(
        { error: "SKU, English name, and Arabic name are required." },
        { status: 400 }
      );
    }

    const mutationCtx = await authorizeMutation({
      actor,
      permission: "recipe.create",
      authorizationPassword,
      module: "recipe",
      action: "CREATE_RECIPE",
      entityType: "RECIPE",
      entityDisplayName: `${nameEn} (${sku})`,
    });

    // Calculate recipe cost from ingredients
    let totalRecipeCost = 0;
    const resolvedIngredients = [];

    for (const ing of ingredients) {
      const item = await prisma.inventoryItem.findUnique({
        where: { id: ing.itemId },
      });
      if (item) {
        const unitCost = Number(item.averageCost);
        const qty = Number(ing.quantity);
        const wasteFactor = 1 + (Number(ing.wastePercent) || 0) / 100;
        const ingCost = qty * unitCost * wasteFactor;
        totalRecipeCost += ingCost;

        resolvedIngredients.push({
          itemId: ing.itemId,
          quantity: qty,
          unit: ing.unit || item.unit,
          wastePercent: Number(ing.wastePercent) || 0,
          cost: Number(ingCost.toFixed(2)),
        });
      }
    }

    const yieldQty = Number(yieldQuantity) || 1;
    const costPerPortion = Number((totalRecipeCost / yieldQty).toFixed(2));
    const price = Number(sellingPrice);
    const foodCostPercentage =
      price > 0 ? Number(((costPerPortion / price) * 100).toFixed(2)) : 0;

    const recipe = await prisma.recipe.create({
      data: {
        organizationId: actor.organizationId,
        sku,
        nameAr,
        nameEn,
        category,
        yieldQuantity: yieldQty,
        portionSize,
        sellingPrice: price,
        costPerPortion,
        foodCostPercentage,
        preparationNotes,
        ingredients: {
          create: resolvedIngredients,
        },
      },
      include: { ingredients: true },
    });

    await mutationCtx.audit({
      recipeId: recipe.id,
      sku: recipe.sku,
      name: recipe.nameEn,
      costPerPortion,
      foodCostPercentage,
    });

    return NextResponse.json({ success: true, recipe });
  } catch (error: any) {
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    console.error("Recipe create error:", error);
    return NextResponse.json({ error: error.message || "Failed to create recipe" }, { status: 500 });
  }
}
