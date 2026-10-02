import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionActor } from "@/lib/auth/session";
import { authorizeMutation, SecurityError } from "@/lib/security/mutation-guard";
import { writeAuditLog } from "@/lib/audit/audit-service";
import { saveDocumentFile, validatePdfBytes } from "@/lib/storage/document-storage";

export async function GET(req: NextRequest) {
  try {
    const actor = await getSessionActor();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");
    const where: any = { organizationId: actor.organizationId };
    if (branchId && branchId !== "ALL") where.branchId = branchId;

    const trainings = await prisma.foodHandlerTraining.findMany({
      where,
      include: {
        employee: { select: { id: true, nameAr: true, nameEn: true, employeeCode: true, jobTitle: true } },
        branch: { select: { id: true, nameAr: true, nameEn: true, code: true } },
      },
      orderBy: { trainingDate: "desc" },
    });

    return NextResponse.json({ trainings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getSessionActor();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const employeeId = formData.get("employeeId") as string;
    const branchId = (formData.get("branchId") as string) || null;
    const program = (formData.get("program") as string) || "EFST";
    const trainingType = (formData.get("trainingType") as string) || "EFST";
    const trainingCategory = (formData.get("trainingCategory") as string) || "EFST_FOOD_HANDLERS";
    const provider = (formData.get("provider") as string) || "ADAFSA Approved Center";
    const certificateNumber = (formData.get("certificateNumber") as string) || null;
    const trainingDateStr = formData.get("trainingDate") as string;
    const expiryDateStr = formData.get("expiryDate") as string;
    const status = (formData.get("status") as string) || "COMPLETED";
    const notes = (formData.get("notes") as string) || null;
    const authorizationPassword = (formData.get("authorizationPassword") as string) || "";
    const pdfFile = formData.get("file") as File | null;

    if (!employeeId || !trainingDateStr) {
      return NextResponse.json(
        { error: "Employee and Training Date are required" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, nameEn: true, nameAr: true, organizationId: true, branchId: true },
    });

    if (!employee || employee.organizationId !== actor.organizationId) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    await authorizeMutation({
      actor,
      permission: "food_safety.create",
      targetBranchId: branchId || employee.branchId,
      authorizationPassword,
      module: "compliance",
      action: "EFST_RECORD_CREATED",
      entityType: "FOOD_HANDLER_TRAINING",
      entityDisplayName: `${program} Certificate: ${employee.nameEn}`,
    });

    const trainingDate = new Date(trainingDateStr);
    const expiryDate = expiryDateStr ? new Date(expiryDateStr) : null;

    let certificateDocId: string | null = null;
    let certificateStorageKey: string | null = null;

    if (pdfFile && pdfFile.size > 0) {
      const buffer = Buffer.from(await pdfFile.arrayBuffer());
      const pdfVal = validatePdfBytes(buffer);
      if (!pdfVal.valid) {
        return NextResponse.json(
          { error: pdfVal.reason || "Certificate must be a valid PDF file" },
          { status: 400 }
        );
      }

      // Find or link document type
      let docType = await prisma.documentType.findFirst({
        where: { organizationId: actor.organizationId, nameEn: "EFST Training Certificate" },
      });
      if (!docType) {
        docType = await prisma.documentType.findFirst({
          where: { organizationId: actor.organizationId },
        });
      }

      if (docType) {
        const doc = await prisma.document.create({
          data: {
            organizationId: actor.organizationId,
            branchId: branchId || employee.branchId,
            employeeId: employee.id,
            entityType: "EMPLOYEE",
            entityId: employee.id,
            documentTypeId: docType.id,
            title: `EFST Certificate - ${employee.nameEn}`,
            referenceNumber: certificateNumber || undefined,
            issueDate: trainingDate,
            expiryDate,
            status: "ACTIVE",
            isLegal: true,
            createdBy: actor.name,
          },
        });

        const stored = await saveDocumentFile(actor.organizationId, doc.id, 1, buffer);

        const version = await prisma.documentVersion.create({
          data: {
            documentId: doc.id,
            versionNumber: 1,
            originalFilename: pdfFile.name || "efst_certificate.pdf",
            storageKey: stored.storageKey,
            mimeType: "application/pdf",
            sizeBytes: stored.sizeBytes,
            sha256: stored.sha256,
            scanStatus: "CLEAN",
            uploadedBy: actor.name,
          },
        });

        await prisma.document.update({
          where: { id: doc.id },
          data: { currentVersionId: version.id },
        });

        certificateDocId = doc.id;
        certificateStorageKey = stored.storageKey;
      }
    }

    const training = await prisma.foodHandlerTraining.create({
      data: {
        organizationId: actor.organizationId,
        branchId: branchId || employee.branchId,
        employeeId: employee.id,
        program,
        trainingType,
        trainingCategory,
        provider,
        certificateNumber,
        certificateDocumentId: certificateDocId,
        certificateStorageKey,
        trainingDate,
        expiryDate,
        status,
        verificationStatus: "VERIFIED",
        notes,
      },
      include: {
        employee: { select: { id: true, nameAr: true, nameEn: true, employeeCode: true, jobTitle: true } },
        branch: { select: { id: true, nameAr: true, nameEn: true, code: true } },
      },
    });

    await writeAuditLog({
      organizationId: actor.organizationId,
      branchId: branchId || employee.branchId,
      actorUserId: actor.id,
      actorNameSnapshot: actor.name,
      action: "EFST_RECORD_CREATED",
      module: "COMPLIANCE",
      entityType: "FOOD_HANDLER_TRAINING",
      entityId: training.id,
      entityDisplayName: `${program} Certificate for ${employee.nameEn}`,
      metadata: { certificateNumber, provider, expiryDate: expiryDate?.toISOString() },
    });

    return NextResponse.json({ success: true, training });
  } catch (error: any) {
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
