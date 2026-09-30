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
  const employeeId = searchParams.get("employeeId");

  const where: any = {
    organizationId: actor.organizationId,
  };

  if (actor.branchScopes.length > 0) {
    where.OR = [
      { branchId: { in: actor.branchScopes } },
      { branchId: null },
    ];
  } else if (branchId && branchId !== "ALL") {
    where.branchId = branchId;
  }

  if (employeeId) {
    where.employeeId = employeeId;
  }

  const records = await prisma.attendanceRecord.findMany({
    where,
    include: {
      employee: {
        select: { id: true, nameEn: true, nameAr: true, employeeCode: true, jobTitle: true },
      },
      branch: {
        select: { id: true, nameEn: true, nameAr: true },
      },
    },
    orderBy: { workDate: "desc" },
    take: 50,
  });

  return NextResponse.json({ data: records });
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getSessionActor();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      recordId,
      clockInTime,
      clockOutTime,
      status,
      reason,
      authorizationPassword,
    } = body;

    const currentRecord = await prisma.attendanceRecord.findUnique({
      where: { id: recordId },
      include: { employee: true },
    });

    if (!currentRecord || currentRecord.organizationId !== actor.organizationId) {
      return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
    }

    const mutationCtx = await authorizeMutation({
      actor,
      permission: "attendance.update",
      targetBranchId: currentRecord.branchId,
      authorizationPassword,
      module: "attendance",
      action: "CORRECT_ATTENDANCE",
      entityType: "ATTENDANCE_RECORD",
      entityId: currentRecord.id,
      entityDisplayName: `${currentRecord.employee.nameEn} (${currentRecord.workDate.toISOString().split("T")[0]})`,
      changesBefore: {
        status: currentRecord.status,
        clockIn: currentRecord.actualClockIn,
        clockOut: currentRecord.actualClockOut,
      },
      changesAfter: {
        status,
        clockInTime,
        clockOutTime,
      },
      reason,
    });

    const updated = await prisma.attendanceRecord.update({
      where: { id: recordId },
      data: {
        status: status || currentRecord.status,
        actualClockIn: clockInTime ? new Date(clockInTime) : currentRecord.actualClockIn,
        actualClockOut: clockOutTime ? new Date(clockOutTime) : currentRecord.actualClockOut,
        correctedBy: actor.name,
        correctedAt: new Date(),
        notes: reason || currentRecord.notes,
      },
    });

    await mutationCtx.audit();

    return NextResponse.json({ success: true, record: updated });
  } catch (error: any) {
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    console.error("Attendance correction error:", error);
    return NextResponse.json({ error: error.message || "Failed to update attendance" }, { status: 500 });
  }
}
