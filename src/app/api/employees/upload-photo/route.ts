import { NextRequest, NextResponse } from "next/server";
import { getSessionActor } from "@/lib/auth/session";
import { saveEmployeePhoto } from "@/lib/storage/document-storage";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  try {
    const actor = await getSessionActor();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = (formData.get("photo") || formData.get("file")) as File | null;
    const employeeId = (formData.get("employeeId") as string) || "new_employee";

    if (!file) {
      return NextResponse.json({ error: "No photo file provided." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const saved = await saveEmployeePhoto(actor.organizationId, employeeId, buffer);

    // If employeeId corresponds to an existing employee, optionally update immediately
    if (employeeId && employeeId !== "new_employee") {
      const existing = await prisma.employee.findUnique({
        where: { id: employeeId },
      });
      if (existing && existing.organizationId === actor.organizationId) {
        await prisma.employee.update({
          where: { id: employeeId },
          data: { photoUrl: saved.url },
        });
      }
    }

    return NextResponse.json({
      success: true,
      url: saved.url,
      storageKey: saved.storageKey,
      mimeType: saved.mimeType,
      sizeBytes: saved.sizeBytes,
    });
  } catch (error: any) {
    console.error("Photo upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload employee photo" },
      { status: 400 }
    );
  }
}
