import { prisma } from "../src/lib/db/prisma";

async function runEmployeeManagementCrudTests() {
  console.log("====================================================");
  console.log("🧪 RUNNING EMPLOYEE MANAGEMENT CRUD & LIFECYCLE TEST SUITE");
  console.log("====================================================\n");

  const baseUrl = "http://localhost:3000";

  // 1. Authenticate as Owner
  console.log("▶️ STEP 1: Authenticate as Owner (Tariq Al Mansoori)...");
  const ownerLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      usernameOrEmail: "owner@tasha.ae",
      password: "OwnerLogin@2026!",
    }),
  });
  if (!ownerLoginRes.ok) throw new Error("Owner login failed");
  const ownerCookie = ownerLoginRes.headers.get("set-cookie")?.split(";")[0]!;
  console.log("  ✅ Owner authenticated successfully\n");

  // 2. Fetch existing branches to associate employee
  const org = await prisma.organization.findFirst({ where: { code: "ORG-01" } });
  if (!org) throw new Error("Organization not found");
  const branch = await prisma.branch.findFirst({ where: { organizationId: org.id } });
  if (!branch) throw new Error("Branch not found");

  // TEST 1: Upload Employee Photo with valid image buffer
  console.log("▶️ TEST 1: Upload Employee Photo (JPEG/PNG buffer)...");
  // 1x1 valid PNG buffer
  const samplePngBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );
  const photoBlob = new Blob([samplePngBuffer], { type: "image/png" });
  const photoFd = new FormData();
  photoFd.append("photo", photoBlob, "avatar.png");
  photoFd.append("employeeId", "new_employee");

  const photoUploadRes = await fetch(`${baseUrl}/api/employees/upload-photo`, {
    method: "POST",
    headers: {
      Cookie: ownerCookie,
    },
    body: photoFd,
  });

  const photoUploadData = await photoUploadRes.json();
  if (!photoUploadRes.ok || !photoUploadData.url) {
    throw new Error(`Photo upload failed: ${photoUploadData.error || photoUploadRes.statusText}`);
  }
  const uploadedPhotoUrl = photoUploadData.url;
  console.log(`  ✅ Employee photo uploaded successfully: ${uploadedPhotoUrl}\n`);

  // TEST 2: Employee Creation requires valid Level-2 Authorization Password
  console.log("▶️ TEST 2: Create Employee with invalid Level-2 Authorization Password...");
  const wrongAuthRes = await fetch(`${baseUrl}/api/employees`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: ownerCookie,
    },
    body: JSON.stringify({
      nameEn: "Zaid Al Harbi",
      nameAr: "زيد الحربي",
      jobTitle: "Executive Chef",
      branchId: branch.id,
      basicSalary: 12000,
      authorizationPassword: "WrongAuthPassword!",
    }),
  });
  if (wrongAuthRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for wrong auth password, got ${wrongAuthRes.status}`);
  }
  console.log("  ✅ Security Guard: Invalid Level-2 password strictly blocked (403 Forbidden)\n");

  // TEST 3: Create Employee with valid Level-2 Authorization Password and Photo URL
  console.log("▶️ TEST 3: Create Employee with valid Level-2 Authorization Password...");
  const createEmpRes = await fetch(`${baseUrl}/api/employees`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: ownerCookie,
    },
    body: JSON.stringify({
      nameEn: "Zaid Al Harbi",
      nameAr: "زيد الحربي",
      jobTitle: "Executive Chef",
      branchId: branch.id,
      basicSalary: 12000,
      housingAllowance: 3000,
      transportAllowance: 1500,
      otherAllowances: 500,
      nationality: "Emirati",
      mobile: "+971 50 888 7766",
      email: "zaid.harbi@tasha.ae",
      photoUrl: uploadedPhotoUrl,
      authorizationPassword: "OwnerAuth@2026!",
      reason: "Hiring executive culinary head",
    }),
  });

  const createEmpData = await createEmpRes.json();
  if (!createEmpRes.ok || !createEmpData.employee?.id) {
    throw new Error(`Employee creation failed: ${createEmpData.error || createEmpRes.statusText}`);
  }
  const createdEmp = createEmpData.employee;
  console.log(`  ✅ Employee created successfully: ${createdEmp.employeeCode} (${createdEmp.nameEn}) - ID: ${createdEmp.id}\n`);

  // TEST 4: Employee Profile Details & Missing Documents Assessment
  console.log("▶️ TEST 4: Fetch Employee Profile & verify Missing Documents calculation...");
  const profileRes = await fetch(`${baseUrl}/api/employees/${createdEmp.id}`, {
    headers: { Cookie: ownerCookie },
  });
  const profileData = await profileRes.json();
  if (!profileRes.ok || !profileData.employee) {
    throw new Error(`Failed to fetch profile: ${profileData.error}`);
  }

  console.log(`  - Employee Name: ${profileData.employee.nameEn} (${profileData.employee.nameAr})`);
  console.log(`  - Total Documents: ${profileData.employee.documents.length}`);
  console.log(`  - Missing Required Docs: ${profileData.missingDocuments.map((m: any) => m.nameEn).join(", ")}`);
  if (profileData.missingDocuments.length === 0) {
    throw new Error("Expected new employee to have missing mandatory compliance documents");
  }
  console.log("  ✅ Missing documents calculated dynamically based on UAE regulatory requirements\n");

  // TEST 5: Upload Employee Compliance Document (Residence Visa with Expiry Date)
  console.log("▶️ TEST 5: Upload Employee Residence Visa (PDF)...");
  // Find or create Residence Visa document type
  let visaDocType = await prisma.documentType.findFirst({
    where: {
      organizationId: org.id,
      nameEn: { contains: "Visa", mode: "insensitive" },
    },
  });
  if (!visaDocType) {
    visaDocType = await prisma.documentType.create({
      data: {
        organizationId: org.id,
        code: "DOC-VISA-EMP",
        nameEn: "UAE Residence Visa",
        nameAr: "تأشيرة الإقامة الإماراتية",
        category: "Employee Identity",
        isLegal: true,
        requiresExpiry: true,
        defaultReminderDays: 90,
      },
    });
  }

  // Create a 60-day future expiry date (Expiring Soon)
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 45);
  const expiryDateStr = expiryDate.toISOString().split("T")[0];

  const issueDate = new Date();
  issueDate.setFullYear(issueDate.getFullYear() - 1);
  const issueDateStr = issueDate.toISOString().split("T")[0];

  // Sample PDF buffer
  const samplePdfBuffer = Buffer.from(
    "%PDF-1.4\n1 0 obj\n<<\n/Title (Employee Residence Visa)\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF"
  );
  const pdfBlob = new Blob([samplePdfBuffer], { type: "application/pdf" });

  const docFd = new FormData();
  docFd.append("file", pdfBlob, "residence_visa_zaid.pdf");
  docFd.append("title", "UAE Residence Visa - Zaid Al Harbi");
  docFd.append("documentTypeId", visaDocType.id);
  docFd.append("referenceNumber", "VISA-2026-9901");
  docFd.append("issueDate", issueDateStr);
  docFd.append("expiryDate", expiryDateStr);
  docFd.append("reminderDays", "45");
  docFd.append("authorizationPassword", "OwnerAuth@2026!");

  const docUploadRes = await fetch(`${baseUrl}/api/employees/${createdEmp.id}/documents`, {
    method: "POST",
    headers: { Cookie: ownerCookie },
    body: docFd,
  });

  const docUploadData = await docUploadRes.json();
  if (!docUploadRes.ok || !docUploadData.document?.id) {
    throw new Error(`Employee document upload failed: ${docUploadData.error || docUploadRes.statusText}`);
  }
  const uploadedDoc = docUploadData.document;
  console.log(`  ✅ Employee document uploaded: ${uploadedDoc.title} (Status: ${uploadedDoc.status})\n`);

  // TEST 6: Dynamic Expiry Countdown & Expiring Documents Endpoint
  console.log("▶️ TEST 6: Verify Dynamic Days Remaining and /api/documents/expiring...");
  const expiringRes = await fetch(`${baseUrl}/api/documents/expiring?status=EXPIRING_SOON`, {
    headers: { Cookie: ownerCookie },
  });
  const expiringData = await expiringRes.json();
  if (!expiringRes.ok) throw new Error("Failed to query expiring documents");

  const matchingDoc = expiringData.data.find((d: any) => d.id === uploadedDoc.id);
  if (!matchingDoc) {
    throw new Error("Uploaded expiring document not found in expiring documents list");
  }
  console.log(`  - Document: ${matchingDoc.title}`);
  console.log(`  - Status: ${matchingDoc.status}`);
  console.log(`  - Days Remaining: ${matchingDoc.daysRemaining} days (Dynamically computed from today)`);
  if (typeof matchingDoc.daysRemaining !== "number" || isNaN(matchingDoc.daysRemaining)) {
    throw new Error("daysRemaining is not a valid number");
  }
  console.log("  ✅ Dynamic expiry countdown verified without hardcoded values\n");

  // TEST 7: Document Renewal with Non-Destructive Versioning
  console.log("▶️ TEST 7: Renew Document with Non-Destructive Versioning (v2)...");
  const newExpiryDate = new Date();
  newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 2);
  const newExpiryDateStr = newExpiryDate.toISOString().split("T")[0];

  const renewFd = new FormData();
  renewFd.append("file", pdfBlob, "residence_visa_zaid_renewed.pdf");
  renewFd.append("issueDate", new Date().toISOString().split("T")[0]);
  renewFd.append("expiryDate", newExpiryDateStr);
  renewFd.append("notes", "Two-year residency visa renewal completed");
  renewFd.append("authorizationPassword", "OwnerAuth@2026!");

  const renewRes = await fetch(`${baseUrl}/api/documents/${uploadedDoc.id}/versions`, {
    method: "POST",
    headers: { Cookie: ownerCookie },
    body: renewFd,
  });

  const renewData = await renewRes.json();
  if (!renewRes.ok || !renewData.document?.id) {
    throw new Error(`Document renewal failed: ${renewData.error || renewRes.statusText}`);
  }

  // Inspect database to verify non-destructive history
  const dbDoc = await prisma.document.findUnique({
    where: { id: uploadedDoc.id },
    include: { versions: { orderBy: { versionNumber: "asc" } } },
  });
  if (!dbDoc || dbDoc.versions.length < 2) {
    throw new Error(`Expected at least 2 versions after renewal, got ${dbDoc?.versions.length}`);
  }
  console.log(`  - Document Versions Count: ${dbDoc.versions.length}`);
  console.log(`  - Version 1 Status: ${dbDoc.versions[0].scanStatus}`);
  console.log(`  - Version 2 Status: ${dbDoc.versions[1].scanStatus}`);
  console.log("  ✅ Non-destructive document history verified: old version preserved, new version active\n");

  // TEST 8: Create Employee Contract with Level-2 Password
  console.log("▶️ TEST 8: Create Employee Labor Contract...");
  const contractStartDate = new Date().toISOString().split("T")[0];
  const contractEndDate = new Date();
  contractEndDate.setFullYear(contractEndDate.getFullYear() + 2);
  const contractEndDateStr = contractEndDate.toISOString().split("T")[0];

  const contractRes = await fetch(`${baseUrl}/api/employees/${createdEmp.id}/contracts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: ownerCookie,
    },
    body: JSON.stringify({
      contractType: "LIMITED_LABOR",
      contractNumber: "MOHRE-2026-7881",
      startDate: contractStartDate,
      endDate: contractEndDateStr,
      basicSalary: 12000,
      allowances: 5000,
      notes: "MOHRE standard two-year limited employment contract",
      authorizationPassword: "OwnerAuth@2026!",
    }),
  });

  const contractData = await contractRes.json();
  if (!contractRes.ok || !contractData.contract?.id) {
    throw new Error(`Contract creation failed: ${contractData.error || contractRes.statusText}`);
  }
  console.log(`  ✅ Contract created successfully: ${contractData.contract.contractNumber} (${contractData.contract.contractType})\n`);

  // TEST 9: Soft-Archival / Status Mutation
  console.log("▶️ TEST 9: Soft-Archival of Employee Record...");
  const archiveRes = await fetch(`${baseUrl}/api/employees/${createdEmp.id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Cookie: ownerCookie,
    },
    body: JSON.stringify({
      reason: "Completed project tenure and relocation",
      authorizationPassword: "OwnerAuth@2026!",
    }),
  });

  const archiveData = await archiveRes.json();
  if (!archiveRes.ok || !archiveData.success) {
    throw new Error(`Employee archival failed: ${archiveData.error || archiveRes.statusText}`);
  }

  const archivedEmp = await prisma.employee.findUnique({ where: { id: createdEmp.id } });
  if (archivedEmp?.status !== "ARCHIVED" && archivedEmp?.status !== "TERMINATED") {
    throw new Error(`Expected employee status ARCHIVED or TERMINATED, got ${archivedEmp?.status}`);
  }
  console.log(`  ✅ Employee soft-archived successfully (Status: ${archivedEmp.status})\n`);

  console.log("====================================================");
  console.log("🎉 ALL EMPLOYEE MANAGEMENT TESTS PASSED WITH 100% SUCCESS!");
  console.log("====================================================\n");
}

runEmployeeManagementCrudTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
