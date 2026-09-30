import { NextResponse } from "next/server";
import { getSessionActor } from "@/lib/auth/session";
import { verifyAuditChain } from "@/lib/audit/audit-service";

export async function POST() {
  const actor = await getSessionActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isOwner = actor.roles.includes("Owner");
  if (!isOwner && !actor.permissions.includes("audit.verify") && !actor.permissions.includes("audit.read")) {
    return NextResponse.json({ error: "Forbidden: audit verification permission required" }, { status: 403 });
  }

  const result = await verifyAuditChain(actor.organizationId);

  return NextResponse.json({
    success: true,
    ...result,
  });
}
