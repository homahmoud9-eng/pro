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
  const documents = await prisma.document.findMany({
    where: {
      organizationId: actor.organizationId,
      entityType: "EMPLOYEE",
      entityId: employee.id,
    },
    include: {
      documentType: true,
      currentVersion: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  // Procedures involving this employee
  const procedures = await prisma.procedure.findMany({
    where: {
      organizationId: actor.organizationId,
      subjectType: "EMPLOYEE",
      subjectId: employee.id,
    },
    include: { steps: true },
    orderBy: { createdAt: "desc" },
  });

  // Audit history for this employee
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      organizationId: actor.organizationId,
      entityId: employee.id,
    },
    orderBy: { occurredAt: "desc" },
    take: 20,
  });

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

  return NextResponse.json({
    employee: safeEmployee,
    documents,
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
      mobile,
      email,
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
        branchId: branchId !== undefined ? branchId : current.branchId,
        departmentId: departmentId !== undefined ? departmentId : current.departmentId,
        basicSalary: basicSalary !== undefined ? Number(basicSalary) : current.basicSalary,
        housingAllowance: housingAllowance !== undefined ? Number(housingAllowance) : current.housingAllowance,
        transportAllowance: transportAllowance !== undefined ? Number(transportAllowance) : current.transportAllowance,
        otherAllowances: otherAllowances !== undefined ? Number(otherAllowances) : current.otherAllowances,
        mobile: mobile !== undefined ? mobile : current.mobile,
        email: email !== undefined ? email : current.email,
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
