import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionActor } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const actor = await getSessionActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isOwner = actor.roles.includes("Owner");
  if (!isOwner && !actor.permissions.includes("audit.read")) {
    return NextResponse.json({ error: "Forbidden: audit.read required" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const moduleParam = searchParams.get("module");
  const actionParam = searchParams.get("action");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "30", 10);

  const where: any = {
    organizationId: actor.organizationId,
  };

  if (moduleParam && moduleParam !== "ALL") {
    where.module = moduleParam;
  }

  if (actionParam && actionParam !== "ALL") {
    where.action = actionParam;
  }

  if (search) {
    where.OR = [
      { actorNameSnapshot: { contains: search, mode: "insensitive" } },
      { entityDisplayName: { contains: search, mode: "insensitive" } },
      { action: { contains: search, mode: "insensitive" } },
      { reason: { contains: search, mode: "insensitive" } },
    ];
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { sequenceNumber: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({
    data: logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
