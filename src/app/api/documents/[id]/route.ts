import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionActor } from "@/lib/auth/session";
import { authorizeMutation, SecurityError } from "@/lib/security/mutation-guard";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getSessionActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const doc = await prisma.document.findUnique({
    where: { id },
    include: {
      documentType: true,
      currentVersion: true,
      versions: { orderBy: { versionNumber: "desc" } },
      branch: true,
    },
  });

  if (!doc || doc.organizationId !== actor.organizationId) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Branch check
  if (
    doc.branchId &&
    actor.branchScopes.length > 0 &&
    !actor.branchScopes.includes(doc.branchId)
  ) {
    return NextResponse.json(
      { error: "Access denied to document from this branch" },
      { status: 403 }
    );
  }

  // Related audit events
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      organizationId: actor.organizationId,
      entityId: doc.id,
    },
    orderBy: { occurredAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    document: doc,
    auditLogs,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getSessionActor();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { title, referenceNumber, expiryDate, authorizationPassword, reason } = body;

    const currentDoc = await prisma.document.findUnique({
      where: { id },
    });

    if (!currentDoc || currentDoc.organizationId !== actor.organizationId) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const requiredPermission =
      currentDoc.entityType === "EMPLOYEE"
        ? "employee_document.replace"
        : "business_document.replace";

    const mutationCtx = await authorizeMutation({
      actor,
      permission: requiredPermission,
      targetBranchId: currentDoc.branchId,
      authorizationPassword,
      module: "document",
      action: "UPDATE_DOCUMENT_METADATA",
      entityType: "DOCUMENT",
      entityId: id,
      entityDisplayName: title || currentDoc.title,
      changesBefore: {
        title: currentDoc.title,
        referenceNumber: currentDoc.referenceNumber,
        expiryDate: currentDoc.expiryDate,
      },
      reason,
    });

    const parsedExpiry = expiryDate ? new Date(expiryDate) : currentDoc.expiryDate;
    let status = currentDoc.status;
    if (parsedExpiry) {
      const now = new Date();
      const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (parsedExpiry < now) {
        status = "EXPIRED";
      } else if (parsedExpiry < thirtyDays) {
        status = "EXPIRING_SOON";
      } else {
        status = "ACTIVE";
      }
    }

    const updated = await prisma.document.update({
      where: { id },
      data: {
        title: title || currentDoc.title,
        referenceNumber: referenceNumber !== undefined ? referenceNumber : currentDoc.referenceNumber,
        expiryDate: parsedExpiry,
        status,
      },
    });

    await mutationCtx.audit({
      title: updated.title,
      referenceNumber: updated.referenceNumber,
      expiryDate: updated.expiryDate,
      status: updated.status,
    });

    return NextResponse.json({ success: true, document: updated });
  } catch (error: any) {
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || "Update failed" }, { status: 500 });
  }
}
