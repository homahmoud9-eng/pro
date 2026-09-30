import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionActor } from "@/lib/auth/session";
import { authorizeMutation, SecurityError } from "@/lib/security/mutation-guard";

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
    const body = await req.json();
    const { stepNumber, notes, authorizationPassword } = body;

    const proc = await prisma.procedure.findUnique({
      where: { id },
      include: { steps: { orderBy: { stepNumber: "asc" } } },
    });

    if (!proc || proc.organizationId !== actor.organizationId) {
      return NextResponse.json({ error: "Procedure not found" }, { status: 404 });
    }

    const mutationCtx = await authorizeMutation({
      actor,
      permission: "procedure.advance",
      targetBranchId: proc.branchId,
      authorizationPassword,
      module: "procedure",
      action: "ADVANCE_PROCEDURE_STEP",
      entityType: "PROCEDURE",
      entityId: proc.id,
      entityDisplayName: `${proc.reference} - ${proc.title}`,
      reason: notes || `Advancing step #${stepNumber}`,
    });

    // Mark current step completed
    if (stepNumber) {
      await prisma.procedureStep.update({
        where: {
          procedureId_stepNumber: {
            procedureId: proc.id,
            stepNumber: Number(stepNumber),
          },
        },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          notes: notes || undefined,
        },
      });
    }

    // Check remaining steps
    const updatedSteps = await prisma.procedureStep.findMany({
      where: { procedureId: proc.id },
      orderBy: { stepNumber: "asc" },
    });

    const allCompleted = updatedSteps.every((s) => s.status === "COMPLETED" || s.status === "SKIPPED");
    const nextStep = updatedSteps.find((s) => s.status === "PENDING");

    if (nextStep) {
      await prisma.procedureStep.update({
        where: { id: nextStep.id },
        data: { status: "IN_PROGRESS" },
      });
    }

    const newStatus = allCompleted ? "COMPLETED" : "IN_PROGRESS";

    const updatedProc = await prisma.procedure.update({
      where: { id: proc.id },
      data: {
        status: newStatus,
        completedAt: allCompleted ? new Date() : undefined,
      },
      include: { steps: { orderBy: { stepNumber: "asc" } } },
    });

    await mutationCtx.audit({
      procedureId: proc.id,
      reference: proc.reference,
      advancedStep: stepNumber,
      statusBefore: proc.status,
      statusAfter: newStatus,
      allCompleted,
    });

    return NextResponse.json({ success: true, procedure: updatedProc });
  } catch (error: any) {
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    console.error("Advance procedure error:", error);
    return NextResponse.json({ error: error.message || "Failed to advance procedure" }, { status: 500 });
  }
}
