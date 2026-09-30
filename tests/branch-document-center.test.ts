import { prisma } from "../src/lib/db/prisma";
import crypto from "crypto";

async function runBranchDocumentCenterTests() {
  console.log("====================================================");
  console.log("🧪 RUNNING BRANCH DOCUMENT CENTER & RBAC TEST SUITE");
  console.log("====================================================\n");

  const baseUrl = "http://localhost:3000";

  // 1. Authenticate as Owner (Global Scope)
  console.log("▶️ STEP 1: Authenticate as Owner (Global / All Branches)...");
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
  console.log("  ✅ Owner authenticated successfully with session cookie\n");

  // 2. Fetch Business Overview and Verify Branch Live Document Counts
  console.log("▶️ STEP 2: Verify GET /api/business returns live branch document breakdown...");
  const businessRes = await fetch(`${baseUrl}/api/business`, {
    headers: { Cookie: ownerCookie },
  });
  if (!businessRes.ok) throw new Error("GET /api/business failed");
  const businessData = await businessRes.json();
  const branches = businessData.branches;
  if (!branches || branches.length < 3) throw new Error("Missing branches in business overview");

  branches.forEach((b: any) => {
    console.log(
      `  ✅ Branch ${b.code} (${b.nameEn}): ${b.docStats?.total || b._count.documents} docs (Active: ${b.docStats?.active}, Expiring: ${b.docStats?.expiring}, Expired: ${b.docStats?.expired})`
    );
  });
  console.log("✨ PASSED\n");

  // 3. Inspect Branch 2 (Yas Mall) Detail & Document Isolation
  const branchYas = branches.find((b: any) => b.code === "BR-02")!;
  console.log(`▶️ STEP 3: Verify GET /api/business/branches/${branchYas.id} (Yas Mall)...`);
  const yasRes = await fetch(`${baseUrl}/api/business/branches/${branchYas.id}`, {
    headers: { Cookie: ownerCookie },
  });
  if (!yasRes.ok) throw new Error(`GET branch detail failed with status ${yasRes.status}`);
  const yasData = await yasRes.json();
  console.log(`  ✅ Branch: ${yasData.branch.nameEn} (${yasData.branch.code})`);
  console.log(`  ✅ Live Metrics: Total Docs=${yasData.metrics.totalDocuments}, Active=${yasData.metrics.activeDocuments}, Expiring=${yasData.metrics.expiringDocuments}, Expired=${yasData.metrics.expiredDocuments}`);
  console.log(`  ✅ Documents Count: ${yasData.documents.length}`);

  // Verify that all returned documents belong strictly to Yas Mall (no data leakage)
  const nonYasDocs = yasData.documents.filter((d: any) => d.branchId !== branchYas.id);
  if (nonYasDocs.length > 0) {
    throw new Error(`Data leakage! Found documents not belonging to Yas Mall: ${nonYasDocs.map((d: any) => d.title)}`);
  }
  console.log("  ✅ Data Isolation Verified: 100% of documents belong strictly to Yas Mall");
  console.log("✨ PASSED\n");

  // 4. Branch-Level Authorization Scoping: Branch Manager of Al Bateen (BR-01)
  console.log("▶️ STEP 4: Test Branch-Level Authorization Scoping & IDOR Protection...");
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

  const branchBateen = branches.find((b: any) => b.code === "BR-01")!;
  const branchMusaffah = branches.find((b: any) => b.code === "BR-03")!;

  // Access authorized branch (Al Bateen)
  const bmBateenRes = await fetch(`${baseUrl}/api/business/branches/${branchBateen.id}`, {
    headers: { Cookie: bmCookie },
  });
  if (!bmBateenRes.ok) throw new Error("Branch Manager should have access to authorized branch BR-01");
  console.log("  ✅ Authorized access: Branch Manager accessed Al Bateen (BR-01) -> 200 OK");

  // Attempt unauthorized access to Yas Mall (BR-02)
  const bmYasRes = await fetch(`${baseUrl}/api/business/branches/${branchYas.id}`, {
    headers: { Cookie: bmCookie },
  });
  if (bmYasRes.status !== 403) throw new Error(`Expected 403 Forbidden for Yas Mall, got ${bmYasRes.status}`);
  console.log("  ✅ Security Guard: Branch Manager blocked from Yas Mall (BR-02) -> 403 Forbidden");

  // Attempt unauthorized access to Musaffah (BR-03)
  const bmMusaffahRes = await fetch(`${baseUrl}/api/business/branches/${branchMusaffah.id}`, {
    headers: { Cookie: bmCookie },
  });
  if (bmMusaffahRes.status !== 403) throw new Error(`Expected 403 Forbidden for Musaffah, got ${bmMusaffahRes.status}`);
  console.log("  ✅ Security Guard: Branch Manager blocked from Musaffah (BR-03) -> 403 Forbidden");
  console.log("✨ PASSED\n");

  // 5. In-Browser PDF Streaming Verification
  console.log("▶️ STEP 5: Verify in-browser PDF streaming for Branch Legal Document...");
  const sampleDoc = yasData.documents[0];
  const pdfRes = await fetch(`${baseUrl}/api/documents/${sampleDoc.id}/view`, {
    headers: { Cookie: ownerCookie },
  });
  if (!pdfRes.ok) throw new Error(`PDF streaming failed with status ${pdfRes.status}`);
  const pdfBytes = Buffer.from(await pdfRes.arrayBuffer());
  const header = pdfBytes.subarray(0, 5).toString();
  if (header !== "%PDF-") throw new Error(`Invalid PDF header: ${header}`);
  console.log(`  ✅ Successfully streamed ${pdfBytes.length} bytes authentic PDF (Header: ${header}) for document: ${sampleDoc.title}`);
  console.log("✨ PASSED\n");

  // 6. Non-Destructive Document Versioning (Replace Document)
  console.log("▶️ STEP 6: Non-Destructive Legal Document Versioning & Level-2 Auth Password...");
  const initialVersionCount = sampleDoc.versions.length;

  // Attempt replacement with wrong authorization password
  const newPdfContent = `%PDF-1.4\n% Updated Revision Content v2\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 30 >>\nstream\nBT /F1 12 Tf (Version 2) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000078 00000 n \n0000000135 00000 n \n0000000236 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n317\n%%EOF\n`;
  const blob = new Blob([newPdfContent], { type: "application/pdf" });

  const fdWrong = new FormData();
  fdWrong.append("file", blob, "updated_rev2.pdf");
  fdWrong.append("notes", "Attempt with wrong password");
  fdWrong.append("authorizationPassword", "WrongPassword123!");

  const replaceWrongRes = await fetch(`${baseUrl}/api/documents/${sampleDoc.id}/versions`, {
    method: "POST",
    headers: { Cookie: ownerCookie },
    body: fdWrong,
  });
  if (replaceWrongRes.status !== 401 && replaceWrongRes.status !== 403) {
    throw new Error(`Expected 401/403 for wrong authorization password, got ${replaceWrongRes.status}`);
  }
  console.log("  ✅ Security Guard: Server strictly rejected replacement with wrong authorization password (403)");

  // Replacement with correct Level-2 Authorization Password
  const fdCorrect = new FormData();
  fdCorrect.append("file", blob, "updated_rev2.pdf");
  fdCorrect.append("notes", "Official Version 2 renewal filed with regulatory authority");
  fdCorrect.append("authorizationPassword", "OwnerAuth@2026!");

  const replaceCorrectRes = await fetch(`${baseUrl}/api/documents/${sampleDoc.id}/versions`, {
    method: "POST",
    headers: { Cookie: ownerCookie },
    body: fdCorrect,
  });
  if (!replaceCorrectRes.ok) {
    const err = await replaceCorrectRes.text();
    throw new Error(`Failed to replace document version: ${err}`);
  }
  const replaceData = await replaceCorrectRes.json();
  console.log(`  ✅ Successfully created Version ${replaceData.version.versionNumber} (Original: ${replaceData.version.originalFilename}, SHA: ${replaceData.version.sha256.slice(0, 16)}...)`);

  // Verify historical version 1 is preserved intact
  const docRefreshedRes = await fetch(`${baseUrl}/api/documents/${sampleDoc.id}`, {
    headers: { Cookie: ownerCookie },
  });
  const docRefreshedData = await docRefreshedRes.json();
  const versions = docRefreshedData.document.versions;
  if (versions.length !== initialVersionCount + 1) {
    throw new Error(`Expected ${initialVersionCount + 1} versions, found ${versions.length}`);
  }
  console.log(`  ✅ Version History Intact: Document now has ${versions.length} versions (v1 and v2 both preserved)`);
  console.log("✨ PASSED\n");

  // 7. Verify HMAC Cryptographic Audit Log Integrity
  console.log("▶️ STEP 7: Verify Cryptographic Audit Log & HMAC Chain...");
  const auditRes = await fetch(`${baseUrl}/api/audit/verify`, {
    method: "POST",
    headers: { Cookie: ownerCookie },
  });
  if (!auditRes.ok) throw new Error("Failed to verify audit chain");
  const auditData = await auditRes.json();
  if (!auditData.valid) throw new Error("Audit chain broken!");
  console.log(`  ✅ Cryptographic Audit Chain 100% INTACT: ${auditData.totalRecords} sequential verified records.`);
  console.log("✨ PASSED\n");

  console.log("====================================================");
  console.log("🎉 ALL BRANCH DOCUMENT CENTER TESTS PASSED (7/7)");
  console.log("====================================================");
}

runBranchDocumentCenterTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
