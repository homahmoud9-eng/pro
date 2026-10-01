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
    const {
      nameAr,
      nameEn,
      code,
      type,
      status,
      address,
      addressAr,
      phone,
      email,
      managerName,
      openingDate,
      closingDate,
      openingHours,
      notes,
      authorizationPassword,
    } = body;

    const branch = await prisma.branch.findUnique({
      where: { id },
    });

    if (!branch || branch.organizationId !== actor.organizationId) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    // Determine specific permission and action based on mutation
    let requiredPermission = "EDIT_BRANCH";
    let auditAction = "BRANCH_UPDATED";
    let auditReason = `${actor.name} updated Branch ${branch.code}`;

    if (status && status !== branch.status) {
      if (status === "ARCHIVED") {
        requiredPermission = "ARCHIVE_BRANCH";
        auditAction = "BRANCH_ARCHIVED";
        auditReason = `${actor.name} changed Branch ${branch.code} status from ${branch.status} to Archived`;
      } else if (branch.status === "ARCHIVED" && status === "ACTIVE") {
        requiredPermission = "REACTIVATE_BRANCH";
        auditAction = "BRANCH_REACTIVATED";
        auditReason = `${actor.name} reactivated Branch ${branch.code}`;
      }
    } else if (managerName && managerName !== branch.managerName) {
      auditReason = `${actor.name} changed Branch Manager to ${managerName}`;
    }

    // Code uniqueness validation if code is being changed
    let updatedCode = branch.code;
    if (code && code.trim().toUpperCase() !== branch.code) {
      updatedCode = code.trim().toUpperCase();
      const existing = await prisma.branch.findUnique({
        where: {
          organizationId_code: {
            organizationId: actor.organizationId,
            code: updatedCode,
          },
        },
      });
      if (existing) {
        return NextResponse.json(
          { error: `Branch code '${updatedCode}' is already in use by another branch.` },
          { status: 400 }
        );
      }
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json(
        { error: "Invalid email address format" },
        { status: 400 }
      );
    }

    // Branch mutation check
    const mutationCtx = await authorizeMutation({
      actor,
      permission: requiredPermission,
      targetBranchId: id,
      authorizationPassword,
      module: "business",
      action: auditAction,
      entityType: "BRANCH",
      entityId: id,
      entityDisplayName: branch.nameEn,
      changesBefore: {
        code: branch.code,
        nameEn: branch.nameEn,
        nameAr: branch.nameAr,
        type: branch.type,
        status: branch.status,
        address: branch.address,
        addressAr: branch.addressAr,
        phone: branch.phone,
        email: branch.email,
        managerName: branch.managerName,
      },
      changesAfter: {
        code: updatedCode,
        nameEn: nameEn || branch.nameEn,
        nameAr: nameAr || branch.nameAr,
        type: type || branch.type,
        status: status || branch.status,
        address: address !== undefined ? address : branch.address,
        addressAr: addressAr !== undefined ? addressAr : branch.addressAr,
        phone: phone !== undefined ? phone : branch.phone,
        email: email !== undefined ? email : branch.email,
        managerName: managerName !== undefined ? managerName : branch.managerName,
      },
      reason: auditReason,
    });

    const updated = await prisma.branch.update({
      where: { id },
      data: {
        code: updatedCode,
        nameAr: nameAr !== undefined ? nameAr.trim() : branch.nameAr,
        nameEn: nameEn !== undefined ? nameEn.trim() : branch.nameEn,
        type: type !== undefined ? type : branch.type,
        status: status !== undefined ? status : branch.status,
        address: address !== undefined ? (address?.trim() || null) : branch.address,
        addressAr: addressAr !== undefined ? (addressAr?.trim() || null) : branch.addressAr,
        phone: phone !== undefined ? (phone?.trim() || null) : branch.phone,
        email: email !== undefined ? (email?.trim() || null) : branch.email,
        managerName: managerName !== undefined ? (managerName?.trim() || null) : branch.managerName,
        openingDate: openingDate !== undefined ? (openingDate ? new Date(openingDate) : null) : branch.openingDate,
        closingDate: closingDate !== undefined ? (closingDate ? new Date(closingDate) : null) : branch.closingDate,
        openingHours: openingHours !== undefined ? (openingHours?.trim() || null) : branch.openingHours,
        notes: notes !== undefined ? (notes?.trim() || null) : branch.notes,
      },
    });

    await mutationCtx.audit({
      id: updated.id,
      code: updated.code,
      nameEn: updated.nameEn,
      status: updated.status,
      type: updated.type,
    });

    // Send notification on status changes
    if (status && status !== branch.status) {
      try {
        await prisma.notification.create({
          data: {
            organizationId: actor.organizationId,
            branchId: id,
            userId: actor.id,
            type: "AUDIT_ALERT",
            title: status === "ARCHIVED" ? "Branch Archived" : "Branch Status Changed",
            body: auditReason,
            severity: status === "ARCHIVED" ? "WARNING" : "INFO",
            relatedEntityType: "BRANCH",
            relatedEntityId: id,
          },
        });
      } catch {
        // Ignore
      }
    }

    return NextResponse.json({ success: true, branch: updated });
  } catch (error: any) {
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    console.error("Update branch error:", error);
    return NextResponse.json({ error: error.message || "Failed to update branch" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getSessionActor();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const authPassword = searchParams.get("authorizationPassword") || "";

    const branch = await prisma.branch.findUnique({
      where: { id },
    });

    if (!branch || branch.organizationId !== actor.organizationId) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    // Permanent hard delete is prohibited by system design to protect historical integrity
    // Perform safe archival instead
    const mutationCtx = await authorizeMutation({
      actor,
      permission: "ARCHIVE_BRANCH",
      targetBranchId: id,
      authorizationPassword: authPassword || undefined,
      module: "business",
      action: "BRANCH_ARCHIVED",
      entityType: "BRANCH",
      entityId: id,
      entityDisplayName: branch.nameEn,
      changesBefore: { status: branch.status },
      changesAfter: { status: "ARCHIVED" },
      reason: `${actor.name} archived Branch ${branch.code} (Safe Non-Destructive Archival)`,
    });

    const archivedBranch = await prisma.branch.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });

    await mutationCtx.audit({
      id: archivedBranch.id,
      code: archivedBranch.code,
      status: "ARCHIVED",
      notice: "Preserved all historical documents, employees, and operations.",
    });

    return NextResponse.json({
      success: true,
      message: "Branch has been safely archived. Historical data, documents, and employees remain intact.",
      branch: archivedBranch,
    });
  } catch (error: any) {
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error.message || "Failed to archive branch" }, { status: 500 });
  }
}
