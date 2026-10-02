import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionActor } from "@/lib/auth/session";
import { authorizeMutation, SecurityError } from "@/lib/security/mutation-guard";
import { writeAuditLog } from "@/lib/audit/audit-service";

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
    const { status = "CLOSED", resolutionNotes, authorizationPassword } = body;

    const action = await prisma.correctiveAction.findUnique({
      where: { id },
      include: { finding: true },
    });

    if (!action || action.organizationId !== actor.organizationId) {
      return NextResponse.json({ error: "Corrective action not found" }, { status: 404 });
    }

    await authorizeMutation({
      actor,
      permission: "food_safety.approve",
      targetBranchId: action.branchId,
      authorizationPassword,
      module: "compliance",
      action: "CORRECTIVE_ACTION_CLOSED",
      entityType: "CORRECTIVE_ACTION",
      entityDisplayName: `${action.title} -> ${status}`,
    });

    const isClosed = status === "CLOSED" || status === "RESOLVED";

    const updated = await prisma.correctiveAction.update({
      where: { id },
      data: {
        status,
        resolutionNotes: resolutionNotes || action.resolutionNotes,
        resolvedAt: isClosed ? new Date() : undefined,
        closedAt: isClosed ? new Date() : undefined,
        closedBy: isClosed ? actor.name : undefined,
      },
    });

    // If linked to a finding, check if all actions for that finding are closed
    if (action.findingId && isClosed) {
      const remainingOpen = await prisma.correctiveAction.count({
        where: { findingId: action.findingId, status: { not: "CLOSED" } },
      });
      if (remainingOpen === 0) {
        await prisma.foodSafetyFinding.update({
          where: { id: action.findingId },
          data: { status: "CLOSED", closedBy: actor.name, closedAt: new Date() },
        });
      }
    }

    await writeAuditLog({
      organizationId: actor.organizationId,
      branchId: action.branchId,
      actorUserId: actor.id,
      actorNameSnapshot: actor.name,
      action: "CORRECTIVE_ACTION_CLOSED",
      module: "COMPLIANCE",
      entityType: "CORRECTIVE_ACTION",
      entityId: action.id,
      entityDisplayName: `Closed Corrective Action: ${action.title}`,
      metadata: { resolutionNotes, previousStatus: action.status, newStatus: status },
    });

    return NextResponse.json({ success: true, correctiveAction: updated });
  } catch (error: any) {
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
