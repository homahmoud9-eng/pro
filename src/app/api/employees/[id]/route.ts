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

  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      branch: true,
      department: true,
      attendanceRecords: {
        orderBy: { workDate: "desc" },
        take: 30,
      },
    },
  });

  if (!employee || employee.organizationId !== actor.organizationId) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  // Branch scope check
  if (
    employee.branchId &&
    actor.branchScopes.length > 0 &&
    !actor.branchScopes.includes(employee.branchId)
  ) {
    return NextResponse.json(
      { error: "Access denied to employee in another branch" },
      { status: 403 }
    );
  }

  // Documents attached to this employee
  const [documents, contracts, docTypes, procedures, auditLogs] = await Promise.all([
    prisma.document.findMany({
      where: {
        organizationId: actor.organizationId,
        OR: [
          { entityType: "EMPLOYEE", entityId: employee.id },
          { employeeId: employee.id },
        ],
      },
      include: {
        documentType: true,
        currentVersion: true,
        versions: { orderBy: { versionNumber: "desc" } },
        reminders: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.contract.findMany({
      where: {
        organizationId: actor.organizationId,
        employeeId: employee.id,
      },
      orderBy: { startDate: "desc" },
    }),
    prisma.documentType.findMany({
      where: { organizationId: actor.organizationId },
      orderBy: { nameEn: "asc" },
    }),
    prisma.procedure.findMany({
      where: {
        organizationId: actor.organizationId,
        subjectType: "EMPLOYEE",
        subjectId: employee.id,
      },
      include: { steps: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.findMany({
      where: {
        organizationId: actor.organizationId,
        OR: [
          { entityId: employee.id },
          { entityType: "EMPLOYEE", entityDisplayName: { contains: employee.employeeCode } },
        ],
      },
      orderBy: { occurredAt: "desc" },
      take: 50,
    }),
  ]);

  // Compute dynamic days remaining and dynamic status
  const now = new Date();
  const enrichedDocs = documents.map((doc) => {
    let daysRemaining: number | null = null;
    let computedStatus = doc.status;

    if (doc.expiryDate) {
      const diff = Math.ceil((new Date(doc.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      daysRemaining = diff;
      if (diff < 0) {
        computedStatus = "EXPIRED";
      } else if (diff <= 30) {
        computedStatus = "EXPIRING_SOON";
      } else {
        computedStatus = "ACTIVE";
      }
    }

    return {
      ...doc,
      status: computedStatus,
      daysRemaining,
    };
  });

  // Required UAE employee document types
  const REQUIRED_TYPES = [
    { code: "VISA", nameEn: "UAE Residence Visa", nameAr: "تأشيرة الإقامة الإماراتية" },
    { code: "PASSPORT", nameEn: "Passport", nameAr: "جواز السفر" },
    { code: "EMIRATES_ID", nameEn: "Emirates ID", nameAr: "بطاقة الهوية الإماراتية" },
    { code: "WORK_PERMIT", nameEn: "Work Permit", nameAr: "تصريح العمل" },
    { code: "LABOUR_CONTRACT", nameEn: "Labour Contract", nameAr: "عقد العمل" },
    { code: "HEALTH_INSURANCE", nameEn: "Health Insurance", nameAr: "التأمين الصحي" },
  ];

  const missingDocuments = REQUIRED_TYPES.filter((reqType) => {
    return !enrichedDocs.some((d) => {
      const titleLower = (d.title || "").toLowerCase();
      const typeNameLower = (d.documentType?.nameEn || "").toLowerCase();
      return (
        titleLower.includes(reqType.code.toLowerCase()) ||
        typeNameLower.includes(reqType.code.toLowerCase()) ||
        titleLower.includes(reqType.nameEn.toLowerCase()) ||
        typeNameLower.includes(reqType.nameEn.toLowerCase()) ||
        d.title.includes(reqType.nameAr) ||
        (d.documentType?.nameAr && d.documentType.nameAr.includes(reqType.nameAr))
      );
    });
  });

  const stats = {
    totalDocs: enrichedDocs.length,
    activeDocs: enrichedDocs.filter((d) => d.status === "ACTIVE").length,
    expiringSoonDocs: enrichedDocs.filter((d) => d.status === "EXPIRING_SOON").length,
    expiredDocs: enrichedDocs.filter((d) => d.status === "EXPIRED").length,
    missingDocs: missingDocuments.length,
    contractsCount: contracts.length,
  };

  const hasSalaryPermission =
    actor.roles.includes("Owner") || actor.permissions.includes("employee.salary.read");

  const safeEmployee = hasSalaryPermission
    ? employee
    : {
        ...employee,
        basicSalary: null,
        housingAllowance: null,
        transportAllowance: null,
        otherAllowances: null,
      };

  const employeeWithRelations = {
    ...safeEmployee,
    documents: enrichedDocs,
    contracts,
  };

  return NextResponse.json({
    employee: employeeWithRelations,
    documents: enrichedDocs,
    contracts,
    docTypes,
    missingDocuments,
    stats,
    procedures,
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
    const {
      nameAr,
      nameEn,
      jobTitle,
      branchId,
      departmentId,
      basicSalary,
      housingAllowance,
      transportAllowance,
      otherAllowances,
      gender,
      nationality,
      photoUrl,
      mobile,
      email,
      address,
      emergencyContact,
      notes,
      status,
      authorizationPassword,
      reason,
    } = body;

    const current = await prisma.employee.findUnique({
      where: { id },
    });

    if (!current || current.organizationId !== actor.organizationId) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Check if salary is being changed
    const isSalaryChanged =
      basicSalary !== undefined && Number(basicSalary) !== Number(current.basicSalary);

    // If salary changed, verify employee.salary.update permission
    if (isSalaryChanged) {
      const isOwner = actor.roles.includes("Owner");
      if (!isOwner && !actor.permissions.includes("employee.salary.update")) {
        return NextResponse.json(
          { error: "Permission denied: employee.salary.update is required to alter salary." },
          { status: 403 }
        );
      }
    }

    // Calculate diff before/after
    const changesBefore: any = {};
    const changesAfter: any = {};
    const changedFields: string[] = [];

    if (nameEn !== undefined && nameEn !== current.nameEn) {
      changesBefore.nameEn = current.nameEn;
      changesAfter.nameEn = nameEn;
      changedFields.push("nameEn");
    }
    if (nameAr !== undefined && nameAr !== current.nameAr) {
      changesBefore.nameAr = current.nameAr;
      changesAfter.nameAr = nameAr;
      changedFields.push("nameAr");
    }
    if (jobTitle !== undefined && jobTitle !== current.jobTitle) {
      changesBefore.jobTitle = current.jobTitle;
      changesAfter.jobTitle = jobTitle;
      changedFields.push("jobTitle");
    }
    if (photoUrl !== undefined && photoUrl !== current.photoUrl) {
      changesBefore.photoUrl = current.photoUrl;
      changesAfter.photoUrl = photoUrl;
      changedFields.push("photoUrl");
    }
    if (branchId !== undefined && branchId !== current.branchId) {
      changesBefore.branchId = current.branchId;
      changesAfter.branchId = branchId;
      changedFields.push("branchId");
    }
    if (departmentId !== undefined && departmentId !== current.departmentId) {
      changesBefore.departmentId = current.departmentId;
      changesAfter.departmentId = departmentId;
      changedFields.push("departmentId");
    }
    if (isSalaryChanged) {
      changesBefore.basicSalary = Number(current.basicSalary);
      changesAfter.basicSalary = Number(basicSalary);
      changedFields.push("basicSalary");
    }
    if (housingAllowance !== undefined && Number(housingAllowance) !== Number(current.housingAllowance)) {
      changesBefore.housingAllowance = Number(current.housingAllowance);
      changesAfter.housingAllowance = Number(housingAllowance);
      changedFields.push("housingAllowance");
    }
    if (status !== undefined && status !== current.status) {
      changesBefore.status = current.status;
      changesAfter.status = status;
      changedFields.push("status");
    }

    // Two-Level Security Authorization
    const mutationCtx = await authorizeMutation({
      actor,
      permission: "employee.update",
      targetBranchId: current.branchId,
      authorizationPassword,
      module: "employee",
      action: "UPDATE_EMPLOYEE",
      entityType: "EMPLOYEE",
      entityId: current.id,
      entityDisplayName: `${current.nameEn} (${current.employeeCode})`,
      changesBefore,
      changesAfter,
      changedFields,
      reason: reason || "Employee record update",
    });

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        nameAr: nameAr !== undefined ? nameAr : current.nameAr,
        nameEn: nameEn !== undefined ? nameEn : current.nameEn,
        jobTitle: jobTitle !== undefined ? jobTitle : current.jobTitle,
        gender: gender !== undefined ? gender : current.gender,
        nationality: nationality !== undefined ? nationality : current.nationality,
        photoUrl: photoUrl !== undefined ? photoUrl : current.photoUrl,
        branchId: branchId !== undefined ? branchId : current.branchId,
        departmentId: departmentId !== undefined ? departmentId : current.departmentId,
        basicSalary: basicSalary !== undefined ? Number(basicSalary) : current.basicSalary,
        housingAllowance: housingAllowance !== undefined ? Number(housingAllowance) : current.housingAllowance,
        transportAllowance: transportAllowance !== undefined ? Number(transportAllowance) : current.transportAllowance,
        otherAllowances: otherAllowances !== undefined ? Number(otherAllowances) : current.otherAllowances,
        mobile: mobile !== undefined ? mobile : current.mobile,
        email: email !== undefined ? email : current.email,
        address: address !== undefined ? address : current.address,
        emergencyContact: emergencyContact !== undefined ? emergencyContact : current.emergencyContact,
        notes: notes !== undefined ? notes : current.notes,
        status: status !== undefined ? status : current.status,
      },
    });

    // Write audit log
    await mutationCtx.audit();

    return NextResponse.json({ success: true, employee: updated });
  } catch (error: any) {
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    console.error("Employee update error:", error);
    return NextResponse.json({ error: error.message || "Failed to update employee" }, { status: 500 });
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
    const body = await req.json().catch(() => ({}));
    const authorizationPassword = body.authorizationPassword || req.headers.get("x-authorization-password") || "";

    const current = await prisma.employee.findUnique({
      where: { id },
    });

    if (!current || current.organizationId !== actor.organizationId) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const mutationCtx = await authorizeMutation({
      actor,
      permission: "employee.delete",
      targetBranchId: current.branchId,
      authorizationPassword,
      module: "employee",
      action: "ARCHIVE_EMPLOYEE",
      entityType: "EMPLOYEE",
      entityId: current.id,
      entityDisplayName: `${current.nameEn} (${current.employeeCode})`,
      changesBefore: { status: current.status },
      changesAfter: { status: "ARCHIVED" },
      reason: "Employee soft archival - preserving historical compliance documents and contracts",
    });

    const archived = await prisma.employee.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });

    await mutationCtx.audit();

    return NextResponse.json({
      success: true,
      message: "Employee successfully archived",
      employee: archived,
    });
  } catch (error: any) {
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    console.error("Employee archive error:", error);
    return NextResponse.json({ error: error.message || "Failed to archive employee" }, { status: 500 });
  }
}
