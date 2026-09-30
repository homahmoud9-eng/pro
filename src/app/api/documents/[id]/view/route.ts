import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionActor } from "@/lib/auth/session";
import { readDocumentFile } from "@/lib/storage/document-storage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getSessionActor();
  if (!actor) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const versionId = searchParams.get("versionId");

  const doc = await prisma.document.findUnique({
    where: { id },
    include: {
      currentVersion: true,
      versions: true,
    },
  });

  if (!doc || doc.organizationId !== actor.organizationId) {
    return new NextResponse("Document not found", { status: 404 });
  }

  // Branch scope check
  if (
    doc.branchId &&
    actor.branchScopes.length > 0 &&
    !actor.branchScopes.includes(doc.branchId)
  ) {
    return new NextResponse("Forbidden: Branch scope violation", { status: 403 });
  }

  // Permission check for viewing
  const isOwner = actor.roles.includes("Owner");
  const readPerm =
    doc.entityType === "EMPLOYEE"
      ? "employee_document.read"
      : "business_document.read";

  if (!isOwner && !actor.permissions.includes(readPerm)) {
    return new NextResponse("Forbidden: Missing document read permission", { status: 403 });
  }

  // Select version
  const targetVersion = versionId
    ? doc.versions.find((v) => v.id === versionId)
    : doc.currentVersion;

  if (!targetVersion) {
    return new NextResponse("Document version not found", { status: 404 });
  }

  try {
    const pdfBuffer = readDocumentFile(targetVersion.storageKey);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${encodeURIComponent(
          targetVersion.originalFilename
        )}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (err: any) {
    console.error("Error streaming document:", err);
    return new NextResponse("Error reading file", { status: 500 });
  }
}
