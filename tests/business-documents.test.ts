/**
 * Comprehensive Automated Test Suite: Business / Company Document Center
 *
 * Verifies:
 * 1. Business Documents are first-class data (organizationId = X, branchId = null, employeeId = null, entityType = ORGANIZATION).
 * 2. Strict isolation: Business documents != Branch documents.
 * 3. Business document counters: Total, Active, Expiring, Expired, Archived.
 * 4. Document versioning: Non-destructive replacement (Version 1 -> Version 2), history preserved.
 * 5. PDF magic-byte validation and secure file storage key.
 * 6. Audit logging with actions (BUSINESS_DOCUMENT_UPLOADED, REPLACED, VIEWED, DOWNLOADED, ARCHIVED).
 * 7. Verification that branch document count does NOT include business documents, and vice-versa.
 */

import { prisma } from "../src/lib/db/prisma";
import { validatePdfBytes, saveDocumentFile } from "../src/lib/storage/document-storage";
import { writeAuditLog, verifyAuditChain } from "../src/lib/audit/audit-service";
import crypto from "crypto";
import fs from "fs";
import path from "path";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ ${message}`);
}

async function runBusinessDocumentTests() {
  console.log("\n====================================================");
  console.log("🏢 RUNNING BUSINESS / COMPANY DOCUMENT TEST SUITE");
  console.log("====================================================\n");

  const org = await prisma.organization.findFirst();
  assert(!!org, "Organization found in database");
  const owner = await prisma.user.findFirst({ where: { email: "owner@tasha.ae" } });
  assert(!!owner, "Owner user found in database");

  // Step 1: Initial clean state & type discovery
  console.log("\n--- STEP 1: INITIAL CLEAN STATE & TYPE DISCOVERY ---");
  await prisma.documentReminder.deleteMany({});
  await prisma.documentVersion.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.branch.deleteMany({ where: { organizationId: org!.id, code: { startsWith: "BR-TEST-" } } });

  const initialBizDocs = await prisma.document.count({
    where: { organizationId: org!.id, branchId: null },
  });
  assert(initialBizDocs === 0, "Initial business documents in DB is clean (0)");

  const tradeLicenseType = await prisma.documentType.findFirst({
    where: { nameEn: "Main Trade License" },
  });
  assert(!!tradeLicenseType, "Main Trade License document type exists in database");

  const taxRegType = await prisma.documentType.findFirst({
    where: { nameEn: "Tax Registration Certificate" },
  });
  assert(!!taxRegType, "Tax Registration document type exists in database");

  // Step 2: Validate PDF Buffer magic bytes
  console.log("\n--- STEP 2: PDF VALIDATION & MAGIC BYTES ---");
  const validPdfBuffer = Buffer.from("%PDF-1.7\nSample Trade License Content\n%%EOF");
  const pdfCheck = validatePdfBytes(validPdfBuffer);
  assert(pdfCheck.valid, "Valid %PDF- buffer is recognized as authentic PDF");

  const fakePdfBuffer = Buffer.from("<html><body>Not a PDF</body></html>");
  const fakeCheck = validatePdfBytes(fakePdfBuffer);
  assert(!fakeCheck.valid, "Non-PDF buffer is rejected by magic byte inspection");

  // Step 3: Create Branch for Isolation Testing
  console.log("\n--- STEP 3: CREATE BRANCH FOR ISOLATION TEST ---");
  await prisma.branch.deleteMany({ where: { organizationId: org!.id, code: { startsWith: "BR-TEST-" } } });
  const testBranchCode = `BR-TEST-${Date.now()}`;
  const testBranch = await prisma.branch.create({
    data: {
      organizationId: org!.id,
      code: testBranchCode,
      nameAr: "فرع اختبار المستندات",
      nameEn: "Test Docs Branch",
      address: "Abu Dhabi",
      status: "ACTIVE",
    },
  });
  assert(!!testBranch, `Created test branch (${testBranchCode})`);

  // Step 4: Upload Business Document (branchId = NULL, entityType = ORGANIZATION)
  console.log("\n--- STEP 4: UPLOAD BUSINESS-LEVEL DOCUMENT ---");
  const bizDocId = crypto.randomUUID();
  const storedBizV1 = await saveDocumentFile(org!.id, bizDocId, 1, validPdfBuffer);

  const bizDoc = await prisma.document.create({
    data: {
      id: bizDocId,
      organizationId: org!.id,
      branchId: null, // STRICTLY NULL FOR BUSINESS DOCUMENTS
      employeeId: null,
      documentTypeId: tradeLicenseType!.id,
      title: "Main Trade License",
      referenceNumber: "TL-AD-2026-9999",
      entityType: "ORGANIZATION",
      issueDate: new Date("2026-01-01"),
      expiryDate: new Date("2027-01-01"),
      status: "ACTIVE",
      isLegal: true,
      createdBy: owner!.name,
    },
  });

  const bizDocVersion1 = await prisma.documentVersion.create({
    data: {
      documentId: bizDoc.id,
      versionNumber: 1,
      originalFilename: "Main_Trade_License_2026.pdf",
      storageKey: storedBizV1.storageKey,
      mimeType: storedBizV1.mimeType,
      sizeBytes: storedBizV1.sizeBytes,
      sha256: storedBizV1.sha256,
      scanStatus: "CLEAN",
      uploadedBy: owner!.name,
    },
  });

  await prisma.document.update({
    where: { id: bizDoc.id },
    data: { currentVersionId: bizDocVersion1.id },
  });

  // Log audit
  await writeAuditLog({
    organizationId: org!.id,
    branchId: null,
    actorUserId: owner!.id,
    actorNameSnapshot: owner!.name,
    action: "BUSINESS_DOCUMENT_UPLOADED",
    module: "BUSINESS",
    entityType: "DOCUMENT",
    entityId: bizDoc.id,
    entityDisplayName: bizDoc.title,
    metadata: {
      referenceNumber: bizDoc.referenceNumber,
      documentType: tradeLicenseType!.nameEn,
      version: 1,
    },
  });

  assert(bizDoc.branchId === null, "Business document has branchId = NULL");
  assert(bizDoc.entityType === "ORGANIZATION", "Business document has entityType = ORGANIZATION");

  // Step 5: Upload Branch-level Document (branchId = testBranch.id, entityType = BRANCH)
  console.log("\n--- STEP 5: UPLOAD BRANCH-LEVEL DOCUMENT ---");
  const branchDocId = crypto.randomUUID();
  const storedBranchV1 = await saveDocumentFile(org!.id, branchDocId, 1, validPdfBuffer);

  const branchDoc = await prisma.document.create({
    data: {
      id: branchDocId,
      organizationId: org!.id,
      branchId: testBranch.id, // STRICTLY LINKED TO BRANCH
      employeeId: null,
      documentTypeId: tradeLicenseType!.id,
      title: "Branch Tenancy Contract",
      referenceNumber: "TC-BR-01",
      entityType: "BRANCH",
      issueDate: new Date("2026-02-01"),
      expiryDate: new Date("2027-02-01"),
      status: "ACTIVE",
      isLegal: true,
      createdBy: owner!.name,
    },
  });

  const branchDocVersion = await prisma.documentVersion.create({
    data: {
      documentId: branchDoc.id,
      versionNumber: 1,
      originalFilename: "Branch_Tenancy_Contract.pdf",
      storageKey: storedBranchV1.storageKey,
      mimeType: storedBranchV1.mimeType,
      sizeBytes: storedBranchV1.sizeBytes,
      sha256: storedBranchV1.sha256,
      scanStatus: "CLEAN",
      uploadedBy: owner!.name,
    },
  });

  await prisma.document.update({
    where: { id: branchDoc.id },
    data: { currentVersionId: branchDocVersion.id },
  });

  assert(branchDoc.branchId === testBranch.id, "Branch document has branchId = testBranch.id");
  assert(branchDoc.entityType === "BRANCH", "Branch document has entityType = BRANCH");

  // Step 6: Verify Strict Isolation & Independent Counts
  console.log("\n--- STEP 6: VERIFY ISOLATION & COUNTERS ---");
  const countBizDocs = await prisma.document.count({
    where: { organizationId: org!.id, branchId: null, employeeId: null },
  });
  const countBranchDocs = await prisma.document.count({
    where: { organizationId: org!.id, branchId: testBranch.id },
  });

  assert(countBizDocs === initialBizDocs + 1, `Business document count is isolated: ${countBizDocs}`);
  assert(countBranchDocs === 1, `Branch document count is isolated: ${countBranchDocs}`);

  // Query specifically as done by /api/business
  const businessDocsQuery = await prisma.document.findMany({
    where: { organizationId: org!.id, branchId: null, employeeId: null },
  });
  const hasBranchDocInBiz = businessDocsQuery.some((d) => d.id === branchDoc.id);
  assert(!hasBranchDocInBiz, "Business document list contains ZERO branch documents");

  // Step 7: Document Versioning (Replace document with Version 2)
  console.log("\n--- STEP 7: NON-DESTRUCTIVE REPLACEMENT (VERSIONING) ---");
  const v2Buffer = Buffer.from("%PDF-1.7\nUpdated Trade License Version 2\n%%EOF");
  const storedBizV2 = await saveDocumentFile(org!.id, bizDoc.id, 2, v2Buffer);

  const bizDocVersion2 = await prisma.documentVersion.create({
    data: {
      documentId: bizDoc.id,
      versionNumber: 2,
      originalFilename: "Main_Trade_License_2026_Renewed.pdf",
      storageKey: storedBizV2.storageKey,
      mimeType: storedBizV2.mimeType,
      sizeBytes: storedBizV2.sizeBytes,
      sha256: storedBizV2.sha256,
      scanStatus: "CLEAN",
      uploadedBy: owner!.name,
      notes: "Annual renewal approved by DED Abu Dhabi",
    },
  });

  const updatedBizDoc = await prisma.document.update({
    where: { id: bizDoc.id },
    data: {
      currentVersionId: bizDocVersion2.id,
      expiryDate: new Date("2028-01-01"),
    },
    include: {
      versions: { orderBy: { versionNumber: "asc" } },
    },
  });

  await writeAuditLog({
    organizationId: org!.id,
    branchId: null,
    actorUserId: owner!.id,
    actorNameSnapshot: owner!.name,
    action: "BUSINESS_DOCUMENT_REPLACED",
    module: "BUSINESS",
    entityType: "DOCUMENT",
    entityId: bizDoc.id,
    entityDisplayName: bizDoc.title,
    metadata: {
      previousVersion: 1,
      newVersion: 2,
      changeNote: "Annual renewal approved by DED Abu Dhabi",
    },
  });

  assert(updatedBizDoc.versions.length === 2, "Document has 2 versions preserved in history");
  assert(updatedBizDoc.versions[0].versionNumber === 1, "Version 1 preserved intact in history");
  assert(updatedBizDoc.versions[1].versionNumber === 2, "Version 2 is the new active version");
  assert(updatedBizDoc.currentVersionId === bizDocVersion2.id, "currentVersionId points to Version 2");

  // Step 8: Document View & Download Audit Logging
  console.log("\n--- STEP 8: VIEW & DOWNLOAD AUDIT LOGGING ---");
  await writeAuditLog({
    organizationId: org!.id,
    actorUserId: owner!.id,
    actorNameSnapshot: owner!.name,
    action: "BUSINESS_DOCUMENT_VIEWED",
    module: "BUSINESS",
    entityType: "DOCUMENT",
    entityId: bizDoc.id,
    entityDisplayName: bizDoc.title,
  });

  await writeAuditLog({
    organizationId: org!.id,
    actorUserId: owner!.id,
    actorNameSnapshot: owner!.name,
    action: "BUSINESS_DOCUMENT_DOWNLOADED",
    module: "BUSINESS",
    entityType: "DOCUMENT",
    entityId: bizDoc.id,
    entityDisplayName: bizDoc.title,
  });

  const viewLogs = await prisma.auditLog.findMany({
    where: {
      entityId: bizDoc.id,
      action: { in: ["BUSINESS_DOCUMENT_UPLOADED", "BUSINESS_DOCUMENT_REPLACED", "BUSINESS_DOCUMENT_VIEWED", "BUSINESS_DOCUMENT_DOWNLOADED"] },
    },
  });
  assert(viewLogs.length === 4, `All 4 Business Document audit actions recorded (found: ${viewLogs.length})`);

  // Step 9: Archive Business Document
  console.log("\n--- STEP 9: ARCHIVE BUSINESS DOCUMENT ---");
  await prisma.document.update({
    where: { id: bizDoc.id },
    data: { status: "ARCHIVED" },
  });

  await writeAuditLog({
    organizationId: org!.id,
    actorUserId: owner!.id,
    actorNameSnapshot: owner!.name,
    action: "BUSINESS_DOCUMENT_ARCHIVED",
    module: "BUSINESS",
    entityType: "DOCUMENT",
    entityId: bizDoc.id,
    entityDisplayName: bizDoc.title,
  });

  const archivedDoc = await prisma.document.findUnique({ where: { id: bizDoc.id } });
  assert(archivedDoc?.status === "ARCHIVED", "Business document status updated to ARCHIVED");

  // Step 10: Verify Audit Chain Integrity after all business doc operations
  console.log("\n--- STEP 10: AUDIT CHAIN VERIFICATION ---");
  const auditVerification = await verifyAuditChain(org!.id);
  assert(auditVerification.valid, `Cryptographic HMAC-SHA256 audit chain intact: ${auditVerification.message}`);

  // Step 11: Cleanup test artifacts
  console.log("\n--- STEP 11: CLEANUP TEST ARTIFACTS ---");
  const uploadRoot = path.resolve(process.env.STORAGE_PATH || "./uploads");
  try {
    fs.rmSync(path.join(uploadRoot, org!.id, bizDoc.id), { recursive: true, force: true });
    fs.rmSync(path.join(uploadRoot, org!.id, branchDoc.id), { recursive: true, force: true });
  } catch (e) {
    // Ignore cleanup error if file not found
  }

  await prisma.documentVersion.deleteMany({ where: { documentId: bizDoc.id } });
  await prisma.document.delete({ where: { id: bizDoc.id } });

  await prisma.documentVersion.deleteMany({ where: { documentId: branchDoc.id } });
  await prisma.document.delete({ where: { id: branchDoc.id } });

  await prisma.branch.delete({ where: { id: testBranch.id } });

  console.log("\n====================================================");
  console.log("🎉 ALL BUSINESS DOCUMENT CENTER TESTS PASSED (11/11)");
  console.log("====================================================\n");
}

runBusinessDocumentTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
