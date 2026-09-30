import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyLoginPassword, createSessionToken, setSessionCookie } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { usernameOrEmail, password } = body;

    if (!usernameOrEmail || !password) {
      return NextResponse.json(
        { error: "Username/email and password are required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: usernameOrEmail, mode: "insensitive" } },
          { username: { equals: usernameOrEmail, mode: "insensitive" } },
        ],
      },
      include: {
        securityProfile: true,
      },
    });

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    if (!user || !user.securityProfile) {
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 }
      );
    }

    if (user.status !== "ACTIVE") {
      await prisma.securityEvent.create({
        data: {
          userId: user.id,
          eventType: "LOGIN_FAILURE_DISABLED",
          severity: "HIGH",
          details: "Attempted login to disabled or suspended account.",
          ipAddress: ip,
          userAgent,
        },
      });
      return NextResponse.json(
        { error: "Account is disabled. Please contact administrator." },
        { status: 403 }
      );
    }

    const isValid = await verifyLoginPassword(user.id, password);

    if (!isValid) {
      await prisma.securityEvent.create({
        data: {
          userId: user.id,
          eventType: "LOGIN_FAILURE_PASSWORD",
          severity: "WARNING",
          details: "Incorrect login password attempt.",
          ipAddress: ip,
          userAgent,
        },
      });
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 }
      );
    }

    // Success
    const token = await createSessionToken(user.id, ip, userAgent);
    await setSessionCookie(token);

    await prisma.userSecurityProfile.update({
      where: { userId: user.id },
      data: {
        failedLoginAttempts: 0,
        lastLoginAt: new Date(),
      },
    });

    await prisma.securityEvent.create({
      data: {
        userId: user.id,
        eventType: "LOGIN_SUCCESS",
        severity: "INFO",
        details: "User successfully authenticated.",
        ipAddress: ip,
        userAgent,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error occurred." },
      { status: 500 }
    );
  }
}
