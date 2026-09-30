import { prisma } from "../db/prisma";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  "uae_restaurant_session_secret_2026_production_grade_random_key";
const SESSION_COOKIE_NAME = "uae_restaurant_session";

export interface AuthenticatedActor {
  id: string;
  organizationId: string;
  email: string;
  username: string;
  name: string;
  roles: string[];
  permissions: string[];
  branchScopes: string[]; // empty means all branches allowed (Owner / Global), otherwise list of branchIds
  status: string;
}

export async function createSessionToken(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const token = jwt.sign({ userId, exp: Math.floor(expiresAt.getTime() / 1000) }, SESSION_SECRET);

  await prisma.session.create({
    data: {
      userId,
      token,
      ipAddress,
      userAgent,
      expiresAt,
    },
  });

  return token;
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    try {
      await prisma.session.deleteMany({ where: { token } });
    } catch {
      // Ignore if already deleted
    }
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSessionActor(
  tokenOverride?: string
): Promise<AuthenticatedActor | null> {
  let token = tokenOverride;
  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    } catch {
      return null;
    }
  }

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, SESSION_SECRET) as { userId: string };
    if (!decoded?.userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        branchScopes: true,
      },
    });

    if (!user || user.status !== "ACTIVE") return null;

    const roleNames: string[] = [];
    const permissionCodes = new Set<string>();

    for (const ur of user.roles) {
      roleNames.push(ur.role.name);
      for (const rp of ur.role.rolePermissions) {
        permissionCodes.add(rp.permission.code);
      }
    }

    const branchScopes = user.branchScopes.map((bs) => bs.branchId);

    return {
      id: user.id,
      organizationId: user.organizationId,
      email: user.email,
      username: user.username,
      name: user.name,
      roles: roleNames,
      permissions: Array.from(permissionCodes),
      branchScopes,
      status: user.status,
    };
  } catch {
    return null;
  }
}

export async function verifyLoginPassword(
  userId: string,
  plainPassword: string
): Promise<boolean> {
  const profile = await prisma.userSecurityProfile.findUnique({
    where: { userId },
  });
  if (!profile) return false;
  return bcrypt.compare(plainPassword, profile.loginPasswordHash);
}

export async function verifyAuthorizationPassword(
  userId: string,
  plainAuthPassword: string
): Promise<boolean> {
  const profile = await prisma.userSecurityProfile.findUnique({
    where: { userId },
  });
  if (!profile) return false;

  // Check if locked
  if (profile.lockedUntil && profile.lockedUntil > new Date()) {
    return false;
  }

  const isValid = await bcrypt.compare(plainAuthPassword, profile.authorizationPasswordHash);

  if (isValid) {
    // Reset failed count and update lastAuthAt
    await prisma.userSecurityProfile.update({
      where: { userId },
      data: {
        failedAuthAttempts: 0,
        lastAuthAt: new Date(),
      },
    });
    return true;
  } else {
    // Increment failed attempts and lock if > 5 attempts
    const newCount = profile.failedAuthAttempts + 1;
    const lockedUntil =
      newCount >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null; // 15 min lock

    await prisma.userSecurityProfile.update({
      where: { userId },
      data: {
        failedAuthAttempts: newCount,
        lockedUntil,
      },
    });
    return false;
  }
}
