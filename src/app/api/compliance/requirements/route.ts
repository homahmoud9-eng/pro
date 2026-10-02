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
      code,
      authority = "ADAFSA",
      category,
      titleAr,
      titleEn,
      descriptionAr,
      descriptionEn,
      sourceReference,
      sourceUrl,
      scope = "ALL",
      frequency = "CONTINUOUS",
      evidenceRequired = true,
      notes,
      authorizationPassword,
    } = body;

    if (!code || !titleAr || !titleEn || !category || !sourceReference) {
      return NextResponse.json(
        { error: "Missing required fields (code, titleAr, titleEn, category, sourceReference)" },
        { status: 400 }
      );
    }

    await authorizeMutation({
      actor,
      permission: "food_safety.create",
      authorizationPassword,
      module: "compliance",
      action: "COMPLIANCE_REQUIREMENT_CREATED",
      entityType: "REGULATORY_REQUIREMENT",
      entityDisplayName: titleEn,
    });

    const requirement = await prisma.regulatoryRequirement.upsert({
      where: {
        organizationId_code: {
          organizationId: actor.organizationId,
          code,
        },
      },
      update: {
        authority,
        category,
        titleAr,
        titleEn,
        descriptionAr,
        descriptionEn,
        sourceReference,
        sourceUrl,
        scope,
        frequency,
        evidenceRequired,
        notes,
      },
      create: {
        organizationId: actor.organizationId,
        code,
        authority,
        category,
        titleAr,
        titleEn,
        descriptionAr,
        descriptionEn,
        sourceReference,
        sourceUrl,
        scope,
        frequency,
        evidenceRequired,
        notes,
      },
    });

    await writeAuditLog({
      organizationId: actor.organizationId,
      actorUserId: actor.id,
      actorNameSnapshot: actor.name,
      action: "COMPLIANCE_REQUIREMENT_CREATED",
      module: "COMPLIANCE",
      entityType: "REGULATORY_REQUIREMENT",
      entityId: requirement.id,
      entityDisplayName: `${requirement.code}: ${requirement.titleEn}`,
      metadata: { code, authority, category, sourceReference },
    });

    return NextResponse.json({ success: true, requirement });
  } catch (error: any) {
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
