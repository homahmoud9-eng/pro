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
    const { status, notes, authorizationPassword } = body;

    const finding = await prisma.foodSafetyFinding.findUnique({
      where: { id },
      include: { inspection: true },
    });

    if (!finding || finding.inspection.organizationId !== actor.organizationId) {
      return NextResponse.json({ error: "Finding not found" }, { status: 404 });
    }

    await authorizeMutation({
      actor,
      permission: "food_safety.approve",
      targetBranchId: finding.branchId,
      authorizationPassword,
      module: "compliance",
      action: "FINDING_UPDATED",
      entityType: "INSPECTION_FINDING",
      entityDisplayName: `${finding.findingNumber || "Finding"} -> ${status}`,
    });

    const isClosed = status === "RESOLVED" || status === "CLOSED";

    const updated = await prisma.foodSafetyFinding.update({
      where: { id },
      data: {
        status,
        closedBy: isClosed ? actor.name : undefined,
        closedAt: isClosed ? new Date() : undefined,
      },
    });

    // Update any linked CorrectiveAction records
    if (isClosed) {
      await prisma.correctiveAction.updateMany({
        where: { findingId: id, status: { not: "CLOSED" } },
        data: {
          status: "CLOSED",
          closedBy: actor.name,
          closedAt: new Date(),
          resolvedAt: new Date(),
          resolutionNotes: notes || "Resolved along with finding",
        },
      });
    }

    await writeAuditLog({
      organizationId: actor.organizationId,
      branchId: finding.branchId,
      actorUserId: actor.id,
      actorNameSnapshot: actor.name,
      action: "FINDING_UPDATED",
      module: "COMPLIANCE",
      entityType: "INSPECTION_FINDING",
      entityId: finding.id,
      entityDisplayName: `${finding.findingNumber || "Finding"} status changed to ${status}`,
      metadata: { previousStatus: finding.status, newStatus: status, notes },
    });

    return NextResponse.json({ success: true, finding: updated });
  } catch (error: any) {
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
