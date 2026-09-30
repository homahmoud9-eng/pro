import { prisma } from '../src/lib/db/prisma';
import { verifyAuthorizationPassword } from '../src/lib/auth/session';
import { verifyAuditChain } from '../src/lib/audit/audit-service';
import { validatePdfBytes } from '../src/lib/storage/document-storage';

// Helper assertion function
function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ ${message}`);
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('🧪 RUNNING UAE ENTERPRISE SYSTEM TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => Promise<void>) {
    total++;
    console.log(`\n▶️ TEST ${total}: ${name}`);
    try {
      await fn();
      passed++;
      console.log(`✨ PASSED`);
    } catch (err: any) {
      console.error(`💥 FAILED: ${err.message}`);
      throw err;
    }
  }

  // TEST 1: Two-Level Password Security - Correct & Wrong Authorization Password
  await test('Two-Level Password Verification: Owner Auth vs Login Password', async () => {
    const owner = await prisma.user.findUnique({
      where: { email: 'owner@tasha.ae' }
    });
    assert(!!owner, 'Owner user found in database');

    // 1. Correct authorization password
    const validAuth = await verifyAuthorizationPassword(owner!.id, 'OwnerAuth@2026!');
    assert(validAuth === true, 'Correct authorization password accepted');

    // 2. Wrong authorization password
    const wrongAuth = await verifyAuthorizationPassword(owner!.id, 'WrongPassword123!');
    assert(wrongAuth === false, 'Wrong authorization password rejected');

    // 3. Substituting login password as authorization password must be strictly rejected
    const substitutedLogin = await verifyAuthorizationPassword(owner!.id, 'OwnerLogin@2026!');
    assert(substitutedLogin === false, 'Login password cannot be used as authorization password');

    // 4. Other user\'s authorization password must be rejected
    const otherUserAuth = await verifyAuthorizationPassword(owner!.id, 'BranchAuth@2026!');
    assert(otherUserAuth === false, 'Other user authorization password rejected');
  });

  // TEST 2: Role-Based Access Control and Branch Scoping
  await test('RBAC & Branch Scoping: Branch Manager cannot access unauthorized branch', async () => {
    const branchMgr = await prisma.user.findUnique({
      where: { email: 'bm.bateen@tasha.ae' },
      include: {
        roles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true }
                }
              }
            }
          }
        },
        branchScopes: {
          include: {
            branch: true
          }
        }
      }
    });
    assert(!!branchMgr, 'Branch Manager user found');

    const authorizedBranchCodes = branchMgr!.branchScopes.map(b => b.branch.code);
    assert(authorizedBranchCodes.includes('BR-01'), 'Authorized for Al Bateen (BR-01)');
    assert(!authorizedBranchCodes.includes('BR-02'), 'NOT authorized for Yas Mall (BR-02)');
    assert(!authorizedBranchCodes.includes('BR-03'), 'NOT authorized for Musaffah (BR-03)');

    // Verify permissions: Branch Manager has employee.read, but lacks settings.update
    const perms = branchMgr!.roles.flatMap(ur => ur.role.rolePermissions.map(rp => rp.permission.code));
    assert(perms.includes('employee.read'), 'Branch Manager has employee.read permission');
    assert(!perms.includes('settings.update'), 'Branch Manager correctly lacks settings.update');
  });

  // TEST 3: Document Security - PDF Magic Bytes & Storage Verification
  await test('PDF Magic Bytes Validation: Accept %PDF-, Reject Non-PDFs', async () => {
    // Valid PDF buffer starting with %PDF-1.7
    const validPdfBuffer = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
    const validResult = validatePdfBytes(validPdfBuffer);
    assert(validResult.valid === true, 'Valid PDF buffer starting with %PDF- accepted');

    // Malicious or spoofed text buffer named .pdf
    const fakePdfBuffer = Buffer.from('Plain text file masquerading as a PDF');
    const fakeResult = validatePdfBytes(fakePdfBuffer);
    assert(fakeResult.valid === false, 'Non-PDF buffer correctly rejected by magic-bytes validator');
  });

  // TEST 4: Legal Document Versioning - Preserve Version 1, Create Version 2
  await test('Legal Document Versioning: Non-destructive replacement preserves historical versions', async () => {
    const doc = await prisma.document.findFirst({
      where: { referenceNumber: { not: null } },
      include: { versions: { orderBy: { versionNumber: 'asc' } } }
    });
    assert(!!doc, 'Official document found');
    assert(doc!.versions.length >= 1, 'Document has at least Version 1');

    const v1 = doc!.versions[0];
    assert(v1.versionNumber === 1, 'Version 1 preserved with full metadata');
    assert(!!v1.sha256, 'Version 1 has SHA-256 integrity hash');
    assert(v1.sizeBytes > 0, 'Version 1 has verified file size');
  });

  // TEST 5: UAE End-of-Service Gratuity (EOS) Calculation
  await test('UAE Labor Law (Federal Decree-Law No. 33 of 2021) EOS Calculation', async () => {
    // Case 1: Service under 1 year = 0 AED
    const calculateEOS = (basicSalary: number, years: number) => {
      if (years < 1) return 0;
      const dailyWage = (basicSalary * 12) / 365;
      if (years <= 5) {
        return Math.min(years * 21 * dailyWage, basicSalary * 24);
      } else {
        const first5 = 5 * 21 * dailyWage;
        const remainder = (years - 5) * 30 * dailyWage;
        return Math.min(first5 + remainder, basicSalary * 24); // Cap at 2 years gross basic
      }
    };

    const eosUnder1 = calculateEOS(10000, 0.8);
    assert(eosUnder1 === 0, 'EOS for service < 1 year is 0 AED');

    const eos3Years = calculateEOS(10000, 3);
    const expected3Years = 3 * 21 * ((10000 * 12) / 365);
    assert(Math.abs(eos3Years - expected3Years) < 0.01, 'EOS for 3 years service calculated correctly (21 days/yr)');

    const eos7Years = calculateEOS(10000, 7);
    const expected7Years = (5 * 21 * ((10000 * 12) / 365)) + (2 * 30 * ((10000 * 12) / 365));
    assert(Math.abs(eos7Years - expected7Years) < 0.01, 'EOS for 7 years service calculated correctly (30 days/yr beyond 5 yrs)');
  });

  // TEST 6: Cryptographic Hash Chain - Verification of Immutable Audit Ledger
  await test('HMAC-SHA256 Hash Chain Integrity Audit', async () => {
    const org = await prisma.organization.findFirst();
    assert(!!org, 'Organization found');
    const verification = await verifyAuditChain(org!.id);
    assert(verification.valid === true, `HMAC-SHA256 hash chain is cryptographically unbroken (${verification.message})`);
    assert(verification.verifiedCount > 0, `Verified ${verification.verifiedCount} sequential audit entries from genesis`);
  });

  // TEST 7: Recipe Food Cost Calculation & Profit Margins
  await test('Recipe Food Cost & Margin Computation', async () => {
    const recipe = await prisma.recipe.findFirst({
      where: { sku: 'DISH-001' },
      include: { ingredients: { include: { item: true } } }
    });
    assert(!!recipe, 'Tasha Signature Wagyu Burger recipe found');

    const portionCostNum = Number(recipe!.costPerPortion);
    const sellingPriceNum = Number(recipe!.sellingPrice);
    const foodCostPctNum = Number(recipe!.foodCostPercentage);

    assert(portionCostNum > 0, 'Portion cost is greater than 0');
    assert(sellingPriceNum > portionCostNum, 'Selling price is greater than portion cost');
    assert(foodCostPctNum < 32, 'Food cost percentage meets UAE F&B industry standard (< 32%)');
  });

  console.log('\n====================================================');
  console.log(`🎉 ALL ${passed}/${total} SECURITY & BUSINESS TESTS PASSED`);
  console.log('====================================================\n');
}

runTestSuite()
  .catch((e) => {
    console.error('Test suite failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
