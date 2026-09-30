import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionActor } from "@/lib/auth/session";
import { authorizeMutation, SecurityError } from "@/lib/security/mutation-guard";

export async function GET() {
  const actor = await getSessionActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const periods = await prisma.payrollPeriod.findMany({
    where: { organizationId: actor.organizationId },
    include: {
      entries: {
        include: {
          employee: {
            select: { id: true, nameEn: true, nameAr: true, employeeCode: true, jobTitle: true },
          },
        },
      },
    },
    orderBy: { year: "desc" },
  });

  return NextResponse.json({ data: periods });
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getSessionActor();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { actionType, periodId, year, month, authorizationPassword } = body;

    // Sub-case 1: Generate monthly payroll draft from active employees
    if (actionType === "GENERATE_DRAFT") {
      const mutationCtx = await authorizeMutation({
        actor,
        permission: "payroll.create",
        authorizationPassword,
        module: "payroll",
        action: "GENERATE_PAYROLL_DRAFT",
        entityType: "PAYROLL_PERIOD",
        entityDisplayName: `Payroll ${month}/${year}`,
      });

      const activeEmployees = await prisma.employee.findMany({
        where: { organizationId: actor.organizationId, status: "ACTIVE" },
      });

      const now = new Date();
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const period = await prisma.$transaction(async (tx) => {
        let totalGross = 0;
        let totalNet = 0;

        const p = await tx.payrollPeriod.upsert({
          where: {
            organizationId_year_month: {
              organizationId: actor.organizationId,
              year,
              month,
            },
          },
          update: {
            status: "CALCULATED",
          },
          create: {
            organizationId: actor.organizationId,
            year,
            month,
            name: `${new Intl.DateTimeFormat("en-US", { month: "long" }).format(startDate)} ${year}`,
            startDate,
            endDate,
            status: "CALCULATED",
            totalEmployees: activeEmployees.length,
          },
        });

        for (const emp of activeEmployees) {
          const basic = Number(emp.basicSalary);
          const housing = Number(emp.housingAllowance);
          const transport = Number(emp.transportAllowance);
          const other = Number(emp.otherAllowances);
          const gross = basic + housing + transport + other;
          const net = gross;

          totalGross += gross;
          totalNet += net;

          await tx.payrollEntry.upsert({
            where: {
              payrollPeriodId_employeeId: {
                payrollPeriodId: p.id,
                employeeId: emp.id,
              },
            },
            update: {
              basicSalary: basic,
              housingAllowance: housing,
              transportAllowance: transport,
              otherAllowances: other,
              netSalary: net,
              status: "PENDING",
            },
            create: {
              payrollPeriodId: p.id,
              employeeId: emp.id,
              basicSalary: basic,
              housingAllowance: housing,
              transportAllowance: transport,
              otherAllowances: other,
              netSalary: net,
              status: "PENDING",
              wpsStatus: "READY",
            },
          });
        }

        return tx.payrollPeriod.update({
          where: { id: p.id },
          data: {
            totalGross,
            totalNet,
            totalEmployees: activeEmployees.length,
          },
          include: { entries: true },
        });
      });

      await mutationCtx.audit({
        periodId: period.id,
        year,
        month,
        totalNet: period.totalNet,
        totalEmployees: period.totalEmployees,
      });

      return NextResponse.json({ success: true, period });
    }

    // Sub-case 2: Approve payroll for WPS export
    if (actionType === "APPROVE_WPS") {
      const period = await prisma.payrollPeriod.findUnique({
        where: { id: periodId },
      });

      if (!period || period.organizationId !== actor.organizationId) {
        return NextResponse.json({ error: "Payroll period not found" }, { status: 404 });
      }

      const mutationCtx = await authorizeMutation({
        actor,
        permission: "payroll.approve",
        authorizationPassword,
        module: "payroll",
        action: "APPROVE_PAYROLL_WPS",
        entityType: "PAYROLL_PERIOD",
        entityId: period.id,
        entityDisplayName: period.name,
      });

      const wpsRef = `WPS-${period.year}${String(period.month).padStart(2, "0")}-${Date.now().toString().slice(-4)}`;

      const updated = await prisma.payrollPeriod.update({
        where: { id: period.id },
        data: {
          status: "APPROVED",
          approvedBy: actor.name,
          approvedAt: new Date(),
          wpsBatchRef: wpsRef,
        },
      });

      await mutationCtx.audit({
        periodId: period.id,
        wpsBatchRef: wpsRef,
        totalAmount: period.totalNet,
        approvedBy: actor.name,
      });

      return NextResponse.json({ success: true, period: updated, wpsBatchRef: wpsRef });
    }

    return NextResponse.json({ error: "Invalid actionType" }, { status: 400 });
  } catch (error: any) {
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    console.error("Payroll error:", error);
    return NextResponse.json({ error: error.message || "Payroll operation failed" }, { status: 500 });
  }
}
