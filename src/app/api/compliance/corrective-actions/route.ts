import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionActor } from "@/lib/auth/session";
import { authorizeMutation, SecurityError } from "@/lib/security/mutation-guard";
import { writeAuditLog } from "@/lib/audit/audit-service";

export async function POST(req: NextRequest) {
  try {
    const actor = await getSessionActor();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      branchId,
      findingId,
      title,
      description,
      severity = "MEDIUM",
      actionRequired,
      assignedTo,
      dueDate,
      authorizationPassword,
    } = body;

    if (!title || !actionRequired || !dueDate) {
      return NextResponse.json(
        { error: "title, actionRequired, and dueDate are required" },
        { status: 400 }
      );
    }

    await authorizeMutation({
      actor,
      permission: "food_safety.create",
      targetBranchId: branchId,
      authorizationPassword,
      module: "compliance",
      action: "CORRECTIVE_ACTION_CREATED",
      entityType: "CORRECTIVE_ACTION",
      entityDisplayName: title,
    });

    const action = await prisma.correctiveAction.create({
      data: {
        organizationId: actor.organizationId,
        branchId: branchId || null,
        findingId: findingId || null,
        title,
        description: description || title,
        severity,
        actionRequired,
        assignedTo,
        dueDate: new Date(dueDate),
        status: "OPEN",
      },
      include: {
        branch: true,
        finding: true,
      },
    });

    await writeAuditLog({
      organizationId: actor.organizationId,
      branchId: branchId || null,
      actorUserId: actor.id,
      actorNameSnapshot: actor.name,
      action: "CORRECTIVE_ACTION_CREATED",
      module: "COMPLIANCE",
      entityType: "CORRECTIVE_ACTION",
      entityId: action.id,
      entityDisplayName: action.title,
      metadata: { severity, dueDate, assignedTo },
    });

    return NextResponse.json({ success: true, correctiveAction: action });
  } catch (error: any) {
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
