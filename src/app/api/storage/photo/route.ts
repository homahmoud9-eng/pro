import { NextRequest, NextResponse } from "next/server";
import { getSessionActor } from "@/lib/auth/session";
import { readDocumentFile, detectFileFormat } from "@/lib/storage/document-storage";

export async function GET(req: NextRequest) {
  try {
    const actor = await getSessionActor();
    if (!actor) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (!key) {
      return new NextResponse("Key parameter missing", { status: 400 });
    }

    // Normalize slashes
    const normalizedKey = key.replace(/\\/g, "/");

    // Security check: Must start with the authenticated actor's organizationId
    if (!normalizedKey.startsWith(`${actor.organizationId}/`)) {
      return new NextResponse("Forbidden: Access restricted to organization assets", { status: 403 });
    }

    const fileBuffer = readDocumentFile(normalizedKey);
    const detected = detectFileFormat(fileBuffer);

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": detected.mimeType || "image/jpeg",
        "Cache-Control": "private, max-age=86400, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: any) {
    console.error("Error serving photo:", error);
    return new NextResponse("Error reading photo", { status: 500 });
  }
}
