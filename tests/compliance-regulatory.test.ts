/**
 * Comprehensive Automated Test Suite: ADAFSA Restaurant Compliance & Regulatory Module
 *
 * Verifies:
 * 1. Statutory ADAFSA requirements seeded and grounded in official Abu Dhabi regulations.
 * 2. Zero-state data integrity: No fake 100% scores, metrics reflect real database counts.
 * 3. ADAFSA Inspection creation with inspector info, official reference, and findings.
 * 4. Finding and Corrective Action lifecycle (OPEN -> RESOLVED/CLOSED) with audit trail.
 * 5. EFST (Essential Food Safety Training) for food handlers with %PDF- certificate upload and verification.
 * 6. Operational Food Safety logs (temperature monitoring with ADAFSA control thresholds).
 * 7. Traceability and Recall batch lot tracking.
 * 8. Strict Branch vs Business isolation.
 * 9. Cryptographic AuditLog HMAC chain integrity.
 */

import { prisma } from "../src/lib/db/prisma";
import { validatePdfBytes, saveDocumentFile } from "../src/lib/storage/document-storage";
import { writeAuditLog, verifyAuditChain } from "../src/lib/audit/audit-service";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ ${message}`);
}

async function runComplianceRegulatoryTests() {
  console.log("\n====================================================");
  console.log("🛡️ RUNNING ADAFSA REGULATORY COMPLIANCE TEST SUITE");
  console.log("====================================================\n");

  const org = await prisma.organization.findFirst();
  assert(!!org, "Organization found in database");
  const owner = await prisma.user.findFirst({ where: { email: "owner@tasha.ae" } });
  assert(!!owner, "Owner user found in database");

  // Step 1: Clean slate for compliance test artifacts
  console.log("\n--- STEP 1: INITIAL CLEAN STATE VERIFICATION ---");
  await prisma.correctiveAction.deleteMany({ where: { organizationId: org!.id } });
  await prisma.foodSafetyFinding.deleteMany({
    where: { inspection: { organizationId: org!.id } },
  });
  await prisma.foodSafetyInspection.deleteMany({ where: { organizationId: org!.id } });
  await prisma.foodSafetyLog.deleteMany({ where: { organizationId: org!.id } });
  await prisma.traceabilityRecord.deleteMany({ where: { organizationId: org!.id } });
  await prisma.foodHandlerTraining.deleteMany({
    where: { employee: { organizationId: org!.id } },
  });
  await prisma.complianceRecord.deleteMany({ where: { organizationId: org!.id } });

  // Clean test branches and employees if any
  await prisma.employee.deleteMany({
    where: { organizationId: org!.id, employeeCode: { startsWith: "TEST-EFST-" } },
  });
  await prisma.branch.deleteMany({
    where: { organizationId: org!.id, code: { in: ["BR-REG-01", "BR-REG-02"] } },
  });

  const inspectionCount = await prisma.foodSafetyInspection.count({
    where: { organizationId: org!.id },
  });
  const findingCount = await prisma.foodSafetyFinding.count({
    where: { inspection: { organizationId: org!.id } },
  });
  const actionCount = await prisma.correctiveAction.count({
    where: { organizationId: org!.id },
  });
  const efstCount = await prisma.foodHandlerTraining.count({
    where: { employee: { organizationId: org!.id } },
  });

  assert(inspectionCount === 0, "Inspections count is 0 in clean state");
  assert(findingCount === 0, "Inspection findings count is 0 in clean state");
  assert(actionCount === 0, "Corrective actions count is 0 in clean state");
  assert(efstCount === 0, "EFST training count is 0 in clean state");

  // Step 2: Verify Statutory ADAFSA Requirements
  console.log("\n--- STEP 2: STATUTORY ADAFSA REQUIREMENTS VERIFICATION ---");
  const requirements = await prisma.regulatoryRequirement.findMany({
    where: { authority: "ADAFSA" },
    include: { versions: true },
  });
  assert(requirements.length >= 6, `Found ${requirements.length} statutory ADAFSA requirements in database`);

  const efstReq = requirements.find((r) => r.code === "ADAFSA-EFST-01");
  assert(!!efstReq, "ADAFSA-EFST-01 statutory requirement exists");
  assert(
    efstReq!.sourceReference.includes("Regulation No. (6) of 2020"),
    "ADAFSA-EFST-01 cites official Food Hygiene Regulation No. (6) of 2020"
  );
  assert(efstReq!.versions.length >= 1, "ADAFSA-EFST-01 has version tracking history");

  const tempReq = requirements.find((r) => r.code === "ADAFSA-TEMP-01");
  assert(!!tempReq, "ADAFSA-TEMP-01 temperature control requirement exists");
  assert(
    tempReq!.sourceReference.includes("Code of Practice No. (1) of 2012"),
    "ADAFSA-TEMP-01 cites official Code of Practice No. (1) of 2012"
  );

  // Step 3: Create Branch & Food Handler Employee
  console.log("\n--- STEP 3: CREATING TEST BRANCH AND FOOD HANDLER ---");
  const branch1 = await prisma.branch.create({
    data: {
      organizationId: org!.id,
      code: "BR-REG-01",
      nameAr: "فرع البطين للرقابة",
      nameEn: "Al Bateen Regulatory Branch",
      address: "Al Bateen Marina, Abu Dhabi",
      status: "ACTIVE",
    },
  });
  assert(!!branch1, "Branch 1 created successfully");

  const branch2 = await prisma.branch.create({
    data: {
      organizationId: org!.id,
      code: "BR-REG-02",
      nameAr: "فرع المارية للرقابة",
      nameEn: "Al Maryah Regulatory Branch",
      address: "Al Maryah Island, Abu Dhabi",
      status: "ACTIVE",
    },
  });
  assert(!!branch2, "Branch 2 created successfully for isolation tests");

  const employee = await prisma.employee.create({
    data: {
      organizationId: org!.id,
      branchId: branch1.id,
      employeeCode: "TEST-EFST-001",
      nameAr: "أحمد الشيف التنفيذي",
      nameEn: "Ahmad Executive Chef",
      jobTitle: "Head Chef",
      joiningDate: new Date(),
      status: "ACTIVE",
    },
  });
  assert(!!employee, "Food handler employee created successfully");

  // Step 4: Create ADAFSA Regulatory Inspection
  console.log("\n--- STEP 4: RECORDING OFFICIAL ADAFSA INSPECTION ---");
  const inspectionDate = new Date();
  const inspection = await prisma.foodSafetyInspection.create({
    data: {
      organizationId: org!.id,
      branchId: branch1.id,
      authority: "ADAFSA",
      inspectionType: "ROUTINE",
      referenceNumber: "ADAFSA-INS-2026-091",
      inspectorName: "Inspector Al Mansouri (ADAFSA Food Safety Division)",
      inspectionDate,
      score: 75.0,
      overallResult: "NEEDS_IMPROVEMENT",
      status: "IN_PROGRESS",
      notes: "Official scheduled routine inspection pursuant to Regulation (6)/2020",
    },
  });
  assert(!!inspection, "ADAFSA Inspection created with official reference");

  await writeAuditLog({
    organizationId: org!.id,
    branchId: branch1.id,
    actorUserId: owner!.id,
    actorNameSnapshot: owner!.name,
    action: "INSPECTION_CREATED",
    module: "COMPLIANCE",
    entityType: "REGULATORY_INSPECTION",
    entityId: inspection.id,
    entityDisplayName: `ADAFSA Inspection #${inspection.referenceNumber}`,
    metadata: { authority: "ADAFSA", overallResult: inspection.overallResult },
  });

  // Step 5: Create Inspection Finding & Corrective Action
  console.log("\n--- STEP 5: CREATING FINDING & CORRECTIVE ACTION ---");
  const dueDate = new Date(Date.now() + 48 * 3600 * 1000); // 48 hours
  const finding = await prisma.foodSafetyFinding.create({
    data: {
      inspectionId: inspection.id,
      branchId: branch1.id,
      findingNumber: "FINDING-ADAFSA-001",
      category: "Temperature Control",
      section: "Food Storage & Equipment",
      question: "Are cold food storage temperatures maintained <= 4°C?",
      severity: "MAJOR",
      description: "Walk-in cold storage unit 2 operating at 7.2°C, exceeding ADAFSA statutory threshold (<= 4°C)",
      correctiveAction: "Service refrigeration compressor, recalibrate digital sensor, and log hourly temperatures",
      assignedTo: employee.nameEn,
      dueDate,
      status: "OPEN",
    },
  });
  assert(!!finding, "Inspection Finding created and linked to Inspection");

  await writeAuditLog({
    organizationId: org!.id,
    branchId: branch1.id,
    actorUserId: owner!.id,
    actorNameSnapshot: owner!.name,
    action: "FINDING_CREATED",
    module: "COMPLIANCE",
    entityType: "INSPECTION_FINDING",
    entityId: finding.id,
    entityDisplayName: finding.findingNumber,
    metadata: { severity: finding.severity, dueDate },
  });

  const correctiveAction = await prisma.correctiveAction.create({
    data: {
      organizationId: org!.id,
      branchId: branch1.id,
      findingId: finding.id,
      title: "Walk-in Chiller Compressor Overhaul and Recalibration",
      description: "Refrigeration vendor emergency maintenance and hourly audit log",
      severity: "MAJOR",
      actionRequired: "Vendor maintenance completion certificate and verified log at <= 4°C",
      assignedTo: employee.nameEn,
      dueDate,
      status: "OPEN",
    },
  });
  assert(!!correctiveAction, "Corrective Action created and linked to Finding");

  await writeAuditLog({
    organizationId: org!.id,
    branchId: branch1.id,
    actorUserId: owner!.id,
    actorNameSnapshot: owner!.name,
    action: "CORRECTIVE_ACTION_CREATED",
    module: "COMPLIANCE",
    entityType: "CORRECTIVE_ACTION",
    entityId: correctiveAction.id,
    entityDisplayName: correctiveAction.title,
    metadata: { dueDate },
  });

  // Step 6: EFST Training & PDF Certificate Verification
  console.log("\n--- STEP 6: EFST TRAINING & SECURE PDF STORAGE ---");
  const samplePdfBytes = Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n" +
      "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n" +
      "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n" +
      "xref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n" +
      "trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n180\n%%EOF"
  );

  const isValidPdf = validatePdfBytes(samplePdfBytes);
  const efstDocType = await prisma.documentType.findFirst({
    where: { organizationId: org!.id, nameEn: "EFST Training Certificate" },
  });
  assert(!!efstDocType, "EFST Training Certificate document type exists");

  // Create linked Document for in-browser viewer
  const efstDoc = await prisma.document.create({
    data: {
      organizationId: org!.id,
      branchId: branch1.id,
      employeeId: employee.id,
      documentTypeId: efstDocType!.id,
      entityType: "EMPLOYEE",
      title: "ADAFSA Essential Food Safety Training (EFST) Certificate",
      status: "ACTIVE",
      expiryDate: new Date(Date.now() + 365 * 24 * 3600 * 1000), // 1 year validity
      createdBy: owner!.name,
    },
  });
  assert(!!efstDoc, "Document record created for in-browser PDF viewer");

  const stored = await saveDocumentFile(org!.id, efstDoc.id, 1, samplePdfBytes);
  assert(!!stored.storageKey, "Certificate saved to secure storage with unique key");

  const docVersion = await prisma.documentVersion.create({
    data: {
      documentId: efstDoc.id,
      versionNumber: 1,
      originalFilename: "efst-cert-ahmad.pdf",
      storageKey: stored.storageKey,
      mimeType: "application/pdf",
      sizeBytes: stored.sizeBytes,
      sha256: stored.sha256,
      uploadedBy: owner!.name,
    },
  });

  await prisma.document.update({
    where: { id: efstDoc.id },
    data: { currentVersionId: docVersion.id },
  });

  const training = await prisma.foodHandlerTraining.create({
    data: {
      organizationId: org!.id,
      employeeId: employee.id,
      branchId: branch1.id,
      program: "ADAFSA Essential Food Safety Training (EFST)",
      trainingCategory: "FOOD_HANDLER_GENERAL",
      trainingType: "EFST",
      provider: "ADAFSA Approved Center - Abu Dhabi",
      certificateNumber: "EFST-AD-2026-88741",
      trainingDate: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      score: 95.0,
      status: "COMPLETED",
      certificateDocumentId: efstDoc.id,
      certificateStorageKey: stored.storageKey,
      verificationStatus: "VERIFIED",
    },
  });
  assert(!!training, "FoodHandlerTraining EFST record linked to real Employee & Document");

  await writeAuditLog({
    organizationId: org!.id,
    branchId: branch1.id,
    actorUserId: owner!.id,
    actorNameSnapshot: owner!.name,
    action: "EFST_RECORD_CREATED",
    module: "COMPLIANCE",
    entityType: "FOOD_HANDLER_TRAINING",
    entityId: training.id,
    entityDisplayName: `${employee.nameEn} - EFST #${training.certificateNumber}`,
    metadata: { score: 95.0, certificateNumber: training.certificateNumber },
  });

  // Step 7: Record Operational Food Safety Log & Traceability
  console.log("\n--- STEP 7: FOOD SAFETY OPERATIONAL CHECKS & TRACEABILITY ---");
  const tempLog = await prisma.foodSafetyLog.create({
    data: {
      organizationId: org!.id,
      branchId: branch1.id,
      logType: "TEMPERATURE",
      controlPoint: "Walk-in Chiller #1 - Dairy & Prepared Foods",
      parameter: "Internal Core Temperature (°C)",
      measuredValue: "3.1 °C",
      targetRange: "0°C - 4°C",
      isCompliant: true,
      recordedBy: employee.nameEn,
      notes: "Post-maintenance verification reading within statutory <= 4°C limit",
    },
  });
  assert(!!tempLog && tempLog.isCompliant, "Temperature log recorded within statutory limit");

  const traceability = await prisma.traceabilityRecord.create({
    data: {
      organizationId: org!.id,
      branchId: branch1.id,
      batchLotNumber: "LOT-AD-2026-0928-C1",
      productName: "Chilled Grade A Chicken Breast (Halal)",
      supplierName: "Al Ain Farms Poultry Division",
      quantityReceived: 50,
      receivedDate: new Date(),
      expiryDate: new Date(Date.now() + 5 * 24 * 3600 * 1000),
      storageLocation: "Chiller #1",
      recallStatus: "NONE",
      status: "ACTIVE",
    },
  });
  assert(!!traceability, "Traceability lot record recorded with supplier and expiry tracking");

  // Step 8: Close Corrective Action with Resolution Notes
  console.log("\n--- STEP 8: CLOSING CORRECTIVE ACTION & RESOLVING FINDING ---");
  const closedAction = await prisma.correctiveAction.update({
    where: { id: correctiveAction.id },
    data: {
      status: "CLOSED",
      resolutionNotes: "Vendor replacement of thermostat relay completed; 24h temperature data logger confirms stable 3.1°C.",
      resolvedAt: new Date(),
      closedAt: new Date(),
      closedBy: owner!.name,
    },
  });
  assert(closedAction.status === "CLOSED", "Corrective Action status marked CLOSED");

  // Auto-resolve finding
  const resolvedFinding = await prisma.foodSafetyFinding.update({
    where: { id: finding.id },
    data: {
      status: "RESOLVED",
      closedAt: new Date(),
    },
  });
  assert(resolvedFinding.status === "RESOLVED", "Inspection Finding status updated to RESOLVED");

  await writeAuditLog({
    organizationId: org!.id,
    branchId: branch1.id,
    actorUserId: owner!.id,
    actorNameSnapshot: owner!.name,
    action: "CORRECTIVE_ACTION_CLOSED",
    module: "COMPLIANCE",
    entityType: "CORRECTIVE_ACTION",
    entityId: closedAction.id,
    entityDisplayName: closedAction.title,
    metadata: { resolutionNotes: closedAction.resolutionNotes },
  });

  // Step 9: Verify Real Database Aggregation & No Fake 100%
  console.log("\n--- STEP 9: DATABASE AGGREGATE CALCULATIONS ---");
  const totalHandlers = await prisma.employee.count({
    where: { organizationId: org!.id, status: "ACTIVE" },
  });
  const certifiedHandlers = await prisma.foodHandlerTraining.count({
    where: {
      branchId: branch1.id,
      status: "COMPLETED",
      trainingType: "EFST",
    },
  });
  const efstCoverage = totalHandlers > 0 ? Math.round((certifiedHandlers / totalHandlers) * 100) : 0;
  assert(efstCoverage === 100, `EFST coverage calculated from real DB ratio: ${certifiedHandlers}/${totalHandlers} (${efstCoverage}%)`);

  const activeOpenFindings = await prisma.foodSafetyFinding.count({
    where: {
      branchId: branch1.id,
      status: { in: ["OPEN", "IN_PROGRESS", "OVERDUE"] },
    },
  });
  assert(activeOpenFindings === 0, "Open findings correctly down to 0 after resolution");

  const openActions = await prisma.correctiveAction.count({
    where: {
      branchId: branch1.id,
      status: { in: ["OPEN", "IN_PROGRESS", "OVERDUE"] },
    },
  });
  assert(openActions === 0, "Open corrective actions correctly down to 0 after closure");

  // Step 10: Strict Branch Isolation
  console.log("\n--- STEP 10: BRANCH ISOLATION VERIFICATION ---");
  const branch2Inspections = await prisma.foodSafetyInspection.count({
    where: { branchId: branch2.id },
  });
  assert(branch2Inspections === 0, "Branch 2 has 0 inspections (Branch 1 records not leaked to Branch 2)");

  const branch2Logs = await prisma.foodSafetyLog.count({
    where: { branchId: branch2.id },
  });
  assert(branch2Logs === 0, "Branch 2 has 0 logs (Branch 1 logs isolated)");

  // Step 11: Audit Trail & HMAC Chain Integrity
  console.log("\n--- STEP 11: AUDIT TRAIL & HMAC INTEGRITY CHECK ---");
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      organizationId: org!.id,
      module: "COMPLIANCE",
    },
    orderBy: { occurredAt: "desc" },
    take: 10,
  });
  assert(auditLogs.length >= 4, `Found ${auditLogs.length} audit logs for compliance actions`);

  const actionsLogged = auditLogs.map((a) => a.action);
  assert(actionsLogged.includes("INSPECTION_CREATED"), "INSPECTION_CREATED present in audit trail");
  assert(actionsLogged.includes("FINDING_CREATED"), "FINDING_CREATED present in audit trail");
  assert(actionsLogged.includes("CORRECTIVE_ACTION_CREATED"), "CORRECTIVE_ACTION_CREATED present in audit trail");
  assert(actionsLogged.includes("CORRECTIVE_ACTION_CLOSED"), "CORRECTIVE_ACTION_CLOSED present in audit trail");

  const isChainValid = await verifyAuditChain(org!.id);
  assert(isChainValid.valid, "AuditLog cryptographic HMAC chain is intact and fully verified");

  console.log("\n====================================================");
  console.log("🎉 ALL ADAFSA REGULATORY COMPLIANCE TESTS PASSED!");
  console.log("====================================================\n");
}

runComplianceRegulatoryTests()
  .catch((e) => {
    console.error("Test execution failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
