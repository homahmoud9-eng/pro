import { prisma } from "../src/lib/db/prisma";
import crypto from "crypto";

async function runBranchCrudTests() {
  console.log("====================================================");
  console.log("🧪 RUNNING BRANCH MANAGEMENT CRUD & SECURITY TEST SUITE");
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

  // 2. Authenticate as Branch Manager (restricted to BR-01)
  console.log("▶️ STEP 2: Authenticate as Branch Manager (Mahmoud Al Nuaimi)...");
  const bmLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      usernameOrEmail: "bmbateen",
      password: "BranchMgr@2026!",
    }),
  });
  if (!bmLoginRes.ok) throw new Error("Branch manager login failed");
  const bmCookie = bmLoginRes.headers.get("set-cookie")?.split(";")[0]!;
  console.log("  ✅ Branch Manager authenticated successfully\n");

  // TEST 1: User without CREATE_BRANCH permission -> strictly rejected (403)
  console.log("▶️ TEST 1: User without CREATE_BRANCH permission cannot create branch...");
  const unauthCreateRes = await fetch(`${baseUrl}/api/business/branches`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: bmCookie,
    },
    body: JSON.stringify({
      code: "BR-99",
      nameEn: "Unauthorized Branch",
      nameAr: "فرع غير مصرح",
      authorizationPassword: "BranchAuth@2026!",
    }),
  });
  if (unauthCreateRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for user without CREATE_BRANCH, got ${unauthCreateRes.status}`);
  }
  console.log("  ✅ Security Guard: User without CREATE_BRANCH strictly blocked (403 Forbidden)\n");

  // TEST 2: User with CREATE_BRANCH but WRONG Authorization Password -> strictly rejected (403)
  console.log("▶️ TEST 2: CREATE_BRANCH with incorrect Authorization Password...");
  const wrongAuthRes = await fetch(`${baseUrl}/api/business/branches`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: ownerCookie,
    },
    body: JSON.stringify({
      code: "BR-99",
      nameEn: "Failed Auth Branch",
      nameAr: "فرع فشل المصادقة",
      authorizationPassword: "WrongPassword999!",
    }),
  });
  if (wrongAuthRes.status !== 403) {
    throw new Error(`Expected 403 for wrong authorization password, got ${wrongAuthRes.status}`);
  }
  console.log("  ✅ Security Guard: Wrong authorization password strictly rejected (403 Forbidden)\n");

  const org = await prisma.organization.findFirst({ where: { code: "ORG-01" } });
  const existingCodes = (await prisma.branch.findMany({ where: { organizationId: org!.id }, select: { code: true } })).map(b => b.code);
  let branchNum = 4;
  while (existingCodes.includes(`BR-${String(branchNum).padStart(2, "0")}`)) {
    branchNum++;
  }
  const testBranchCode = `BR-${String(branchNum).padStart(2, "0")}`;

  // TEST 3: User with CREATE_BRANCH + correct Authorization Password -> Branch Created (201)
  console.log(`▶️ TEST 3: Create Branch ${testBranchCode} with valid authorization password...`);
  const createRes = await fetch(`${baseUrl}/api/business/branches`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: ownerCookie,
    },
    body: JSON.stringify({
      code: testBranchCode,
      nameEn: "Al Maryah Island Flagship",
      nameAr: "فرع جزيرة المارية الرئيسي",
      type: "RESTAURANT",
      status: "ACTIVE",
      address: "The Galleria Mall, Level 1, Al Maryah Island",
      addressAr: "الغاليريا مول، الطابق الأول، جزيرة المارية",
      phone: "+971 2 642 9004",
      email: "maryah@tasha.ae",
      managerName: "Tariq Al Qasimi",
      openingDate: "2026-04-01",
      openingHours: "09:00 AM - 01:00 AM",
      notes: "Luxury dining outlet licensed by ADDED and ADAFSA.",
      authorizationPassword: "OwnerAuth@2026!",
    }),
  });
  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(`Create branch failed: ${JSON.stringify(err)}`);
  }
  const createData = await createRes.json();
  const createdBranch = createData.branch;
  console.log(`  ✅ Branch ${testBranchCode} successfully created in database: ${createdBranch.nameEn}`);
  console.log(`  ✅ Initial Documents count: ${createdBranch.docStats?.total || 0} (Starts empty)`);
  if ((createdBranch.docStats?.total || 0) !== 0) {
    throw new Error("New branch should start with 0 documents");
  }
  console.log("✨ PASSED\n");

  // TEST 4: Branch Code Uniqueness check
  console.log(`▶️ TEST 4: Branch Code uniqueness validation (Duplicate ${testBranchCode})...`);
  const dupRes = await fetch(`${baseUrl}/api/business/branches`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: ownerCookie,
    },
    body: JSON.stringify({
      code: testBranchCode,
      nameEn: "Duplicate Maryah",
      nameAr: "فرع مكرر",
      authorizationPassword: "OwnerAuth@2026!",
    }),
  });
  if (dupRes.status !== 400) {
    throw new Error(`Expected 400 Bad Request for duplicate branch code, got ${dupRes.status}`);
  }
  const dupData = await dupRes.json();
  console.log(`  ✅ Duplicate Code Rejected: ${dupData.error}`);
  console.log("✨ PASSED\n");

  // TEST 5: User without EDIT_BRANCH permission -> cannot edit
  console.log("▶️ TEST 5: Unauthorized edit attempt...");
  const unauthEditRes = await fetch(`${baseUrl}/api/business/branches/${createdBranch.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: bmCookie,
    },
    body: JSON.stringify({
      nameEn: "Hacked Branch",
      authorizationPassword: "BranchAuth@2026!",
    }),
  });
  if (unauthEditRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for unauthorized edit, got ${unauthEditRes.status}`);
  }
  console.log("  ✅ Security Guard: Unauthorized edit blocked (403 Forbidden)\n");

  // TEST 6: Sensitive Branch Edit with correct Authorization Password
  console.log("▶️ TEST 6: Authorized branch edit with Authorization Password...");
  const editRes = await fetch(`${baseUrl}/api/business/branches/${createdBranch.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: ownerCookie,
    },
    body: JSON.stringify({
      nameEn: "Al Maryah Waterfront Luxury Flagship",
      managerName: "Omar Al Suwaidi",
      phone: "+971 2 642 9005",
      authorizationPassword: "OwnerAuth@2026!",
    }),
  });
  if (!editRes.ok) {
    const err = await editRes.json();
    throw new Error(`Edit branch failed: ${JSON.stringify(err)}`);
  }
  const editData = await editRes.json();
  console.log(`  ✅ Branch updated: ${editData.branch.nameEn}`);
  console.log(`  ✅ Manager updated: ${editData.branch.managerName}`);
  console.log("✨ PASSED\n");

  // TEST 7: Archive Branch (Soft Deletion / Archival preserving historical records)
  console.log("▶️ TEST 7: Archive Branch (Soft Archival)...");
  const archiveRes = await fetch(`${baseUrl}/api/business/branches/${createdBranch.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: ownerCookie,
    },
    body: JSON.stringify({
      status: "ARCHIVED",
      authorizationPassword: "OwnerAuth@2026!",
    }),
  });
  if (!archiveRes.ok) {
    const err = await archiveRes.json();
    throw new Error(`Archive branch failed: ${JSON.stringify(err)}`);
  }
  const archiveData = await archiveRes.json();
  if (archiveData.branch.status !== "ARCHIVED") {
    throw new Error("Branch status should be ARCHIVED");
  }
  console.log(`  ✅ Branch status changed to ARCHIVED: ${archiveData.branch.status}`);

  // Verify branch remains in database and is not deleted
  const checkDb = await prisma.branch.findUnique({ where: { id: createdBranch.id } });
  if (!checkDb) throw new Error("Branch was permanently deleted from DB! Must remain intact.");
  console.log("  ✅ Non-Destructive Integrity Verified: Branch remains intact in database.");
  console.log("✨ PASSED\n");

  // TEST 8: Reactivate Archived Branch
  console.log("▶️ TEST 8: Reactivate Archived Branch...");
  const reactivateRes = await fetch(`${baseUrl}/api/business/branches/${createdBranch.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: ownerCookie,
    },
    body: JSON.stringify({
      status: "ACTIVE",
      authorizationPassword: "OwnerAuth@2026!",
    }),
  });
  if (!reactivateRes.ok) {
    const err = await reactivateRes.json();
    throw new Error(`Reactivate branch failed: ${JSON.stringify(err)}`);
  }
  const reactivateData = await reactivateRes.json();
  if (reactivateData.branch.status !== "ACTIVE") {
    throw new Error("Branch status should be ACTIVE after reactivation");
  }
  console.log(`  ✅ Branch reactivated to ACTIVE: ${reactivateData.branch.status}`);
  console.log("✨ PASSED\n");

  // TEST 9: Dedicated Branch Documents Page (/business/branches/[branchId]/documents) & Upload
  console.log("▶️ TEST 9: Branch Document Upload & Verification...");
  const docType = await prisma.documentType.findFirst({
    where: { organizationId: org!.id, nameEn: "Trade License" },
  });
  if (!docType) throw new Error("Trade License docType not found");

  const pdfBuffer = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");
  const blob = new Blob([pdfBuffer], { type: "application/pdf" });
  const fd = new FormData();
  fd.append("file", blob, "al_maryah_license_2026.pdf");
  fd.append("title", "Al Maryah Branch Trade License 2026");
  fd.append("documentTypeId", docType.id);
  fd.append("entityType", "BRANCH");
  fd.append("entityId", createdBranch.id);
  fd.append("branchId", createdBranch.id);
  fd.append("referenceNumber", "CN-2026-MARYAH");
  fd.append("authorizationPassword", "OwnerAuth@2026!");

  const uploadRes = await fetch(`${baseUrl}/api/documents`, {
    method: "POST",
    headers: {
      Cookie: ownerCookie,
    },
    body: fd,
  });
  if (!uploadRes.ok) {
    const err = await uploadRes.json();
    throw new Error(`Document upload failed: ${JSON.stringify(err)}`);
  }
  const uploadData = await uploadRes.json();
  console.log(`  ✅ Branch Document uploaded: ${uploadData.document.title}`);
  console.log(`  ✅ Document linked to Branch: ${uploadData.document.branchId}`);

  // Verify branch document count updated to 1
  const detailRes = await fetch(`${baseUrl}/api/business/branches/${createdBranch.id}`, {
    headers: { Cookie: ownerCookie },
  });
  const detailData = await detailRes.json();
  console.log(`  ✅ Live Branch Document Count: ${detailData.metrics.totalDocuments} (Updated from 0 to 1)`);
  if (detailData.metrics.totalDocuments !== 1) {
    throw new Error(`Expected 1 document for branch, got ${detailData.metrics.totalDocuments}`);
  }
  console.log("✨ PASSED\n");

  // TEST 10: Verify Branch Isolation
  console.log("▶️ TEST 10: Branch Isolation Check...");
  const bateenBranch = await prisma.branch.findFirst({
    where: { organizationId: org!.id, code: "BR-01" },
  });
  const bateenDetailRes = await fetch(`${baseUrl}/api/business/branches/${bateenBranch!.id}`, {
    headers: { Cookie: ownerCookie },
  });
  const bateenData = await bateenDetailRes.json();
  const leakedDoc = bateenData.documents.find((d: any) => d.branchId === createdBranch.id);
  if (leakedDoc) {
    throw new Error(`Branch isolation failure! Al Maryah document found under Al Bateen: ${leakedDoc.title}`);
  }
  console.log("  ✅ Branch Isolation Confirmed: Documents strictly isolated per branch");
  console.log("✨ PASSED\n");

  // TEST 11: Verify Immutable Audit Log Entries for all actions
  console.log("▶️ TEST 11: Audit Trail Verification...");
  const branchLogs = await prisma.auditLog.findMany({
    where: { branchId: createdBranch.id },
    orderBy: { sequenceNumber: "asc" },
  });
  console.log(`  ✅ Found ${branchLogs.length} audit records for new branch:`);
  branchLogs.forEach((l) => {
    console.log(`     #${l.sequenceNumber}: [${l.action}] by ${l.actorNameSnapshot} - Hash: ${l.hash.substring(0, 16)}...`);
  });

  const actions = branchLogs.map((l) => l.action);
  if (!actions.includes("BRANCH_CREATED")) throw new Error("Missing BRANCH_CREATED audit event");
  if (!actions.includes("BRANCH_UPDATED")) throw new Error("Missing BRANCH_UPDATED audit event");
  if (!actions.includes("BRANCH_ARCHIVED")) throw new Error("Missing BRANCH_ARCHIVED audit event");
  if (!actions.includes("BRANCH_REACTIVATED")) throw new Error("Missing BRANCH_REACTIVATED audit event");

  // Verify HMAC audit chain integrity
  const verifyRes = await fetch(`${baseUrl}/api/audit/verify`, {
    method: "POST",
    headers: { Cookie: ownerCookie },
  });
  const verifyData = await verifyRes.json();
  console.log(`  ✅ Cryptographic HMAC Chain Integrity: ${verifyData.message}`);
  if (!verifyData.valid) throw new Error("Audit chain broken!");
  console.log("✨ PASSED\n");

  console.log("====================================================");
  console.log("🎉 ALL 11 BRANCH MANAGEMENT CRUD & SECURITY TESTS PASSED!");
  console.log("====================================================");
}

runBranchCrudTests().catch((err) => {
  console.error("💥 FAILED:", err);
  process.exit(1);
});
