import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionActor } from "@/lib/auth/session";
import { authorizeMutation, SecurityError } from "@/lib/security/mutation-guard";
import { writeAuditLog } from "@/lib/audit/audit-service";

export async function GET(req: NextRequest) {
  try {
    const actor = await getSessionActor();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");
    const authority = searchParams.get("authority");

    const where: any = { organizationId: actor.organizationId };
    if (branchId && branchId !== "ALL") where.branchId = branchId;
    if (authority && authority !== "ALL") where.authority = authority;

    const inspections = await prisma.foodSafetyInspection.findMany({
      where,
      include: {
        branch: { select: { id: true, nameAr: true, nameEn: true, code: true } },
        findings: true,
      },
      orderBy: { inspectionDate: "desc" },
    });

    return NextResponse.json({ inspections });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getSessionActor();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      branchId,
      authority = "ADAFSA",
      inspectionType = "OFFICIAL_ADAFSA",
      referenceNumber,
      inspectionDate = new Date(),
      inspectorName,
      score = 100,
      overallResult = "SATISFACTORY",
      status = "COMPLETED",
      notes,
      findings = [],
      authorizationPassword,
    } = body;

    await authorizeMutation({
      actor,
      permission: "food_safety.create",
      targetBranchId: branchId,
      authorizationPassword,
      module: "compliance",
      action: "INSPECTION_CREATED",
      entityType: "REGULATORY_INSPECTION",
      entityDisplayName: `${authority} ${inspectionType} (${referenceNumber || "Official Notice"})`,
    });

    const inspection = await prisma.$transaction(async (tx) => {
      const created = await tx.foodSafetyInspection.create({
        data: {
          organizationId: actor.organizationId,
          branchId: branchId || null,
          authority,
          inspectionType,
          referenceNumber,
          inspectionDate: new Date(inspectionDate),
          inspectorName: inspectorName || actor.name,
          score: Number(score),
          overallResult,
          status,
          notes,
        },
      });

      if (Array.isArray(findings) && findings.length > 0) {
        for (let i = 0; i < findings.length; i++) {
          const f = findings[i];
          await tx.foodSafetyFinding.create({
            data: {
              inspectionId: created.id,
              branchId: branchId || null,
              findingNumber: `FND-${i + 1}`,
              category: f.category || "General Hygiene",
              section: f.section || "General",
              question: f.question || f.category || "Observation",
              severity: f.severity || "MEDIUM",
              description: f.description,
              correctiveAction: f.correctiveAction,
              assignedTo: f.assignedTo,
              dueDate: f.dueDate ? new Date(f.dueDate) : null,
              status: "OPEN",
            },
          });
        }
      }

      return created;
    });

    await writeAuditLog({
      organizationId: actor.organizationId,
      branchId: branchId || null,
      actorUserId: actor.id,
      actorNameSnapshot: actor.name,
      action: "INSPECTION_CREATED",
      module: "COMPLIANCE",
      entityType: "REGULATORY_INSPECTION",
      entityId: inspection.id,
      entityDisplayName: `${authority} Notice #${referenceNumber || inspection.id.slice(0, 8)}`,
      metadata: { authority, inspectionType, findingsCount: findings.length },
    });

    return NextResponse.json({ success: true, inspection });
  } catch (error: any) {
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
