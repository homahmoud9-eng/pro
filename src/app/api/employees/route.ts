import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionActor } from "@/lib/auth/session";
import { authorizeMutation, SecurityError } from "@/lib/security/mutation-guard";

export async function GET(req: NextRequest) {
  const actor = await getSessionActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId");
  const departmentId = searchParams.get("departmentId");
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  const where: any = {
    organizationId: actor.organizationId,
  };

  // Branch scope enforcement
  if (actor.branchScopes.length > 0) {
    where.branchId = { in: actor.branchScopes };
  } else if (branchId && branchId !== "ALL") {
    where.branchId = branchId;
  }

  if (departmentId && departmentId !== "ALL") {
    where.departmentId = departmentId;
  }

  if (status && status !== "ALL") {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { nameEn: { contains: search, mode: "insensitive" } },
      { nameAr: { contains: search, mode: "insensitive" } },
      { employeeCode: { contains: search, mode: "insensitive" } },
      { jobTitle: { contains: search, mode: "insensitive" } },
      { mobile: { contains: search, mode: "insensitive" } },
    ];
  }

  const hasSalaryPermission =
    actor.roles.includes("Owner") || actor.permissions.includes("employee.salary.read");

  const [total, employees, branches, departments] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where,
      include: {
        branch: { select: { id: true, nameEn: true, nameAr: true, code: true } },
        department: { select: { id: true, nameEn: true, nameAr: true, code: true } },
      },
      orderBy: { employeeCode: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.branch.findMany({
      where: { organizationId: actor.organizationId },
      select: { id: true, nameEn: true, nameAr: true, code: true },
    }),
    prisma.department.findMany({
      where: { organizationId: actor.organizationId },
      select: { id: true, nameEn: true, nameAr: true, code: true },
    }),
  ]);

  // Mask salary if user doesn't have permission
  const safeEmployees = employees.map((emp) => {
    if (!hasSalaryPermission) {
      const { basicSalary, housingAllowance, transportAllowance, otherAllowances, ...rest } = emp;
      return {
        ...rest,
        basicSalary: null,
        housingAllowance: null,
        transportAllowance: null,
        otherAllowances: null,
      };
    }
    return emp;
  });

  return NextResponse.json({
    data: safeEmployees,
    branches,
    departments,
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

    const body = await req.json();
    const {
      nameAr,
      nameEn,
      jobTitle,
      branchId,
      departmentId,
      basicSalary = 0,
      housingAllowance = 0,
      transportAllowance = 0,
      otherAllowances = 0,
      gender,
      nationality,
      mobile,
      email,
      joiningDate,
      passportNumber,
      emiratesId,
      visaNumber,
      authorizationPassword,
      reason,
    } = body;

    if (!nameEn || !nameAr || !jobTitle) {
      return NextResponse.json(
        { error: "English name, Arabic name, and Job Title are required." },
        { status: 400 }
      );
    }

    // Authorize mutation
    const mutationCtx = await authorizeMutation({
      actor,
      permission: "employee.create",
      targetBranchId: branchId,
      authorizationPassword,
      module: "employee",
      action: "CREATE_EMPLOYEE",
      entityType: "EMPLOYEE",
      entityDisplayName: `${nameEn} (${nameAr})`,
      reason: reason || "New employee registration",
    });

    // Generate unique employee code
    const count = await prisma.employee.count({
      where: { organizationId: actor.organizationId },
    });
    const employeeCode = `EMP-${String(count + 1).padStart(3, "0")}`;

    // Mask sensitive identifiers
    const passportNumberMasked = passportNumber
      ? `${passportNumber.slice(0, 1)}******${passportNumber.slice(-2)}`
      : null;
    const emiratesIdMasked = emiratesId
      ? `784-****-******${emiratesId.slice(-3)}`
      : null;
    const visaNumberMasked = visaNumber
      ? `201/****/*****${visaNumber.slice(-2)}`
      : null;

    const employee = await prisma.employee.create({
      data: {
        organizationId: actor.organizationId,
        branchId: branchId || null,
        departmentId: departmentId || null,
        employeeCode,
        nameAr,
        nameEn,
        jobTitle,
        gender: gender || null,
        nationality: nationality || null,
        basicSalary: Number(basicSalary),
        housingAllowance: Number(housingAllowance),
        transportAllowance: Number(transportAllowance),
        otherAllowances: Number(otherAllowances),
        mobile: mobile || null,
        email: email || null,
        joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
        status: "ACTIVE",
        passportNumberMasked,
        emiratesIdMasked,
        visaNumberMasked,
      },
    });

    // Write audit log
    await mutationCtx.audit({
      employeeId: employee.id,
      employeeCode: employee.employeeCode,
      name: employee.nameEn,
      jobTitle: employee.jobTitle,
      branchId: employee.branchId,
      basicSalary: employee.basicSalary,
    });

    return NextResponse.json({ success: true, employee });
  } catch (error: any) {
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    console.error("Employee create error:", error);
    return NextResponse.json({ error: error.message || "Failed to create employee" }, { status: 500 });
  }
}
