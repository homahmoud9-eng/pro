import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionActor } from "@/lib/auth/session";
import { authorizeMutation, SecurityError } from "@/lib/security/mutation-guard";
import { saveDocumentFile, detectFileFormat } from "@/lib/storage/document-storage";

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
    const employee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!employee || employee.organizationId !== actor.organizationId) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string) || "Employee Document";
    const documentTypeId = formData.get("documentTypeId") as string;
    const referenceNumber = (formData.get("referenceNumber") as string) || null;
    const issueDateStr = formData.get("issueDate") as string | null;
    const expiryDateStr = formData.get("expiryDate") as string | null;
    const reminderDays = formData.get("reminderDays") as string | null;
    const notes = formData.get("notes") as string | null;
    const authorizationPassword = formData.get("authorizationPassword") as string;

    if (!file) {
      return NextResponse.json({ error: "File attachment (PDF, JPG, PNG, or WEBP) is required." }, { status: 400 });
    }
    if (!documentTypeId) {
      return NextResponse.json({ error: "Document type is required." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const formatCheck = detectFileFormat(fileBuffer);
    if (!formatCheck.valid) {
      return NextResponse.json({ error: formatCheck.reason }, { status: 400 });
    }

    // Authorize mutation
    const mutationCtx = await authorizeMutation({
      actor,
      permission: "employee_document.upload",
      targetBranchId: employee.branchId,
      authorizationPassword,
      module: "document",
      action: "UPLOAD_EMPLOYEE_DOCUMENT",
      entityType: "EMPLOYEE",
      entityId: employee.id,
      entityDisplayName: `${employee.nameEn} - ${title}`,
      reason: "Employee document upload",
    });

    const issueDate = issueDateStr ? new Date(issueDateStr) : null;
    const expiryDate = expiryDateStr ? new Date(expiryDateStr) : null;

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

    const newDoc = await prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          organizationId: actor.organizationId,
          branchId: employee.branchId,
          employeeId: employee.id,
          entityType: "EMPLOYEE",
          entityId: employee.id,
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

      const stored = await saveDocumentFile(actor.organizationId, doc.id, 1, fileBuffer);

      const version = await tx.documentVersion.create({
        data: {
          documentId: doc.id,
          versionNumber: 1,
          originalFilename: file.name,
          storageKey: stored.storageKey,
          mimeType: stored.mimeType,
          sizeBytes: stored.sizeBytes,
          sha256: stored.sha256,
          notes,
          scanStatus: "CLEAN",
          uploadedBy: actor.name,
        },
      });

      await tx.document.update({
        where: { id: doc.id },
        data: { currentVersionId: version.id },
      });

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

    await mutationCtx.audit({
      documentId: newDoc.id,
      title: newDoc.title,
      employeeId: employee.id,
      employeeCode: employee.employeeCode,
    });

    return NextResponse.json({ success: true, document: newDoc });
  } catch (error: any) {
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    console.error("Employee document upload error:", error);
    return NextResponse.json({ error: error.message || "Failed to upload document" }, { status: 500 });
  }
}
