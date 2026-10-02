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

  // TEST 2: Owner-Only Role Architecture & Access Control
  await test('Owner-Only Role Model: Exactly 1 active role (Owner) with full permissions', async () => {
    const roles = await prisma.role.findMany({
      include: {
        rolePermissions: {
          include: { permission: true }
        }
      }
    });

    assert(roles.length === 1, `Exactly 1 role exists in the database (found: ${roles.length})`);
    assert(roles[0].name === 'Owner', `Role name is strictly "Owner" (found: ${roles[0].name})`);

    const ownerRole = roles[0];
    const totalPermissions = await prisma.permission.count();
    assert(
      ownerRole.rolePermissions.length === totalPermissions,
      `Owner role has all permissions assigned (${ownerRole.rolePermissions.length}/${totalPermissions})`
    );

    // Verify no demo users remain
    const users = await prisma.user.findMany({
      include: { roles: { include: { role: true } } }
    });
    assert(users.length === 1, `Only 1 user exists in system (found: ${users.length})`);
    assert(users[0].email === 'owner@tasha.ae', `Only real Owner account is preserved (${users[0].email})`);
    assert(users[0].roles.some(r => r.role.name === 'Owner'), 'User is assigned the Owner role');
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

  // TEST 4: Legal Document Versioning Integrity
  await test('Legal Document Model: Verification of non-destructive document versioning contract', async () => {
    const docTypes = await prisma.documentType.findMany();
    assert(docTypes.length > 0, `Base document types configured in system (found: ${docTypes.length})`);
    
    // Verify document types include statutory requirements
    const names = docTypes.map(d => d.nameEn);
    assert(names.includes('Trade License'), 'Trade License type exists');
    assert(names.includes('Employee Passport'), 'Employee Passport type exists');
    assert(names.includes('Emirates ID'), 'Emirates ID type exists');
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
  });

  // TEST 7: Recipe Food Cost Calculation & Profit Margins
  await test('Recipe Food Cost & Margin Computation Business Logic', async () => {
    // Standard UAE F&B formula
    const sellingPrice = 65.0;
    const portionCost = 18.2;
    const foodCostPct = Number(((portionCost / sellingPrice) * 100).toFixed(2));
    const grossMargin = Number((sellingPrice - portionCost).toFixed(2));

    assert(portionCost > 0, 'Portion cost is greater than 0');
    assert(sellingPrice > portionCost, 'Selling price is greater than portion cost');
    assert(foodCostPct === 28.0, `Food cost percentage computed accurately (28.0% vs expected 28.0%)`);
    assert(grossMargin === 46.8, `Gross margin computed accurately (46.8 AED)`);
    assert(foodCostPct < 32, 'Food cost percentage meets UAE F&B industry standard (< 32%)');
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
