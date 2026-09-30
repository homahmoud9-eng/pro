import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionActor } from "@/lib/auth/session";

export async function GET() {
  const actor = await getSessionActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const taxRecords = await prisma.taxRecord.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: { period: "desc" },
  });

  return NextResponse.json({ data: taxRecords });
}
