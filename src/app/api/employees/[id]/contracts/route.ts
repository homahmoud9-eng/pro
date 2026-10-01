import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionActor } from "@/lib/auth/session";
import { authorizeMutation, SecurityError } from "@/lib/security/mutation-guard";
import { saveDocumentFile } from "@/lib/storage/document-storage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getSessionActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const contracts = await prisma.contract.findMany({
    where: {
      organizationId: actor.organizationId,
      employeeId: id,
    },
    orderBy: { startDate: "desc" },
  });

  return NextResponse.json({ contracts });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getSessionActor();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const contentType = req.headers.get("content-type") || "";
    let contractType = "LIMITED";
    let contractNumber: string | null = null;
    let startDateStr = "";
    let endDateStr: string | null = null;
    let basicSalary = 0;
    let allowances = 0;
    let notes: string | null = null;
    let file: File | null = null;
    let authorizationPassword = "";

    if (contentType.includes("application/json")) {
      const json = await req.json();
      contractType = json.contractType || "LIMITED";
      contractNumber = json.contractNumber || null;
      startDateStr = json.startDate || "";
      endDateStr = json.endDate || null;
      basicSalary = parseFloat(json.basicSalary || "0");
      allowances = parseFloat(json.allowances || "0");
      notes = json.notes || null;
      authorizationPassword = json.authorizationPassword || "";
    } else {
      const formData = await req.formData();
      contractType = (formData.get("contractType") as string) || "LIMITED";
      contractNumber = formData.get("contractNumber") as string | null;
      startDateStr = formData.get("startDate") as string;
      endDateStr = formData.get("endDate") as string | null;
      basicSalary = parseFloat((formData.get("basicSalary") as string) || "0");
      allowances = parseFloat((formData.get("allowances") as string) || "0");
      notes = formData.get("notes") as string | null;
      file = formData.get("file") as File | null;
      authorizationPassword = formData.get("authorizationPassword") as string;
    }

    if (!startDateStr) {
      return NextResponse.json({ error: "Start date is required for employment contract." }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!employee || employee.organizationId !== actor.organizationId) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Authorize mutation with Level-2 password
    const mutationCtx = await authorizeMutation({
      actor,
      permission: "employee.update",
      targetBranchId: employee.branchId,
      authorizationPassword,
      module: "employee",
      action: "CREATE_EMPLOYEE_CONTRACT",
      entityType: "EMPLOYEE",
      entityId: employee.id,
      entityDisplayName: `${employee.nameEn} (${contractType})`,
      reason: "New employment contract registration / renewal",
    });

    let fileUrl: string | null = null;
    if (file) {
      const arrayBuffer = await file.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);
      const randomDocId = crypto.randomUUID();
      const stored = await saveDocumentFile(actor.organizationId, randomDocId, 1, fileBuffer);
      fileUrl = `/api/documents/${randomDocId}/view`;
    }

    const startDate = new Date(startDateStr);
    const endDate = endDateStr ? new Date(endDateStr) : null;

    let status = "ACTIVE";
    if (endDate) {
      const now = new Date();
      const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (endDate < now) {
        status = "EXPIRED";
      } else if (endDate < thirtyDays) {
        status = "EXPIRING_SOON";
      }
    }

    const contract = await prisma.contract.create({
      data: {
        organizationId: actor.organizationId,
        employeeId: employee.id,
        contractType,
        contractNumber,
        startDate,
        endDate,
        basicSalary,
        allowances,
        notes,
        fileUrl,
        status,
      },
    });

    await mutationCtx.audit({
      contractId: contract.id,
      contractType,
      contractNumber,
      startDate: contract.startDate,
      endDate: contract.endDate,
      basicSalary: contract.basicSalary,
      allowances: contract.allowances,
    });

    return NextResponse.json({ success: true, contract });
  } catch (error: any) {
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    console.error("Contract creation error:", error);
    return NextResponse.json({ error: error.message || "Failed to create contract" }, { status: 500 });
  }
}
