import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionActor } from "@/lib/auth/session";
import { authorizeMutation, SecurityError } from "@/lib/security/mutation-guard";
import { saveDocumentFile, validatePdfBytes } from "@/lib/storage/document-storage";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getSessionActor();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const notes = formData.get("notes") as string | null;
    const newExpiryDateStr = formData.get("expiryDate") as string | null;
    const authorizationPassword = formData.get("authorizationPassword") as string;

    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        versions: { orderBy: { versionNumber: "desc" }, take: 1 },
      },
    });

    if (!doc || doc.organizationId !== actor.organizationId) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (!file) {
      return NextResponse.json({ error: "PDF file is required for new version." }, { status: 400 });
    }

    const requiredPermission =
      doc.entityType === "EMPLOYEE"
        ? "employee_document.replace"
        : "business_document.replace";

    const mutationCtx = await authorizeMutation({
      actor,
      permission: requiredPermission,
      targetBranchId: doc.branchId,
      authorizationPassword,
      module: "document",
      action: "REPLACE_DOCUMENT_VERSION",
      entityType: "DOCUMENT",
      entityId: doc.id,
      entityDisplayName: doc.title,
    });

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const val = validatePdfBytes(fileBuffer);
    if (!val.valid) {
      return NextResponse.json({ error: val.reason }, { status: 400 });
    }

    const nextVersionNumber = (doc.versions[0]?.versionNumber || 0) + 1;

    const stored = await saveDocumentFile(
      actor.organizationId,
      doc.id,
      nextVersionNumber,
      fileBuffer
    );

    const newExpiry = newExpiryDateStr ? new Date(newExpiryDateStr) : doc.expiryDate;
    let status = doc.status;
    if (newExpiry) {
      const now = new Date();
      const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (newExpiry < now) {
        status = "EXPIRED";
      } else if (newExpiry < thirtyDays) {
        status = "EXPIRING_SOON";
      } else {
        status = "ACTIVE";
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const version = await tx.documentVersion.create({
        data: {
          documentId: doc.id,
          versionNumber: nextVersionNumber,
          originalFilename: file.name,
          storageKey: stored.storageKey,
          mimeType: stored.mimeType,
          sizeBytes: stored.sizeBytes,
          sha256: stored.sha256,
          scanStatus: "CLEAN",
          uploadedBy: actor.name,
          notes: notes || `Replaced with Version ${nextVersionNumber}`,
        },
      });

      const updatedDoc = await tx.document.update({
        where: { id: doc.id },
        data: {
          currentVersionId: version.id,
          expiryDate: newExpiry,
          status,
        },
        include: {
          currentVersion: true,
          versions: { orderBy: { versionNumber: "desc" } },
        },
      });

      return { version, updatedDoc };
    });

    await mutationCtx.audit({
      documentId: doc.id,
      title: doc.title,
      previousVersion: doc.versions[0]?.versionNumber || 1,
      newVersion: nextVersionNumber,
      filename: file.name,
      sha256: stored.sha256,
      notes,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    console.error("Replace document version error:", error);
    return NextResponse.json({ error: error.message || "Failed to create new version." }, { status: 500 });
  }
}
