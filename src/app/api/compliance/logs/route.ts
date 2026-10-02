import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionActor } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/audit-service";

export async function GET(req: NextRequest) {
  try {
    const actor = await getSessionActor();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");
    const logType = searchParams.get("logType");

    const where: any = { organizationId: actor.organizationId };
    if (branchId && branchId !== "ALL") where.branchId = branchId;
    if (logType && logType !== "ALL") where.logType = logType;

    const logs = await prisma.foodSafetyLog.findMany({
      where,
      include: { branch: { select: { id: true, nameAr: true, nameEn: true, code: true } } },
      orderBy: { recordedAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ logs });
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
      logType = "TEMPERATURE",
      controlPoint,
      parameter,
      measuredValue,
      targetRange,
      isCompliant = true,
      correctiveAction,
      notes,
    } = body;

    if (!controlPoint || !parameter || !measuredValue) {
      return NextResponse.json(
        { error: "controlPoint, parameter, and measuredValue are required" },
        { status: 400 }
      );
    }

    const log = await prisma.foodSafetyLog.create({
      data: {
        organizationId: actor.organizationId,
        branchId: branchId || null,
        logType,
        controlPoint,
        parameter,
        measuredValue,
        targetRange,
        isCompliant: Boolean(isCompliant),
        correctiveAction,
        recordedBy: actor.name,
        notes,
      },
    });

    await writeAuditLog({
      organizationId: actor.organizationId,
      branchId: branchId || null,
      actorUserId: actor.id,
      actorNameSnapshot: actor.name,
      action: "FOOD_SAFETY_LOG_CREATED",
      module: "COMPLIANCE",
      entityType: "FOOD_SAFETY_LOG",
      entityId: log.id,
      entityDisplayName: `${logType}: ${controlPoint} (${measuredValue})`,
      metadata: { controlPoint, parameter, measuredValue, isCompliant },
    });

    return NextResponse.json({ success: true, log });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
