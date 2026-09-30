import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionActor } from "@/lib/auth/session";
import { authorizeMutation, SecurityError } from "@/lib/security/mutation-guard";

export async function GET() {
  const actor = await getSessionActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

    const [organization, branchesRaw, departments, legalDocs, docStats] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: actor.organizationId },
      }),
      prisma.branch.findMany({
        where: { organizationId: actor.organizationId },
        include: {
          _count: { select: { employees: true, documents: true, inventoryItems: true } },
        },
        orderBy: { code: "asc" },
      }),
      prisma.department.findMany({
        where: { organizationId: actor.organizationId },
        include: { _count: { select: { employees: true } } },
      }),
      prisma.document.findMany({
        where: { organizationId: actor.organizationId, isLegal: true },
        include: { documentType: true, currentVersion: true, branch: true },
      }),
      prisma.document.groupBy({
        by: ["branchId", "status"],
        where: { organizationId: actor.organizationId, branchId: { not: null } },
        _count: { _all: true },
      }),
    ]);

    const branches = branchesRaw.map((b) => {
      const stats = docStats.filter((s) => s.branchId === b.id);
      const activeDocuments = stats.find((s) => s.status === "ACTIVE")?._count._all || 0;
      const expiringDocuments = stats.find((s) => s.status === "EXPIRING_SOON")?._count._all || 0;
      const expiredDocuments = stats.find((s) => s.status === "EXPIRED")?._count._all || 0;
      return {
        ...b,
        docStats: {
          total: b._count.documents,
          active: activeDocuments,
          expiring: expiringDocuments,
          expired: expiredDocuments,
        },
      };
    });

    return NextResponse.json({
      organization,
      branches,
      departments,
      legalDocs,
    });
  }

export async function PATCH(req: NextRequest) {
  try {
    const actor = await getSessionActor();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { nameAr, nameEn, phone, email, address, authorizationPassword } = body;

    const currentOrg = await prisma.organization.findUnique({
      where: { id: actor.organizationId },
    });

    if (!currentOrg) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const mutationCtx = await authorizeMutation({
      actor,
      permission: "business.update",
      authorizationPassword,
      module: "business",
      action: "UPDATE_ORGANIZATION_PROFILE",
      entityType: "ORGANIZATION",
      entityId: currentOrg.id,
      entityDisplayName: currentOrg.nameEn,
      changesBefore: { nameEn: currentOrg.nameEn, phone: currentOrg.phone, address: currentOrg.address },
      changesAfter: { nameEn, phone, address },
    });

    const updated = await prisma.organization.update({
      where: { id: currentOrg.id },
      data: {
        nameAr: nameAr || currentOrg.nameAr,
        nameEn: nameEn || currentOrg.nameEn,
        phone: phone || currentOrg.phone,
        email: email || currentOrg.email,
        address: address || currentOrg.address,
      },
    });

    await mutationCtx.audit();

    return NextResponse.json({ success: true, organization: updated });
  } catch (error: any) {
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    console.error("Update organization error:", error);
    return NextResponse.json({ error: error.message || "Failed to update profile" }, { status: 500 });
  }
}
