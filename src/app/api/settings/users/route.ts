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

  // Exactly ONE role exists: Owner
  const [rawUsers, roles, branches] = await Promise.all([
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
      where: { organizationId: actor.organizationId, name: "Owner" },
    }),
    prisma.branch.findMany({
      where: { organizationId: actor.organizationId },
      select: { id: true, nameEn: true, nameAr: true, code: true },
      orderBy: { code: "asc" },
    }),
  ]);

  const users = rawUsers.map((u) => {
    return {
      id: u.id,
      email: u.email,
      username: u.username,
      name: u.name,
      fullName: u.name,
      status: u.status,
      isActive: u.status === "ACTIVE",
      mobile: u.username ? `@${u.username}` : "—",
      branchScopeType: "ALL_BRANCHES",
      role: {
        id: roles[0]?.id || "",
        name: "Owner",
        roleKey: "OWNER",
        description: "Full system authority across all modules and branches (المالك)",
      },
      roles: u.roles,
      branches: [],
      branchScopes: [],
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

    // Reject attempt to create any role other than Owner
    if (body.roleName && body.roleName !== "Owner" && body.roleName !== "OWNER") {
      return NextResponse.json(
        { error: "Owner-Only Architecture: Exactly one application role exists (Owner / المالك). Other roles are not permitted." },
        { status: 400 }
      );
    }

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

    const ownerRole = await prisma.role.findFirst({
      where: { organizationId: actor.organizationId, name: "Owner" },
    });

    if (!ownerRole) {
      return NextResponse.json({ error: "Owner role not found in system." }, { status: 500 });
    }

    const mutationCtx = await authorizeMutation({
      actor,
      permission: "user.create",
      authorizationPassword,
      module: "security",
      action: "CREATE_OWNER_USER",
      entityType: "USER",
      entityDisplayName: `${name} (${username}) - Owner`,
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
          mustChangePassword: false,
          securityProfile: {
            create: {
              loginPasswordHash,
              authorizationPasswordHash: authPasswordHash,
              temporaryAuthPassword: false,
            },
          },
        },
      });

      await tx.userRole.create({
        data: {
          userId: u.id,
          roleId: ownerRole.id,
        },
      });

      return u;
    });

    await mutationCtx.audit({
      userId: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: "Owner",
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
