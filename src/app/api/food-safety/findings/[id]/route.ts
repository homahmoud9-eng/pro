import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionActor } from "@/lib/auth/session";
import { authorizeMutation, SecurityError } from "@/lib/security/mutation-guard";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getSessionActor();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, correctiveAction, authorizationPassword } = body;

    const finding = await prisma.foodSafetyFinding.findUnique({
      where: { id },
      include: { inspection: true },
    });

    if (!finding || finding.inspection.organizationId !== actor.organizationId) {
      return NextResponse.json({ error: "Finding not found" }, { status: 404 });
    }

    const mutationCtx = await authorizeMutation({
      actor,
      permission: "food_safety.approve",
      targetBranchId: finding.inspection.branchId,
      authorizationPassword,
      module: "compliance",
      action: "RESOLVE_FOOD_SAFETY_FINDING",
      entityType: "FOOD_SAFETY_FINDING",
      entityId: finding.id,
      entityDisplayName: `${finding.section}: ${finding.question}`,
      changesBefore: { status: finding.status },
      changesAfter: { status: status || "RESOLVED", correctiveAction },
    });

    const isClosed = status === "CLOSED" || status === "VERIFIED" || status === "RESOLVED";

    const updated = await prisma.foodSafetyFinding.update({
      where: { id },
      data: {
        status: status || "RESOLVED",
        correctiveAction: correctiveAction || finding.correctiveAction,
        closedBy: isClosed ? actor.name : undefined,
        closedAt: isClosed ? new Date() : undefined,
      },
    });

    await mutationCtx.audit();

    return NextResponse.json({ success: true, finding: updated });
  } catch (error: any) {
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    console.error("Resolve finding error:", error);
    return NextResponse.json({ error: error.message || "Failed to update finding" }, { status: 500 });
  }
}
