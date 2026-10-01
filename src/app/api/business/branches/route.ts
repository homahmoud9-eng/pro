import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionActor } from "@/lib/auth/session";
import { authorizeMutation, SecurityError } from "@/lib/security/mutation-guard";
import { writeAuditLog } from "@/lib/audit/audit-service";

export async function GET(req: NextRequest) {
  try {
    const actor = await getSessionActor();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    const where: any = {
      organizationId: actor.organizationId,
    };

    // Enforce branch scope if actor is restricted
    if (actor.branchScopes.length > 0) {
      where.id = { in: actor.branchScopes };
    }

    // Status filter
    if (status && status !== "ALL") {
      where.status = status;
    }

    // Type filter
    if (type && type !== "ALL") {
      where.type = type;
    }

    // Search filter across nameEn, nameAr, code, address, managerName
    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { nameEn: { contains: search, mode: "insensitive" } },
            { nameAr: { contains: search, mode: "insensitive" } },
            { code: { contains: search, mode: "insensitive" } },
            { address: { contains: search, mode: "insensitive" } },
            { addressAr: { contains: search, mode: "insensitive" } },
            { managerName: { contains: search, mode: "insensitive" } },
          ],
        },
      ];
    }

    const [branchesRaw, docStats] = await Promise.all([
      prisma.branch.findMany({
        where,
        include: {
          _count: {
            select: {
              employees: true,
              documents: true,
              inventoryItems: true,
              procedures: true,
            },
          },
        },
        orderBy: { code: "asc" },
      }),
      prisma.document.groupBy({
        by: ["branchId", "status"],
        where: {
          organizationId: actor.organizationId,
          branchId: { not: null },
        },
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

    return NextResponse.json({ success: true, branches });
  } catch (error: any) {
    console.error("GET /api/business/branches error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch branches" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getSessionActor();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      code,
      nameEn,
      nameAr,
      type = "RESTAURANT",
      status = "ACTIVE",
      address,
      addressAr,
      phone,
      email,
      managerName,
      openingDate,
      closingDate,
      openingHours,
      notes,
      authorizationPassword,
    } = body;

    // 1. Validation
    if (!nameEn || typeof nameEn !== "string" || nameEn.trim().length < 2) {
      return NextResponse.json(
        { error: "English branch name is required (minimum 2 characters)" },
        { status: 400 }
      );
    }

    if (!nameAr || typeof nameAr !== "string" || nameAr.trim().length < 2) {
      return NextResponse.json(
        { error: "Arabic branch name is required (minimum 2 characters)" },
        { status: 400 }
      );
    }

    const trimmedCode = (code || "").trim().toUpperCase();
    if (!trimmedCode || trimmedCode.length < 2 || trimmedCode.length > 20) {
      return NextResponse.json(
        { error: "Valid branch code is required (e.g. BR-04, 2-20 characters)" },
        { status: 400 }
      );
    }

    // Code format check (alphanumeric with optional hyphens/underscores)
    if (!/^[A-Z0-9\-_]+$/.test(trimmedCode)) {
      return NextResponse.json(
        { error: "Branch code can only contain letters, numbers, hyphens, and underscores" },
        { status: 400 }
      );
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json(
        { error: "Invalid email address format" },
        { status: 400 }
      );
    }

    const allowedTypes = [
      "RESTAURANT",
      "WATERFRONT",
      "PRODUCTION_KITCHEN",
      "CENTRAL_KITCHEN",
      "CATERING_KITCHEN",
      "WAREHOUSE",
      "OFFICE",
      "OTHER",
    ];
    const branchType = allowedTypes.includes(type) ? type : "RESTAURANT";

    const allowedStatuses = ["ACTIVE", "INACTIVE", "ARCHIVED", "UNDER_RENOVATION"];
    const branchStatus = allowedStatuses.includes(status) ? status : "ACTIVE";

    // 2. Uniqueness check within the organization
    const existingCode = await prisma.branch.findUnique({
      where: {
        organizationId_code: {
          organizationId: actor.organizationId,
          code: trimmedCode,
        },
      },
    });

    if (existingCode) {
      return NextResponse.json(
        { error: `Branch code '${trimmedCode}' is already in use within this business.` },
        { status: 400 }
      );
    }

    // 3. Security & Permission Authorization
    const mutationCtx = await authorizeMutation({
      actor,
      permission: "CREATE_BRANCH",
      authorizationPassword,
      module: "business",
      action: "BRANCH_CREATED",
      entityType: "BRANCH",
      entityDisplayName: `${nameEn.trim()} (${trimmedCode})`,
      changesAfter: {
        code: trimmedCode,
        nameEn: nameEn.trim(),
        nameAr: nameAr.trim(),
        type: branchType,
        status: branchStatus,
        address: address?.trim() || null,
        addressAr: addressAr?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        managerName: managerName?.trim() || null,
        openingDate: openingDate ? new Date(openingDate) : null,
        closingDate: closingDate ? new Date(closingDate) : null,
        openingHours: openingHours?.trim() || null,
        notes: notes?.trim() || null,
      },
      reason: `${actor.name} created Branch ${trimmedCode}`,
    });

    // 4. Create in Database
    const newBranch = await prisma.branch.create({
      data: {
        organizationId: actor.organizationId,
        code: trimmedCode,
        nameEn: nameEn.trim(),
        nameAr: nameAr.trim(),
        type: branchType,
        status: branchStatus,
        address: address?.trim() || null,
        addressAr: addressAr?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        managerName: managerName?.trim() || null,
        openingDate: openingDate ? new Date(openingDate) : null,
        closingDate: closingDate ? new Date(closingDate) : null,
        openingHours: openingHours?.trim() || null,
        notes: notes?.trim() || null,
      },
    });

    // 5. Immutable Audit Log & Head Hash update
    await mutationCtx.audit(
      {
        id: newBranch.id,
        code: newBranch.code,
        nameEn: newBranch.nameEn,
        nameAr: newBranch.nameAr,
        status: newBranch.status,
      },
      {
        entityId: newBranch.id,
        branchId: newBranch.id,
        entityDisplayName: `${newBranch.nameEn} (${newBranch.code})`,
      }
    );

    // 6. Organization System Notification
    try {
      await prisma.notification.create({
        data: {
          organizationId: actor.organizationId,
          branchId: newBranch.id,
          userId: actor.id,
          type: "AUDIT_ALERT",
          title: "New Branch Created",
          body: `${actor.name} created Branch ${newBranch.code} (${newBranch.nameEn})`,
          severity: "INFO",
          relatedEntityType: "BRANCH",
          relatedEntityId: newBranch.id,
        },
      });
    } catch {
      // Ignore notification creation errors
    }

    return NextResponse.json(
      {
        success: true,
        branch: {
          ...newBranch,
          _count: { employees: 0, documents: 0, inventoryItems: 0, procedures: 0 },
          docStats: { total: 0, active: 0, expiring: 0, expired: 0 },
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    console.error("POST /api/business/branches error:", error);
    return NextResponse.json({ error: error.message || "Failed to create branch" }, { status: 500 });
  }
}
