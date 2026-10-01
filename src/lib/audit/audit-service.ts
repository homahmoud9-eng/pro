import { prisma } from "../db/prisma";
import crypto from "crypto";

const AUDIT_SECRET =
  process.env.AUDIT_CHAIN_SECRET ||
  "uae_restaurant_audit_hmac_secret_key_2026_super_secure";

export function canonicalJson(obj: any): string {
  if (obj === null || obj === undefined) return "";
  if (obj instanceof Date) return JSON.stringify(obj.toISOString());
  if (typeof obj?.toNumber === "function") {
    return JSON.stringify(obj.toNumber());
  }
  if (typeof obj?.toJSON === "function" && !(obj instanceof Date)) {
    return canonicalJson(obj.toJSON());
  }
  if (typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalJson).join(",") + "]";
  }
  const keys = Object.keys(obj).sort();
  return (
    "{" +
    keys.map((k) => JSON.stringify(k) + ":" + canonicalJson(obj[k])).join(",") +
    "}"
  );
}

export function computeAuditHash(prevHash: string, eventData: any): string {
  const serialized = canonicalJson(eventData);
  return crypto
    .createHmac("sha256", AUDIT_SECRET)
    .update(prevHash + serialized)
    .digest("hex");
}

export interface WriteAuditParams {
  organizationId: string;
  branchId?: string | null;
  actorUserId: string;
  actorNameSnapshot: string;
  actorEmailSnapshot?: string | null;
  action: string;
  module: string;
  entityType: string;
  entityId?: string | null;
  entityDisplayName?: string | null;
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  success?: boolean;
  reason?: string | null;
  changesBefore?: any;
  changesAfter?: any;
  changedFields?: string[];
  metadata?: any;
}

export async function writeAuditLog(params: WriteAuditParams) {
  // Read chain head for organization
  let chainHead = await prisma.auditChainHead.findUnique({
    where: { organizationId: params.organizationId },
  });

  if (!chainHead) {
    chainHead = await prisma.auditChainHead.create({
      data: {
        organizationId: params.organizationId,
        sequenceNumber: 0,
        currentHash:
          "0000000000000000000000000000000000000000000000000000000000000000",
      },
    });
  }

  const nextSeq = chainHead.sequenceNumber + 1;
  const occurredAt = new Date();
  const cleanChangesAfter = params.changesAfter !== undefined && params.changesAfter !== null
    ? JSON.parse(JSON.stringify(params.changesAfter))
    : null;

  // Compute hash over canonical payload
  const hashPayload = {
    sequenceNumber: nextSeq,
    actorUserId: params.actorUserId,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId || "",
    occurredAt: occurredAt.toISOString(),
    changesAfter: cleanChangesAfter,
  };

  const hash = computeAuditHash(chainHead.currentHash, hashPayload);

  const log = await prisma.auditLog.create({
    data: {
      sequenceNumber: nextSeq,
      organizationId: params.organizationId,
      branchId: params.branchId,
      actorUserId: params.actorUserId,
      actorNameSnapshot: params.actorNameSnapshot,
      actorEmailSnapshot: params.actorEmailSnapshot,
      action: params.action,
      module: params.module,
      entityType: params.entityType,
      entityId: params.entityId,
      entityDisplayName: params.entityDisplayName,
      requestId: params.requestId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      occurredAt,
      success: params.success ?? true,
      reason: params.reason,
      changesBefore: params.changesBefore || undefined,
      changesAfter: params.changesAfter || undefined,
      changedFields: params.changedFields ? JSON.stringify(params.changedFields) : undefined,
      metadata: params.metadata || undefined,
      previousHash: chainHead.currentHash,
      hash,
    },
  });

  // Update head
  await prisma.auditChainHead.update({
    where: { organizationId: params.organizationId },
    data: {
      sequenceNumber: nextSeq,
      currentHash: hash,
    },
  });

  return log;
}

export async function verifyAuditChain(organizationId: string): Promise<{
  valid: boolean;
  verifiedCount: number;
  brokenSequence?: number;
  message: string;
}> {
  const logs = await prisma.auditLog.findMany({
    where: { organizationId },
    orderBy: { sequenceNumber: "asc" },
  });

  if (logs.length === 0) {
    return { valid: true, verifiedCount: 0, message: "No audit records found to verify." };
  }

  let expectedPrevHash = "0000000000000000000000000000000000000000000000000000000000000000";

  for (const log of logs) {
    if (log.previousHash !== expectedPrevHash) {
      return {
        valid: false,
        verifiedCount: log.sequenceNumber - 1,
        brokenSequence: log.sequenceNumber,
        message: `Previous hash mismatch at sequence #${log.sequenceNumber}`,
      };
    }

    const payload = {
      sequenceNumber: log.sequenceNumber,
      actorUserId: log.actorUserId,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId || "",
      occurredAt: log.occurredAt.toISOString(),
      changesAfter: log.changesAfter || null,
    };

    const calculated = computeAuditHash(expectedPrevHash, payload);
    if (calculated !== log.hash) {
      return {
        valid: false,
        verifiedCount: log.sequenceNumber - 1,
        brokenSequence: log.sequenceNumber,
        message: `Hash signature tamper detected at sequence #${log.sequenceNumber}`,
      };
    }

    expectedPrevHash = log.hash;
  }

  return {
    valid: true,
    verifiedCount: logs.length,
    message: `Verified: ${logs.length} audit records. Cryptographic HMAC chain intact.`,
  };
}
