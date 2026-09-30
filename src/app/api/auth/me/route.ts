import { NextResponse } from "next/server";
import { getSessionActor } from "@/lib/auth/session";

export async function GET() {
  const actor = await getSessionActor();
  if (!actor) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: actor,
  });
}
