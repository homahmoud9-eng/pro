import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionActor } from "@/lib/auth/session";
import { authorizeMutation, SecurityError } from "@/lib/security/mutation-guard";
import { writeAuditLog } from "@/lib/audit/audit-service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getSessionActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // 1. Enforce Branch Authorization Scope
  if (actor.branchScopes.length > 0 && !actor.branchScopes.includes(id)) {
    return NextResponse.json(
      { error: "Access denied: You are not authorized to view or manage this branch." },
      { status: 403 }
    );
  }

  // 2. Fetch Branch
  const branch = await prisma.branch.findUnique({
    where: { id },
    include: {
      organization: {
        select: {
          id: true,
          nameEn: true,
          nameAr: true,
          trn: true,
          licenseNumbers: true,
        },
      },
      _count: {
        select: {
          employees: true,
          documents: true,
          inventoryItems: true,
          procedures: true,
        },
      },
    },
  });

  if (!branch || branch.organizationId !== actor.organizationId) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  // 3. Compute Real Live Metrics for this Branch
  const [
    totalDocs,
    activeDocs,
    expiringDocs,
    expiredDocs,
    activeEmployees,
    pendingProcedures,
  ] = await Promise.all([
    prisma.document.count({
      where: { organizationId: actor.organizationId, branchId: id },
    }),
    prisma.document.count({
      where: { organizationId: actor.organizationId, branchId: id, status: "ACTIVE" },
    }),
    prisma.document.count({
      where: { organizationId: actor.organizationId, branchId: id, status: "EXPIRING_SOON" },
    }),
    prisma.document.count({
      where: { organizationId: actor.organizationId, branchId: id, status: "EXPIRED" },
    }),
    prisma.employee.count({
      where: { organizationId: actor.organizationId, branchId: id, status: "ACTIVE" },
    }),
    prisma.procedure.count({
      where: {
        organizationId: actor.organizationId,
        branchId: id,
        status: { notIn: ["COMPLETED", "REJECTED"] },
      },
    }),
  ]);

  // 4. Fetch Branch Legal Documents with full version history
  const documents = await prisma.document.findMany({
    where: {
      organizationId: actor.organizationId,
      branchId: id,
    },
    include: {
      documentType: true,
      currentVersion: true,
      versions: {
        orderBy: { versionNumber: "desc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // 5. Fetch Available Document Types for this Org
  const documentTypes = await prisma.documentType.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: { nameEn: "asc" },
  });

  // 6. Record Audit Event for Branch Access
  await writeAuditLog({
    organizationId: actor.organizationId,
    branchId: id,
    actorUserId: actor.id,
    actorNameSnapshot: actor.name,
    actorEmailSnapshot: actor.email,
    action: "BRANCH_VIEWED",
    module: "business",
    entityType: "BRANCH",
    entityId: id,
    entityDisplayName: branch.nameEn,
    metadata: {
      branchCode: branch.code,
      documentsCount: totalDocs,
    },
  });

  return NextResponse.json({
    branch,
    metrics: {
      totalDocuments: totalDocs,
      activeDocuments: activeDocs,
      expiringDocuments: expiringDocs,
      expiredDocuments: expiredDocs,
      activeEmployees,
      pendingProcedures,
    },
    documents,
    documentTypes,
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
    const { nameAr, nameEn, address, phone, managerName, status, openingHours, authorizationPassword } = body;

    const branch = await prisma.branch.findUnique({
      where: { id },
    });

    if (!branch || branch.organizationId !== actor.organizationId) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    // Branch mutation check
    const mutationCtx = await authorizeMutation({
      actor,
      permission: "business.update",
      targetBranchId: id,
      authorizationPassword,
      module: "business",
      action: "UPDATE_BRANCH_PROFILE",
      entityType: "BRANCH",
      entityId: id,
      entityDisplayName: branch.nameEn,
      changesBefore: {
        nameEn: branch.nameEn,
        phone: branch.phone,
        managerName: branch.managerName,
        status: branch.status,
      },
      changesAfter: { nameEn, phone, managerName, status },
    });

    const updated = await prisma.branch.update({
      where: { id },
      data: {
        nameAr: nameAr || branch.nameAr,
        nameEn: nameEn || branch.nameEn,
        address: address !== undefined ? address : branch.address,
        phone: phone !== undefined ? phone : branch.phone,
        managerName: managerName !== undefined ? managerName : branch.managerName,
        status: status || branch.status,
        openingHours: openingHours !== undefined ? openingHours : branch.openingHours,
      },
    });

    await mutationCtx.audit();

    return NextResponse.json({ success: true, branch: updated });
  } catch (error: any) {
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    console.error("Update branch error:", error);
    return NextResponse.json({ error: error.message || "Failed to update branch" }, { status: 500 });
  }
}
