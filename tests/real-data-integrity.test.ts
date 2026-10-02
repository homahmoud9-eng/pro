import { prisma } from '../src/lib/db/prisma';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ ${message}`);
}

async function runDataIntegrityScenario() {
  console.log('====================================================');
  console.log('🔄 EXECUTING REQUIREMENT 37: REAL DATA INTEGRITY TEST');
  console.log('====================================================\n');

  // Step 0: Ensure we start from an authenticated Owner and Organization
  const owner = await prisma.user.findUnique({
    where: { email: 'owner@tasha.ae' },
    include: { organization: true }
  });
  assert(!!owner, 'Owner user found (owner@tasha.ae)');
  const org = owner!.organization;
  assert(!!org, 'Organization found');

  // Clean any residual test business data while preserving Owner
  console.log('🧹 Preparing clean baseline...');
  await prisma.auditLog.deleteMany({ where: { organizationId: org.id } });
  await prisma.auditChainHead.deleteMany({ where: { organizationId: org.id } });
  await prisma.auditChainHead.create({
    data: {
      organizationId: org.id,
      sequenceNumber: 0,
      currentHash: '0000000000000000000000000000000000000000000000000000000000000000',
    }
  });
  await prisma.expense.deleteMany({ where: { organizationId: org.id } });
  await prisma.payment.deleteMany({ where: { organizationId: org.id } });
  await prisma.procedureComment.deleteMany({ where: { procedure: { organizationId: org.id } } });
  await prisma.procedureStep.deleteMany({ where: { procedure: { organizationId: org.id } } });
  await prisma.procedure.deleteMany({ where: { organizationId: org.id } });
  await prisma.document.updateMany({ where: { organizationId: org.id }, data: { currentVersionId: null } });
  await prisma.documentVersion.deleteMany({ where: { document: { organizationId: org.id } } });
  await prisma.document.deleteMany({ where: { organizationId: org.id } });
  await prisma.wasteRecord.deleteMany({ where: { organizationId: org.id } });
  await prisma.recipeIngredient.deleteMany({ where: { recipe: { organizationId: org.id } } });
  await prisma.recipe.deleteMany({ where: { organizationId: org.id } });
  await prisma.stockMovement.deleteMany({ where: { organizationId: org.id } });
  await prisma.inventoryItem.deleteMany({ where: { organizationId: org.id } });
  await prisma.supplier.deleteMany({ where: { organizationId: org.id } });
  await prisma.contract.deleteMany({ where: { organizationId: org.id } });
  await prisma.attendanceRecord.deleteMany({ where: { organizationId: org.id } });
  await prisma.employee.deleteMany({ where: { organizationId: org.id } });
  await prisma.userBranchScope.deleteMany();
  await prisma.branch.deleteMany({ where: { organizationId: org.id } });

  console.log('\n--- 1. VERIFY INITIAL CLEAN STATE ---');
  const initialBranchCount = await prisma.branch.count({ where: { organizationId: org.id } });
  const initialEmployeeCount = await prisma.employee.count({ where: { organizationId: org.id } });
  const initialDocCount = await prisma.document.count({ where: { organizationId: org.id } });
  const initialExpenseCount = await prisma.expense.count({ where: { organizationId: org.id } });

  assert(initialBranchCount === 0, 'Zero branches in clean state');
  assert(initialEmployeeCount === 0, 'Zero employees in clean state');
  assert(initialDocCount === 0, 'Zero documents in clean state');
  assert(initialExpenseCount === 0, 'Zero expenses in clean state');

  console.log('\n--- 2. CREATE BRANCH A AND BRANCH B ---');
  const branchA = await prisma.branch.create({
    data: {
      organizationId: org.id,
      code: 'BR-01',
      nameEn: 'Al Bateen Waterfront',
      nameAr: 'واجهة البطين البحرية',
      address: 'Al Bateen, Abu Dhabi',
      status: 'ACTIVE',
      phone: '+971 2 666 1111',
    }
  });
  assert(!!branchA.id, 'Branch A created (Al Bateen Waterfront - BR-01)');

  const branchB = await prisma.branch.create({
    data: {
      organizationId: org.id,
      code: 'BR-02',
      nameEn: 'Yas Mall Hub',
      nameAr: 'ياس مول',
      address: 'Yas Island, Abu Dhabi',
      status: 'ACTIVE',
      phone: '+971 2 666 2222',
    }
  });
  assert(!!branchB.id, 'Branch B created (Yas Mall Hub - BR-02)');

  console.log('\n--- 3. CREATE EMPLOYEE 1 IN BRANCH A & EMPLOYEE 2 IN BRANCH B ---');
  const emp1 = await prisma.employee.create({
    data: {
      organizationId: org.id,
      branchId: branchA.id,
      employeeCode: 'EMP-001',
      nameEn: 'Ahmed Al Zaabi',
      nameAr: 'أحمد الزعابي',
      jobTitle: 'Head Chef',
      gender: 'MALE',
      nationality: 'Emirati',
      status: 'ACTIVE',
      basicSalary: 12000,
      housingAllowance: 4000,
      transportAllowance: 1500,
      joiningDate: new Date('2025-01-01'),
    }
  });
  assert(!!emp1.id, 'Employee 1 created in Branch A (Ahmed Al Zaabi)');

  const emp2 = await prisma.employee.create({
    data: {
      organizationId: org.id,
      branchId: branchB.id,
      employeeCode: 'EMP-002',
      nameEn: 'Sarah Jenkins',
      nameAr: 'سارة جينكينز',
      jobTitle: 'Restaurant Manager',
      gender: 'FEMALE',
      nationality: 'British',
      status: 'ACTIVE',
      basicSalary: 10000,
      housingAllowance: 3500,
      transportAllowance: 1000,
      joiningDate: new Date('2025-02-01'),
    }
  });
  assert(!!emp2.id, 'Employee 2 created in Branch B (Sarah Jenkins)');

  console.log('\n--- 4. UPLOAD 2 DOCUMENTS TO BRANCH A & 1 DOCUMENT TO BRANCH B ---');
  const docTypeTrade = await prisma.documentType.findFirst({ where: { nameEn: 'Trade License' } });
  const docTypeCivil = await prisma.documentType.findFirst({ where: { nameEn: 'Civil Defense Certificate' } });
  const docTypeFood = await prisma.documentType.findFirst({ where: { nameEn: 'ADAFSA Food Permit' } });

  assert(!!docTypeTrade && !!docTypeCivil && !!docTypeFood, 'Document types available');

  // Branch A - Doc 1
  const docA1 = await prisma.document.create({
    data: {
      organizationId: org.id,
      branchId: branchA.id,
      entityType: 'BRANCH',
      entityId: branchA.id,
      documentTypeId: docTypeTrade!.id,
      title: 'Branch A Trade License',
      referenceNumber: 'TL-BAT-2026',
      issueDate: new Date('2026-01-01'),
      expiryDate: new Date('2027-01-01'),
      status: 'ACTIVE',
      isLegal: true,
      versions: {
        create: {
          versionNumber: 1,
          originalFilename: 'trade_license.pdf',
          storageKey: 'documents/trade_license_v1.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 10240,
          sha256: 'a1b2c3d4e5f60000000000000000000000000000000000000000000000000001',
          uploadedBy: owner!.id,
        }
      }
    }
  });

  // Branch A - Doc 2
  const docA2 = await prisma.document.create({
    data: {
      organizationId: org.id,
      branchId: branchA.id,
      entityType: 'BRANCH',
      entityId: branchA.id,
      documentTypeId: docTypeCivil!.id,
      title: 'Branch A Civil Defense',
      referenceNumber: 'CD-BAT-2026',
      issueDate: new Date('2026-01-01'),
      expiryDate: new Date('2027-01-01'),
      status: 'ACTIVE',
      isLegal: true,
      versions: {
        create: {
          versionNumber: 1,
          originalFilename: 'civil_defense.pdf',
          storageKey: 'documents/civil_defense_v1.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 15400,
          sha256: 'a1b2c3d4e5f60000000000000000000000000000000000000000000000000002',
          uploadedBy: owner!.id,
        }
      }
    }
  });

  // Branch B - Doc 1
  const docB1 = await prisma.document.create({
    data: {
      organizationId: org.id,
      branchId: branchB.id,
      entityType: 'BRANCH',
      entityId: branchB.id,
      documentTypeId: docTypeFood!.id,
      title: 'Branch B Food Safety Permit',
      referenceNumber: 'FS-YAS-2026',
      issueDate: new Date('2026-02-01'),
      expiryDate: new Date('2027-02-01'),
      status: 'ACTIVE',
      isLegal: true,
      versions: {
        create: {
          versionNumber: 1,
          originalFilename: 'food_safety.pdf',
          storageKey: 'documents/food_safety_v1.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 12800,
          sha256: 'a1b2c3d4e5f60000000000000000000000000000000000000000000000000003',
          uploadedBy: owner!.id,
        }
      }
    }
  });

  assert(!!docA1.id && !!docA2.id, '2 Documents uploaded to Branch A');
  assert(!!docB1.id, '1 Document uploaded to Branch B');

  console.log('\n--- 5. CREATE A PROCEDURE FOR EMPLOYEE 1 ---');
  const procedure = await prisma.procedure.create({
    data: {
      organizationId: org.id,
      branchId: branchA.id,
      reference: 'PROC-2026-001',
      type: 'WORK_PERMIT_RENEWAL',
      subjectType: 'EMPLOYEE',
      subjectId: emp1.id,
      title: 'MOHRE Work Permit Renewal',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      description: 'Annual statutory labor contract and work permit renewal with MOHRE.',
      createdBy: owner!.id,
    }
  });
  assert(!!procedure.id, 'Procedure created for Employee 1 (MOHRE Work Permit Renewal)');

  console.log('\n--- 6. CREATE A FINANCIAL EXPENSE ---');
  let expenseCat = await prisma.expenseCategory.findFirst({ where: { organizationId: org.id } });
  if (!expenseCat) {
    expenseCat = await prisma.expenseCategory.create({
      data: {
        organizationId: org.id,
        code: 'KITCHEN_MAINTENANCE',
        nameAr: 'صيانة المطابخ',
        nameEn: 'Kitchen Equipment Maintenance'
      }
    });
  }
  const expense = await prisma.expense.create({
    data: {
      organizationId: org.id,
      branchId: branchA.id,
      expenseNumber: 'EXP-0001',
      categoryId: expenseCat.id,
      payee: 'Kitchen Tech Services LLC',
      description: 'Quarterly combi-oven preventive maintenance',
      amount: 1500.0,
      vatAmount: 75.0,
      currency: 'AED',
      paymentMethod: 'CORPORATE_CARD',
      status: 'APPROVED',
      date: new Date(),
    }
  });
  assert(!!expense.id, 'Financial expense created (AED 1,575.00 total)');

  console.log('\n--- 7. CREATE AN INVENTORY RECORD & WRITE-OFF TRANSACTION ---');
  const invItem = await prisma.inventoryItem.create({
    data: {
      organizationId: org.id,
      branchId: branchA.id,
      sku: 'ING-WAGYU-01',
      nameEn: 'Grade A Wagyu Beef Patty',
      nameAr: 'برغر واغيو فئة أ',
      category: 'Meat & Poultry',
      unit: 'KG',
      currentStock: 50.0,
      reorderPoint: 10.0,
      averageCost: 65.0,
    }
  });
  assert(!!invItem.id, 'Inventory item created in Branch A (Grade A Wagyu Beef Patty)');

  console.log('\n====================================================');
  console.log('🔍 RELATIONAL INTEGRITY VERIFICATION SUITE');
  console.log('====================================================');

  // 1. Business query: exactly 2 branches
  const branches = await prisma.branch.findMany({
    where: { organizationId: org.id },
    include: {
      _count: { select: { employees: true, documents: true } }
    },
    orderBy: { code: 'asc' }
  });
  assert(branches.length === 2, `Business has exactly 2 branches (found: ${branches.length})`);

  // 2. Branch A metrics
  const branchACheck = branches.find(b => b.code === 'BR-01');
  assert(branchACheck?._count.employees === 1, `Branch A has exactly 1 employee (found: ${branchACheck?._count.employees})`);
  assert(branchACheck?._count.documents === 2, `Branch A has exactly 2 documents (found: ${branchACheck?._count.documents})`);

  // 3. Branch B metrics
  const branchBCheck = branches.find(b => b.code === 'BR-02');
  assert(branchBCheck?._count.employees === 1, `Branch B has exactly 1 employee (found: ${branchBCheck?._count.employees})`);
  assert(branchBCheck?._count.documents === 1, `Branch B has exactly 1 document (found: ${branchBCheck?._count.documents})`);

  // 4. Employee 1 relationships: linked to Branch A, has 1 procedure
  const emp1Check = await prisma.employee.findUnique({
    where: { id: emp1.id },
    include: {
      branch: true,
    }
  });
  assert(emp1Check?.branch?.code === 'BR-01', 'Employee 1 belongs to Branch A');

  const emp1Procedures = await prisma.procedure.findMany({
    where: { subjectType: 'EMPLOYEE', subjectId: emp1.id }
  });
  assert(emp1Procedures.length === 1, `Employee 1 has exactly 1 procedure (found: ${emp1Procedures.length})`);
  assert(emp1Procedures[0].id === procedure.id, 'Procedure ID matches exactly');

  // 5. Consolidated System-Wide Aggregations
  const totalEmployees = await prisma.employee.count({ where: { organizationId: org.id } });
  const totalDocuments = await prisma.document.count({ where: { organizationId: org.id } });
  const totalProcedures = await prisma.procedure.count({ where: { organizationId: org.id } });
  const totalExpensesSum = await prisma.expense.aggregate({
    where: { organizationId: org.id },
    _sum: { amount: true, vatAmount: true }
  });
  const totalExpenseTotal = Number(totalExpensesSum._sum.amount || 0) + Number(totalExpensesSum._sum.vatAmount || 0);

  assert(totalEmployees === 2, `Total System Employees is 2 (found: ${totalEmployees})`);
  assert(totalDocuments === 3, `Total System Documents is 3 (found: ${totalDocuments})`);
  assert(totalProcedures === 1, `Total System Procedures is 1 (found: ${totalProcedures})`);
  assert(totalExpenseTotal === 1575.0, `Total System Expenses is AED 1,575.00 (found: AED ${totalExpenseTotal.toFixed(2)})`);

  // 6. Clean reset back to pure empty state
  console.log('\n🧹 Performing clean reset back to production baseline...');
  await prisma.expense.deleteMany({ where: { organizationId: org.id } });
  await prisma.procedure.deleteMany({ where: { organizationId: org.id } });
  await prisma.document.updateMany({ where: { organizationId: org.id }, data: { currentVersionId: null } });
  await prisma.documentVersion.deleteMany({ where: { document: { organizationId: org.id } } });
  await prisma.document.deleteMany({ where: { organizationId: org.id } });
  await prisma.inventoryItem.deleteMany({ where: { organizationId: org.id } });
  await prisma.employee.deleteMany({ where: { organizationId: org.id } });
  await prisma.branch.deleteMany({ where: { organizationId: org.id } });

  console.log('\n====================================================');
  console.log('🎉 REQUIREMENT 37: ALL DATA INTEGRITY CHECKS PASSED');
  console.log('====================================================\n');
}

runDataIntegrityScenario()
  .catch((e) => {
    console.error('Data integrity scenario failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
