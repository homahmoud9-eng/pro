import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionActor } from "@/lib/auth/session";
import { authorizeMutation, SecurityError } from "@/lib/security/mutation-guard";
import { saveDocumentFile, validatePdfBytes, detectFileFormat } from "@/lib/storage/document-storage";

export async function GET(req: NextRequest) {
  const actor = await getSessionActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const entityType = searchParams.get("entityType");
  const branchId = searchParams.get("branchId");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  const where: any = {
    organizationId: actor.organizationId,
  };

  // Enforce branch scoping if user is restricted
  if (actor.branchScopes.length > 0) {
    where.OR = [
      { branchId: { in: actor.branchScopes } },
      { branchId: null },
    ];
  } else if (branchId) {
    where.branchId = branchId;
  }

  if (status && status !== "ALL") {
    where.status = status;
  }

  if (entityType) {
    where.entityType = entityType;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { referenceNumber: { contains: search, mode: "insensitive" } },
    ];
  }

  const [total, documents, documentTypes] = await Promise.all([
    prisma.document.count({ where }),
    prisma.document.findMany({
      where,
      include: {
        documentType: true,
        currentVersion: true,
        branch: { select: { id: true, nameEn: true, nameAr: true, code: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.documentType.findMany({
      where: { organizationId: actor.organizationId },
    }),
  ]);

  return NextResponse.json({
    data: documents,
    documentTypes,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getSessionActor();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string;
    const documentTypeId = formData.get("documentTypeId") as string;
    const entityType = (formData.get("entityType") as string) || "ORGANIZATION";
    const entityId = (formData.get("entityId") as string) || null;
    const branchId = (formData.get("branchId") as string) || null;
    const referenceNumber = (formData.get("referenceNumber") as string) || null;
    const issueDateStr = formData.get("issueDate") as string | null;
    const expiryDateStr = formData.get("expiryDate") as string | null;
    const authorizationPassword = formData.get("authorizationPassword") as string;

    if (!title || !documentTypeId) {
      return NextResponse.json(
        { error: "Title and document type are required." },
        { status: 400 }
      );
    }

    // Determine permission based on entity
    const requiredPermission =
      entityType === "EMPLOYEE" ? "employee_document.upload" : "business_document.upload";

    // Enforce mutation guard (Two-Level Security)
    const mutationCtx = await authorizeMutation({
      actor,
      permission: requiredPermission,
      targetBranchId: branchId,
      authorizationPassword,
      module: "document",
      action: "UPLOAD_DOCUMENT",
      entityType: "DOCUMENT",
      entityDisplayName: title,
    });

    let fileBuffer: Buffer | null = null;
    if (file) {
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);

      const val = detectFileFormat(fileBuffer);
      if (!val.valid) {
        return NextResponse.json({ error: val.reason }, { status: 400 });
      }
    } else {
      return NextResponse.json(
        { error: "File attachment (PDF, JPG, PNG, or WEBP) is required." },
        { status: 400 }
      );
    }

    const issueDate = issueDateStr ? new Date(issueDateStr) : null;
    const expiryDate = expiryDateStr ? new Date(expiryDateStr) : null;
    const reminderDays = formData.get("reminderDays") as string | null;

    // Calculate initial status
    let status = "ACTIVE";
    if (expiryDate) {
      const now = new Date();
      const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (expiryDate < now) {
        status = "EXPIRED";
      } else if (expiryDate < thirtyDays) {
        status = "EXPIRING_SOON";
      }
    }

    // Transactional creation of document and version
    const newDoc = await prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          organizationId: actor.organizationId,
          branchId,
          employeeId: entityType === "EMPLOYEE" && entityId ? entityId : null,
          entityType,
          entityId,
          documentTypeId,
          title,
          referenceNumber,
          issueDate,
          expiryDate,
          status,
          isLegal: true,
          createdBy: actor.name,
        },
      });

      const stored = await saveDocumentFile(
        actor.organizationId,
        doc.id,
        1,
        fileBuffer!
      );

      const version = await tx.documentVersion.create({
        data: {
          documentId: doc.id,
          versionNumber: 1,
          originalFilename: file.name,
          storageKey: stored.storageKey,
          mimeType: stored.mimeType,
          sizeBytes: stored.sizeBytes,
          sha256: stored.sha256,
          scanStatus: "CLEAN",
          uploadedBy: actor.name,
        },
      });

      await tx.document.update({
        where: { id: doc.id },
        data: { currentVersionId: version.id },
      });

      // Add reminders if configured
      if (reminderDays) {
        const daysList = reminderDays.split(",").map(d => parseInt(d.trim(), 10)).filter(d => !isNaN(d));
        for (const days of daysList) {
          const reminderType = days <= 7 ? "URGENT" : days <= 30 ? "IMPORTANT" : "EARLY_WARNING";
          await tx.documentReminder.create({
            data: {
              documentId: doc.id,
              daysBeforeExpiry: days,
              reminderType,
            },
          });
        }
      }

      return doc;
    });

    // Write audit log
    await mutationCtx.audit({
      documentId: newDoc.id,
      title: newDoc.title,
      referenceNumber: newDoc.referenceNumber,
      expiryDate: newDoc.expiryDate,
      version: 1,
      filename: file.name,
    });

    return NextResponse.json({ success: true, document: newDoc });
  } catch (error: any) {
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    console.error("Document upload error:", error);
    return NextResponse.json({ error: error.message || "Upload failed." }, { status: 500 });
  }
}
