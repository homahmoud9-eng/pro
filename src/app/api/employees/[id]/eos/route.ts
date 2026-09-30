import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionActor } from "@/lib/auth/session";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getSessionActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { lastWorkingDateStr, terminationReason, leavePayoutDays = 0, deductions = 0 } = body;

  const employee = await prisma.employee.findUnique({
    where: { id },
  });

  if (!employee || employee.organizationId !== actor.organizationId) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  const joining = new Date(employee.joiningDate);
  const lastWorking = lastWorkingDateStr ? new Date(lastWorkingDateStr) : new Date();

  const diffTime = lastWorking.getTime() - joining.getTime();
  const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

  const serviceYears = Math.floor(diffDays / 365);
  const serviceMonths = Math.floor((diffDays % 365) / 30);
  const serviceDays = (diffDays % 365) % 30;

  const basicSalary = Number(employee.basicSalary);
  const dailyBasic = basicSalary / 30; // standard UAE 30-day denominator

  let gratuityAmount = 0;

  // UAE Federal Decree-Law No. 33 of 2021 Gratuity Rules:
  // If service < 1 year: No gratuity entitlement
  // 1 to 5 years: 21 days of basic wage for each year
  // > 5 years: 30 days of basic wage for each year above 5 years
  if (serviceYears >= 1) {
    const totalDecimalYears = diffDays / 365;

    if (totalDecimalYears <= 5) {
      gratuityAmount = totalDecimalYears * 21 * dailyBasic;
    } else {
      const first5Years = 5 * 21 * dailyBasic;
      const extraYears = (totalDecimalYears - 5) * 30 * dailyBasic;
      gratuityAmount = first5Years + extraYears;
    }

    // Maximum cap under UAE law: 2 years' total salary
    const maxCap = basicSalary * 24;
    if (gratuityAmount > maxCap) {
      gratuityAmount = maxCap;
    }
  }

  const leavePayoutAmount = Number(leavePayoutDays) * dailyBasic;
  const netSettlement = gratuityAmount + leavePayoutAmount - Number(deductions);

  return NextResponse.json({
    calculation: {
      employeeCode: employee.employeeCode,
      name: employee.nameEn,
      basicSalary,
      dailyBasic: Number(dailyBasic.toFixed(2)),
      joiningDate: joining.toISOString().split("T")[0],
      lastWorkingDate: lastWorking.toISOString().split("T")[0],
      service: {
        totalDays: diffDays,
        years: serviceYears,
        months: serviceMonths,
        days: serviceDays,
      },
      gratuityAmount: Number(gratuityAmount.toFixed(2)),
      leavePayout: Number(leavePayoutAmount.toFixed(2)),
      deductions: Number(deductions),
      netSettlement: Number(netSettlement.toFixed(2)),
      policyVersion: "UAE Federal Decree-Law No. 33 of 2021",
      currency: "AED",
    },
  });
}
