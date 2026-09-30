import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionActor } from "@/lib/auth/session";
import { readDocumentFile } from "@/lib/storage/document-storage";
import { writeAuditLog } from "@/lib/audit/audit-service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getSessionActor();
  if (!actor) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const doc = await prisma.document.findUnique({
    where: { id },
    include: { currentVersion: true },
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

  // Separate download permission check
  const isOwner = actor.roles.includes("Owner");
  const downloadPerm =
    doc.entityType === "EMPLOYEE"
      ? "employee_document.download"
      : "business_document.download";

  if (!isOwner && !actor.permissions.includes(downloadPerm)) {
    await prisma.securityEvent.create({
      data: {
        userId: actor.id,
        eventType: "DOCUMENT_DOWNLOAD_DENIED",
        severity: "WARNING",
        details: `User attempted to download document '${doc.title}' without '${downloadPerm}' permission`,
      },
    });
    return new NextResponse("Forbidden: You do not have download permission for this document", {
      status: 403,
    });
  }

  if (!doc.currentVersion) {
    return new NextResponse("Document file version not found", { status: 404 });
  }

  try {
    const pdfBuffer = readDocumentFile(doc.currentVersion.storageKey);

    // Audit download
    await writeAuditLog({
      organizationId: actor.organizationId,
      branchId: doc.branchId,
      actorUserId: actor.id,
      actorNameSnapshot: actor.name,
      actorEmailSnapshot: actor.email,
      action: "DOWNLOAD_DOCUMENT",
      module: "document",
      entityType: "DOCUMENT",
      entityId: doc.id,
      entityDisplayName: doc.title,
      changesAfter: { filename: doc.currentVersion.originalFilename },
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          doc.currentVersion.originalFilename
        )}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: any) {
    console.error("Error downloading document:", err);
    return new NextResponse("Error reading file", { status: 500 });
  }
}
