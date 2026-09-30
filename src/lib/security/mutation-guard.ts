import { AuthenticatedActor, verifyAuthorizationPassword } from "../auth/session";
import { prisma } from "../db/prisma";
import { writeAuditLog } from "../audit/audit-service";

export interface AuthorizeMutationOptions {
  actor: AuthenticatedActor | null;
  permission?: string;
  targetBranchId?: string | null;
  authorizationPassword?: string;
  module: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  entityDisplayName?: string | null;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  changesBefore?: any;
  changesAfter?: any;
  changedFields?: string[];
  reason?: string;
  skipAuthPassword?: boolean; // Only for safe non-sensitive read actions or internal automated triggers
}

export interface MutationContext {
  actor: AuthenticatedActor;
  organizationId: string;
  branchId?: string | null;
  audit: (successChangesAfter?: any) => Promise<any>;
}

export class SecurityError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode = 403) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

export async function authorizeMutation(
  options: AuthorizeMutationOptions
): Promise<MutationContext> {
  const { actor, permission, targetBranchId, authorizationPassword } = options;

  // 1. Authenticated
  if (!actor) {
    throw new SecurityError("UNAUTHENTICATED", "Authentication session required.", 401);
  }

  // 2. Active Account
  if (actor.status !== "ACTIVE") {
    throw new SecurityError("ACCOUNT_DISABLED", "Account is disabled or suspended.", 403);
  }

  // 3. Permission Check (Owner role bypasses individual permission check)
  const isOwner = actor.roles.includes("Owner");
  if (!isOwner && permission) {
    const hasPerm = actor.permissions.includes(permission);
    if (!hasPerm) {
      await prisma.securityEvent.create({
        data: {
          userId: actor.id,
          eventType: "PERMISSION_DENIED",
          severity: "HIGH",
          details: `User attempted action '${options.action}' requiring permission '${permission}' on ${options.entityType}`,
          ipAddress: options.ipAddress,
          userAgent: options.userAgent,
        },
      });
      throw new SecurityError(
        "PERMISSION_DENIED",
        `You do not have the required permission: ${permission}`,
        403
      );
    }
  }

  // 4. Branch Scope Check
  // If user has specific branch scopes (non-empty), targetBranchId must be one of them
  if (targetBranchId && actor.branchScopes.length > 0) {
    if (!actor.branchScopes.includes(targetBranchId)) {
      await prisma.securityEvent.create({
        data: {
          userId: actor.id,
          eventType: "BRANCH_SCOPE_DENIED",
          severity: "HIGH",
          details: `User attempted to access branch '${targetBranchId}' outside assigned scope [${actor.branchScopes.join(", ")}]`,
          ipAddress: options.ipAddress,
          userAgent: options.userAgent,
        },
      });
      throw new SecurityError(
        "BRANCH_SCOPE_DENIED",
        "Action denied: Target branch is outside your authorized scope.",
        403
      );
    }
  }

  // 5. Authorization Password Check (Mandatory for all mutations)
  if (!options.skipAuthPassword) {
    if (!authorizationPassword) {
      throw new SecurityError(
        "AUTHORIZATION_PASSWORD_REQUIRED",
        "Authorization password is required to execute this operation.",
        400
      );
    }

    const isValidAuthPwd = await verifyAuthorizationPassword(actor.id, authorizationPassword);

    if (!isValidAuthPwd) {
      await prisma.securityEvent.create({
        data: {
          userId: actor.id,
          eventType: "AUTH_PWD_FAILURE",
          severity: "CRITICAL",
          details: `Failed authorization password attempt for mutation '${options.action}' on ${options.entityType}`,
          ipAddress: options.ipAddress,
          userAgent: options.userAgent,
        },
      });
      throw new SecurityError(
        "AUTHORIZATION_PASSWORD_INVALID",
        "Invalid authorization password. Action has been rejected and logged.",
        403
      );
    }
  }

  // Helper function to write the immutable audit log upon successful completion of the mutation
  const audit = async (successChangesAfter?: any) => {
    return writeAuditLog({
      organizationId: actor.organizationId,
      branchId: targetBranchId || null,
      actorUserId: actor.id,
      actorNameSnapshot: actor.name,
      actorEmailSnapshot: actor.email,
      action: options.action,
      module: options.module,
      entityType: options.entityType,
      entityId: options.entityId,
      entityDisplayName: options.entityDisplayName,
      requestId: options.requestId,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      success: true,
      reason: options.reason,
      changesBefore: options.changesBefore,
      changesAfter: successChangesAfter ?? options.changesAfter,
      changedFields: options.changedFields,
    });
  };

  return {
    actor,
    organizationId: actor.organizationId,
    branchId: targetBranchId,
    audit,
  };
}
