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

  const [users, roles, branches] = await Promise.all([
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
    }),
    prisma.branch.findMany({
      where: { organizationId: actor.organizationId },
      select: { id: true, nameEn: true, nameAr: true, code: true },
    }),
  ]);

  return NextResponse.json({ users, roles, branches });
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getSessionActor();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      email,
      username,
      roleId,
      branchScopeIds = [],
      initialLoginPassword,
      initialAuthPassword,
      authorizationPassword,
    } = body;

    if (!name || !email || !username || !initialLoginPassword || !initialAuthPassword) {
      return NextResponse.json(
        { error: "Name, email, username, initial login password and authorization password are required." },
        { status: 400 }
      );
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
