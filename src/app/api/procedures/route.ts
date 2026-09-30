import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionActor } from "@/lib/auth/session";
import { authorizeMutation, SecurityError } from "@/lib/security/mutation-guard";

export async function GET(req: NextRequest) {
  const actor = await getSessionActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const branchId = searchParams.get("branchId");
  const search = searchParams.get("search");

  const where: any = {
    organizationId: actor.organizationId,
  };

  if (actor.branchScopes.length > 0) {
    where.OR = [
      { branchId: { in: actor.branchScopes } },
      { branchId: null },
    ];
  } else if (branchId && branchId !== "ALL") {
    where.branchId = branchId;
  }

  if (status && status !== "ALL") {
    where.status = status;
  }

  if (priority && priority !== "ALL") {
    where.priority = priority;
  }

  if (search) {
    where.OR = [
      { reference: { contains: search, mode: "insensitive" } },
      { title: { contains: search, mode: "insensitive" } },
    ];
  }

  const procedures = await prisma.procedure.findMany({
    where,
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
      branch: { select: { id: true, nameEn: true, nameAr: true, code: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: procedures });
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getSessionActor();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      type,
      subjectType = "EMPLOYEE",
      subjectId,
      branchId,
      title,
      description,
      priority = "MEDIUM",
      dueDate,
      steps = [],
      authorizationPassword,
    } = body;

    if (!title || !type) {
      return NextResponse.json(
        { error: "Title and procedure type are required." },
        { status: 400 }
      );
    }

    const mutationCtx = await authorizeMutation({
      actor,
      permission: "procedure.create",
      targetBranchId: branchId,
      authorizationPassword,
      module: "procedure",
      action: "CREATE_PROCEDURE",
      entityType: "PROCEDURE",
      entityDisplayName: title,
    });

    const count = await prisma.procedure.count({
      where: { organizationId: actor.organizationId },
    });
    const reference = `PROC-2026-${String(count + 1).padStart(3, "0")}`;

    const proc = await prisma.procedure.create({
      data: {
        organizationId: actor.organizationId,
        branchId: branchId || null,
        reference,
        type,
        subjectType,
        subjectId: subjectId || null,
        title,
        description,
        status: "PENDING",
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        createdBy: actor.id,
        assignedTo: actor.id,
        steps: {
          create: steps.map((s: any, idx: number) => ({
            stepNumber: idx + 1,
            title: s.title || `Step ${idx + 1}`,
            status: "PENDING",
            assignedTo: s.assignedTo || actor.name,
          })),
        },
      },
      include: { steps: true },
    });

    await mutationCtx.audit({
      procedureId: proc.id,
      reference: proc.reference,
      type: proc.type,
      title: proc.title,
      status: proc.status,
    });

    return NextResponse.json({ success: true, procedure: proc });
  } catch (error: any) {
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    console.error("Procedure create error:", error);
    return NextResponse.json({ error: error.message || "Failed to create procedure" }, { status: 500 });
  }
}
