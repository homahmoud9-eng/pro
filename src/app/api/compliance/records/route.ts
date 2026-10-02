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
      requirementId,
      branchId,
      status = "COMPLIANT",
      notes,
      evidenceDocumentId,
      authorizationPassword,
    } = body;

    if (!requirementId) {
      return NextResponse.json({ error: "requirementId is required" }, { status: 400 });
    }

    await authorizeMutation({
      actor,
      permission: "food_safety.create",
      authorizationPassword,
      module: "compliance",
      action: "COMPLIANCE_RECORD_UPDATED",
      entityType: "COMPLIANCE_RECORD",
      entityDisplayName: `Status: ${status}`,
    });

    const record = await prisma.complianceRecord.create({
      data: {
        organizationId: actor.organizationId,
        branchId: branchId || null,
        requirementId,
        status,
        lastVerifiedAt: new Date(),
        verifiedBy: actor.name,
        evidenceDocumentId: evidenceDocumentId || null,
        notes,
      },
      include: {
        requirement: true,
        branch: true,
      },
    });

    await writeAuditLog({
      organizationId: actor.organizationId,
      branchId: branchId || null,
      actorUserId: actor.id,
      actorNameSnapshot: actor.name,
      action: "COMPLIANCE_RECORD_UPDATED",
      module: "COMPLIANCE",
      entityType: "COMPLIANCE_RECORD",
      entityId: record.id,
      entityDisplayName: `${record.requirement.code} verification`,
      metadata: { status, branchId },
    });

    return NextResponse.json({ success: true, record });
  } catch (error: any) {
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
