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
      inspectionId,
      branchId,
      findingNumber,
      category = "Food Hygiene",
      description,
      severity = "MEDIUM",
      correctiveAction,
      assignedTo,
      dueDate,
      authorizationPassword,
    } = body;

    if (!inspectionId || !description) {
      return NextResponse.json({ error: "inspectionId and description are required" }, { status: 400 });
    }

    await authorizeMutation({
      actor,
      permission: "food_safety.create",
      targetBranchId: branchId,
      authorizationPassword,
      module: "compliance",
      action: "FINDING_CREATED",
      entityType: "INSPECTION_FINDING",
      entityDisplayName: `${category}: ${description.slice(0, 30)}`,
    });

    const finding = await prisma.foodSafetyFinding.create({
      data: {
        inspectionId,
        branchId: branchId || null,
        findingNumber: findingNumber || `FND-${Date.now().toString().slice(-4)}`,
        category,
        section: category,
        question: "Official Observation",
        severity,
        description,
        correctiveAction,
        assignedTo,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: "OPEN",
      },
    });

    // Also auto-generate linked CorrectiveAction if correctiveAction text provided
    if (correctiveAction) {
      await prisma.correctiveAction.create({
        data: {
          organizationId: actor.organizationId,
          branchId: branchId || null,
          findingId: finding.id,
          title: `Action for ${finding.findingNumber}`,
          description,
          severity,
          actionRequired: correctiveAction,
          assignedTo,
          dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: "OPEN",
        },
      });
    }

    await writeAuditLog({
      organizationId: actor.organizationId,
      branchId: branchId || null,
      actorUserId: actor.id,
      actorNameSnapshot: actor.name,
      action: "FINDING_CREATED",
      module: "COMPLIANCE",
      entityType: "INSPECTION_FINDING",
      entityId: finding.id,
      entityDisplayName: `${finding.findingNumber} (${severity})`,
      metadata: { category, severity, dueDate },
    });

    return NextResponse.json({ success: true, finding });
  } catch (error: any) {
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
