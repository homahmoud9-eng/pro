import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionActor } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const actor = await getSessionActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId");
  const documentTypeId = searchParams.get("documentTypeId");
  const status = searchParams.get("status"); // ALL, EXPIRING_SOON, EXPIRED
  const search = searchParams.get("search");

  const where: any = {
    organizationId: actor.organizationId,
    expiryDate: { not: null },
  };

  if (actor.branchScopes.length > 0) {
    where.OR = [
      { branchId: { in: actor.branchScopes } },
      { branchId: null },
    ];
  } else if (branchId && branchId !== "ALL") {
    where.branchId = branchId;
  }

  if (documentTypeId && documentTypeId !== "ALL") {
    where.documentTypeId = documentTypeId;
  }

  const now = new Date();
  const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  if (status === "EXPIRED") {
    where.expiryDate = { lt: now };
  } else if (status === "EXPIRING_SOON") {
    where.expiryDate = { gte: now, lte: ninetyDaysFromNow };
  } else {
    // Default: Expired or expiring within 90 days
    where.expiryDate = { lte: ninetyDaysFromNow };
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { referenceNumber: { contains: search, mode: "insensitive" } },
      { employee: { nameEn: { contains: search, mode: "insensitive" } } },
      { employee: { nameAr: { contains: search, mode: "insensitive" } } },
      { employee: { employeeCode: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [documents, branches, documentTypes] = await Promise.all([
    prisma.document.findMany({
      where,
      include: {
        documentType: true,
        currentVersion: true,
        branch: { select: { id: true, nameEn: true, nameAr: true, code: true } },
        employee: { select: { id: true, nameEn: true, nameAr: true, employeeCode: true, photoUrl: true, jobTitle: true } },
      },
      orderBy: { expiryDate: "asc" },
      take: 100,
    }),
    prisma.branch.findMany({
      where: { organizationId: actor.organizationId },
      select: { id: true, nameEn: true, nameAr: true, code: true },
    }),
    prisma.documentType.findMany({
      where: { organizationId: actor.organizationId },
      select: { id: true, nameEn: true, nameAr: true },
    }),
  ]);

  const enriched = documents.map((doc) => {
    let daysRemaining = 0;
    let computedStatus = doc.status;
    if (doc.expiryDate) {
      const diff = Math.ceil((new Date(doc.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      daysRemaining = diff;
      if (diff < 0) computedStatus = "EXPIRED";
      else if (diff <= 30) computedStatus = "EXPIRING_SOON";
      else computedStatus = "ACTIVE";
    }
    return {
      ...doc,
      status: computedStatus,
      daysRemaining,
    };
  });

  return NextResponse.json({
    documents: enriched,
    data: enriched,
    branches,
    documentTypes,
  });
}
