import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionActor } from "@/lib/auth/session";
import { authorizeMutation, SecurityError } from "@/lib/security/mutation-guard";
import bcrypt from "bcryptjs";

export async function GET() {
  const actor = await getSessionActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [rawUsers, roles, branches, employees] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId: actor.organizationId },
      include: {
        roles: { include: { role: true } },
        branchScopes: { include: { branch: true } },
        securityProfile: {
          select: {
            failedLoginAttempts: true,
            failedAuthAttempts: true,
            lastLoginAt: true,
            lastAuthAt: true,
            lockedUntil: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.role.findMany({
      where: { organizationId: actor.organizationId },
      orderBy: { name: "asc" },
    }),
    prisma.branch.findMany({
      where: { organizationId: actor.organizationId },
      select: { id: true, nameEn: true, nameAr: true, code: true },
      orderBy: { code: "asc" },
    }),
    prisma.employee.findMany({
      where: { organizationId: actor.organizationId },
      select: { email: true, phone: true },
    }),
  ]);

  const employeePhoneMap = new Map<string, string>();
  for (const emp of employees) {
    if (emp.email && emp.phone) {
      employeePhoneMap.set(emp.email.toLowerCase(), emp.phone);
    }
  }

  const users = rawUsers.map((u) => {
    const primaryRole = u.roles[0]?.role;
    const roleNormalized = primaryRole?.name ? primaryRole.name.toUpperCase().replace(/\s+/g, "_") : "STAFF";
    const isAllBranches =
      u.branchScopes.length === 0 ||
      primaryRole?.name === "Owner" ||
      primaryRole?.name === "HR Manager" ||
      primaryRole?.name === "Finance Manager" ||
      primaryRole?.name === "Compliance Officer" ||
      roleNormalized === "OWNER" ||
      roleNormalized === "HR_MANAGER" ||
      roleNormalized === "FINANCE_MANAGER" ||
      roleNormalized === "COMPLIANCE_OFFICER";

    const phone = employeePhoneMap.get(u.email.toLowerCase()) || (u.username ? `@${u.username}` : "—");

    return {
      id: u.id,
      email: u.email,
      username: u.username,
      name: u.name,
      fullName: u.name,
      status: u.status,
      isActive: u.status === "ACTIVE",
      mobile: phone,
      branchScopeType: isAllBranches ? "ALL_BRANCHES" : "SELECTED_BRANCHES",
      role: {
        id: primaryRole?.id || "",
        name: primaryRole?.name || "Staff",
        roleKey: roleNormalized,
        description: primaryRole?.description || "",
      },
      roles: u.roles,
      branches: u.branchScopes.map((bs) => ({
        branch: {
          id: bs.branch.id,
          nameEn: bs.branch.nameEn,
          nameAr: bs.branch.nameAr || bs.branch.nameEn,
        },
      })),
      branchScopes: u.branchScopes,
      securityProfile: u.securityProfile,
      createdAt: u.createdAt,
    };
  });

  return NextResponse.json({ users, roles, branches });
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getSessionActor();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const name = (body.fullName || body.name || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    let username = (body.username || "").trim();
    if (!username && email) {
      username = email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "");
    }
    const initialLoginPassword = body.initialLoginPassword || body.loginPassword;
    const initialAuthPassword = body.initialAuthPassword || body.authorizationPassword;
    const authorizationPassword = body.authorizationPasswordConfirm || body.authPassword || body.authorizationPassword;

    if (!name || !email || !username || !initialLoginPassword || !initialAuthPassword) {
      return NextResponse.json(
        { error: "Name, email, username, initial login password and authorization password are required." },
        { status: 400 }
      );
    }

    // Check duplicate
    const existing = await prisma.user.findFirst({
      where: {
        organizationId: actor.organizationId,
        OR: [{ email }, { username }],
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email or username already exists in the organization." },
        { status: 400 }
      );
    }

    // Resolve Role ID
    let roleId = body.roleId;
    if (!roleId && body.roleName) {
      const allRoles = await prisma.role.findMany({
        where: { organizationId: actor.organizationId },
      });
      const match = allRoles.find(
        (r) =>
          r.id === body.roleName ||
          r.name.toLowerCase() === body.roleName.toLowerCase() ||
          r.name.toUpperCase().replace(/\s+/g, "_") === body.roleName.toUpperCase().replace(/\s+/g, "_")
      );
      if (match) {
        roleId = match.id;
      }
    }

    // Resolve Branch Scope IDs
    let branchScopeIds: string[] = Array.isArray(body.branchScopeIds) ? body.branchScopeIds : [];
    if (branchScopeIds.length === 0 && body.branchId && body.branchId !== "ALL") {
      branchScopeIds = [body.branchId];
    }

    const mutationCtx = await authorizeMutation({
      actor,
      permission: "user.create",
      authorizationPassword,
      module: "security",
      action: "CREATE_USER",
      entityType: "USER",
      entityDisplayName: `${name} (${username})`,
    });

    const saltRounds = 10;
    const loginPasswordHash = await bcrypt.hash(initialLoginPassword, saltRounds);
    const authPasswordHash = await bcrypt.hash(initialAuthPassword, saltRounds);

    const newUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          organizationId: actor.organizationId,
          name,
          email,
          username,
          status: "ACTIVE",
          mustChangePassword: true,
          securityProfile: {
            create: {
              loginPasswordHash,
              authorizationPasswordHash: authPasswordHash,
              temporaryAuthPassword: true,
            },
          },
        },
      });

      if (roleId) {
        await tx.userRole.create({
          data: {
            userId: u.id,
            roleId,
          },
        });
      }

      for (const bId of branchScopeIds) {
        await tx.userBranchScope.create({
          data: {
            userId: u.id,
            branchId: bId,
          },
        });
      }

      return u;
    });

    await mutationCtx.audit({
      userId: newUser.id,
      name: newUser.name,
      email: newUser.email,
      roleId,
      branchScopeIds,
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    console.error("Create user error:", error);
    return NextResponse.json({ error: error.message || "Failed to create user" }, { status: 500 });
  }
}
