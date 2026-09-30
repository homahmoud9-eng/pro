import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

import { computeAuditHash } from "../src/lib/audit/audit-service";

async function main() {
  console.log("Seeding UAE Restaurant Enterprise System database...");

  // Clean existing data for idempotency
  await prisma.auditLog.deleteMany();
  await prisma.auditChainHead.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.foodSafetyFinding.deleteMany();
  await prisma.foodSafetyInspection.deleteMany();
  await prisma.foodSafetyChecklist.deleteMany();
  await prisma.foodHandlerTraining.deleteMany();
  await prisma.wasteRecord.deleteMany();
  await prisma.recipeIngredient.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.expenseCategory.deleteMany();
  await prisma.taxRecord.deleteMany();
  await prisma.procedureComment.deleteMany();
  await prisma.procedureStep.deleteMany();
  await prisma.procedure.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.payrollEntry.deleteMany();
  await prisma.payrollPeriod.deleteMany();
  await prisma.endOfServiceCalculation.deleteMany();
  await prisma.documentVersion.deleteMany();
  await prisma.document.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.documentType.deleteMany();
  await prisma.userBranchScope.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.session.deleteMany();
  await prisma.securityEvent.deleteMany();
  await prisma.userSecurityProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.department.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.organization.deleteMany();

  // 1. Organization
  const org = await prisma.organization.upsert({
    where: { code: "ORG-01" },
    update: {},
    create: {
      code: "ORG-01",
      nameAr: "مجموعة مطاعم طاشا ذ.م.م",
      nameEn: "Tasha Restaurant Group LLC",
      tradingNameAr: "مطعم طاشا للمأكولات الراقية",
      tradingNameEn: "Tasha Fine Dining Restaurant",
      legalForm: "Limited Liability Company (LLC)",
      licenseNumbers: "CN-1984210",
      trn: "100234567800003",
      email: "operations@tasha.ae",
      phone: "+971 2 642 9000",
      website: "https://tasha.ae",
      address: "Al Bateen Marina, Marina Walk, Building 4",
      emirate: "Abu Dhabi",
      city: "Abu Dhabi",
      country: "United Arab Emirates",
      currency: "AED",
      timezone: "Asia/Dubai",
      ownerName: "Tariq Al Mansoori",
      notes: "Licensed by Abu Dhabi Department of Economic Development (ADDED) & ADAFSA compliant.",
    },
  });

  // 2. Branches
  const branch1 = await prisma.branch.upsert({
    where: { organizationId_code: { organizationId: org.id, code: "BR-01" } },
    update: {},
    create: {
      organizationId: org.id,
      code: "BR-01",
      nameAr: "فرع البطين الرئيسي",
      nameEn: "Al Bateen Main Flagship",
      address: "Al Bateen Marina, Abu Dhabi",
      phone: "+971 2 642 9001",
      managerName: "Mahmoud Al Nuaimi",
      status: "ACTIVE",
      openingDate: new Date("2024-01-15"),
      openingHours: "08:00 AM - 12:00 AM",
    },
  });

  const branch2 = await prisma.branch.upsert({
    where: { organizationId_code: { organizationId: org.id, code: "BR-02" } },
    update: {},
    create: {
      organizationId: org.id,
      code: "BR-02",
      nameAr: "فرع ياس مول",
      nameEn: "Yas Mall Waterfront",
      address: "Yas Island, Ground Floor, Dining Boulevard",
      phone: "+971 2 642 9002",
      managerName: "Karim Hassan",
      status: "ACTIVE",
      openingDate: new Date("2025-03-01"),
      openingHours: "10:00 AM - 01:00 AM",
    },
  });

  const branch3 = await prisma.branch.upsert({
    where: { organizationId_code: { organizationId: org.id, code: "BR-03" } },
    update: {},
    create: {
      organizationId: org.id,
      code: "BR-03",
      nameAr: "مطبخ المصفح المركزي للتجهيز",
      nameEn: "Musaffah Central Production Kitchen",
      address: "Musaffah Industrial M-14, Warehouse 12",
      phone: "+971 2 642 9003",
      managerName: "Chef Andrea Rossi",
      status: "ACTIVE",
      openingDate: new Date("2024-06-01"),
      openingHours: "24/7 Operations",
    },
  });

  // 3. Departments
  const departments = [
    { code: "MGMT", nameAr: "الإدارة العليا", nameEn: "Executive Management" },
    { code: "HR", nameAr: "الموارد البشرية والتعقيب", nameEn: "HR & Public Relations" },
    { code: "FIN", nameAr: "المالية والحسابات", nameEn: "Finance & Accounts" },
    { code: "KIT", nameAr: "المطبخ والطهي", nameEn: "Kitchen & Culinary" },
    { code: "SRV", nameAr: "الضيافة والخدمة", nameEn: "Front of House & Service" },
    { code: "PROC", nameAr: "المشتريات وسلاسل الإمداد", nameEn: "Procurement & Supply Chain" },
    { code: "COMP", nameAr: "الامتثال والسلامة الغذائية", nameEn: "Compliance & Food Safety" },
  ];

  const deptMap: Record<string, string> = {};
  for (const d of departments) {
    const dept = await prisma.department.upsert({
      where: { organizationId_code: { organizationId: org.id, code: d.code } },
      update: {},
      create: {
        organizationId: org.id,
        code: d.code,
        nameAr: d.nameAr,
        nameEn: d.nameEn,
      },
    });
    deptMap[d.code] = dept.id;
  }

  // 4. Granular Permissions
  const permissionsList = [
    { code: "business.read", module: "business", description: "View company profile and branches" },
    { code: "business.update", module: "business", description: "Update company profile and branch details" },
    { code: "employee.read", module: "employee", description: "View employee profiles" },
    { code: "employee.create", module: "employee", description: "Create new employee records" },
    { code: "employee.update", module: "employee", description: "Update employee details" },
    { code: "employee.archive", module: "employee", description: "Archive or terminate employees" },
    { code: "employee.salary.read", module: "employee", description: "View sensitive salary information" },
    { code: "employee.salary.update", module: "employee", description: "Update basic salary and allowances" },
    { code: "business_document.read", module: "document", description: "View official business documents" },
    { code: "business_document.upload", module: "document", description: "Upload business compliance PDF" },
    { code: "business_document.replace", module: "document", description: "Replace business PDF with new version" },
    { code: "business_document.download", module: "document", description: "Download business PDF files" },
    { code: "employee_document.read", module: "document", description: "View employee legal documents" },
    { code: "employee_document.upload", module: "document", description: "Upload employee compliance PDF" },
    { code: "employee_document.replace", module: "document", description: "Replace employee PDF with new version" },
    { code: "employee_document.download", module: "document", description: "Download employee PDF files" },
    { code: "procedure.read", module: "procedure", description: "View governmental and internal workflows" },
    { code: "procedure.create", module: "procedure", description: "Initiate new procedure" },
    { code: "procedure.advance", module: "procedure", description: "Advance procedure steps and change state" },
    { code: "attendance.read", module: "attendance", description: "View attendance and shift schedules" },
    { code: "attendance.update", module: "attendance", description: "Correct attendance times" },
    { code: "leave.read", module: "leave", description: "View leave requests and balances" },
    { code: "leave.approve", module: "leave", description: "Approve or reject leave requests" },
    { code: "payroll.read", module: "payroll", description: "View payroll batches and payslips" },
    { code: "payroll.create", module: "payroll", description: "Calculate monthly payroll" },
    { code: "payroll.approve", module: "payroll", description: "Approve payroll for WPS export" },
    { code: "finance.read", module: "finance", description: "View financial overview and wallet" },
    { code: "expense.create", module: "finance", description: "Record new operational expense" },
    { code: "expense.approve", module: "finance", description: "Approve expenses" },
    { code: "payment.create", module: "finance", description: "Execute payments" },
    { code: "inventory.read", module: "inventory", description: "View stock levels and inventory" },
    { code: "inventory.create", module: "inventory", description: "Create inventory items" },
    { code: "inventory.adjust", module: "inventory", description: "Adjust stock and post transfers" },
    { code: "recipe.read", module: "recipe", description: "View recipes and food cost calculations" },
    { code: "recipe.create", module: "recipe", description: "Create or modify recipes" },
    { code: "supplier.read", module: "supplier", description: "View supplier directory" },
    { code: "supplier.create", module: "supplier", description: "Add new suppliers" },
    { code: "food_safety.read", module: "food_safety", description: "View ADAFSA checklists and inspections" },
    { code: "food_safety.create", module: "food_safety", description: "Record inspections and findings" },
    { code: "food_safety.approve", module: "food_safety", description: "Close corrective actions" },
    { code: "audit.read", module: "audit", description: "View immutable audit logs" },
    { code: "audit.verify", module: "audit", description: "Run cryptographic audit chain verification" },
    { code: "user.read", module: "security", description: "View system users" },
    { code: "user.create", module: "security", description: "Create users and assign credentials" },
    { code: "settings.read", module: "settings", description: "View system configuration" },
    { code: "settings.update", module: "settings", description: "Update policies and document types" },
  ];

  const permMap: Record<string, string> = {};
  for (const p of permissionsList) {
    const perm = await prisma.permission.upsert({
      where: { code: p.code },
      update: {},
      create: p,
    });
    permMap[p.code] = perm.id;
  }

  // 5. Roles
  const ownerRole = await prisma.role.upsert({
    where: { organizationId_name: { organizationId: org.id, name: "Owner" } },
    update: {},
    create: {
      organizationId: org.id,
      name: "Owner",
      description: "Full system authority across all branches, finance, HR, compliance and security.",
      isSystem: true,
    },
  });

  const hrRole = await prisma.role.upsert({
    where: { organizationId_name: { organizationId: org.id, name: "HR Manager" } },
    update: {},
    create: {
      organizationId: org.id,
      name: "HR Manager",
      description: "Management of employee files, contracts, visas, procedures, attendance, and payroll prep.",
      isSystem: true,
    },
  });

  const branchManagerRole = await prisma.role.upsert({
    where: { organizationId_name: { organizationId: org.id, name: "Branch Manager" } },
    update: {},
    create: {
      organizationId: org.id,
      name: "Branch Manager",
      description: "Branch-scoped operational management of staff, attendance, and inventory.",
      isSystem: true,
    },
  });

  const financeRole = await prisma.role.upsert({
    where: { organizationId_name: { organizationId: org.id, name: "Finance Manager" } },
    update: {},
    create: {
      organizationId: org.id,
      name: "Finance Manager",
      description: "Wallet oversight, expenses, payments, VAT, and payroll disbursement.",
      isSystem: true,
    },
  });

  const complianceRole = await prisma.role.upsert({
    where: { organizationId_name: { organizationId: org.id, name: "Compliance Officer" } },
    update: {},
    create: {
      organizationId: org.id,
      name: "Compliance Officer",
      description: "ADAFSA inspection checklists, EFST training, license expiries, and audit logs.",
      isSystem: true,
    },
  });

  // Assign all permissions to Owner role
  for (const permCode of Object.keys(permMap)) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: ownerRole.id, permissionId: permMap[permCode] } },
      update: {},
      create: { roleId: ownerRole.id, permissionId: permMap[permCode] },
    });
  }

  // Assign HR permissions
  const hrPerms = [
    "employee.read", "employee.create", "employee.update", "employee.archive",
    "employee.salary.read", "employee.salary.update",
    "employee_document.read", "employee_document.upload", "employee_document.replace", "employee_document.download",
    "procedure.read", "procedure.create", "procedure.advance",
    "attendance.read", "attendance.update",
    "leave.read", "leave.approve",
    "payroll.read", "payroll.create",
    "audit.read",
  ];
  for (const p of hrPerms) {
    if (permMap[p]) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: hrRole.id, permissionId: permMap[p] } },
        update: {},
        create: { roleId: hrRole.id, permissionId: permMap[p] },
      });
    }
  }

  // Assign Branch Manager permissions
  const bmPerms = [
    "employee.read", "employee.update",
    "employee_document.read", "employee_document.upload",
    "attendance.read", "attendance.update",
    "leave.read",
    "inventory.read", "inventory.adjust",
    "food_safety.read", "food_safety.create",
  ];
  for (const p of bmPerms) {
    if (permMap[p]) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: branchManagerRole.id, permissionId: permMap[p] } },
        update: {},
        create: { roleId: branchManagerRole.id, permissionId: permMap[p] },
      });
    }
  }

  // 6. Users with Two-Level Security Model
  // Passwords:
  // Owner: Login "OwnerLogin@2026!", Auth "OwnerAuth@2026!"
  // HR: Login "HrManager@2026!", Auth "HrAuth@2026!"
  // Branch Mgr: Login "BranchMgr@2026!", Auth "BranchAuth@2026!"
  // Finance: Login "FinanceMgr@2026!", Auth "FinanceAuth@2026!"
  // Compliance: Login "Compliance@2026!", Auth "ComplianceAuth@2026!"

  const saltRounds = 10;
  const ownerLoginHash = await bcrypt.hash("OwnerLogin@2026!", saltRounds);
  const ownerAuthHash = await bcrypt.hash("OwnerAuth@2026!", saltRounds);

  const hrLoginHash = await bcrypt.hash("HrManager@2026!", saltRounds);
  const hrAuthHash = await bcrypt.hash("HrAuth@2026!", saltRounds);

  const bmLoginHash = await bcrypt.hash("BranchMgr@2026!", saltRounds);
  const bmAuthHash = await bcrypt.hash("BranchAuth@2026!", saltRounds);

  const finLoginHash = await bcrypt.hash("FinanceMgr@2026!", saltRounds);
  const finAuthHash = await bcrypt.hash("FinanceAuth@2026!", saltRounds);

  const compLoginHash = await bcrypt.hash("Compliance@2026!", saltRounds);
  const compAuthHash = await bcrypt.hash("ComplianceAuth@2026!", saltRounds);

  // User 1: Owner
  const ownerUser = await prisma.user.upsert({
    where: { email: "owner@tasha.ae" },
    update: {},
    create: {
      organizationId: org.id,
      email: "owner@tasha.ae",
      username: "owner",
      name: "Tariq Al Mansoori",
      status: "ACTIVE",
    },
  });

  await prisma.userSecurityProfile.upsert({
    where: { userId: ownerUser.id },
    update: {
      loginPasswordHash: ownerLoginHash,
      authorizationPasswordHash: ownerAuthHash,
    },
    create: {
      userId: ownerUser.id,
      loginPasswordHash: ownerLoginHash,
      authorizationPasswordHash: ownerAuthHash,
      temporaryAuthPassword: false,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: ownerUser.id, roleId: ownerRole.id } },
    update: {},
    create: { userId: ownerUser.id, roleId: ownerRole.id },
  });

  // User 2: HR Manager
  const hrUser = await prisma.user.upsert({
    where: { email: "hrmanager@tasha.ae" },
    update: {},
    create: {
      organizationId: org.id,
      email: "hrmanager@tasha.ae",
      username: "hrmanager",
      name: "Fatima Al Suwaidi",
      status: "ACTIVE",
    },
  });

  await prisma.userSecurityProfile.upsert({
    where: { userId: hrUser.id },
    update: {
      loginPasswordHash: hrLoginHash,
      authorizationPasswordHash: hrAuthHash,
    },
    create: {
      userId: hrUser.id,
      loginPasswordHash: hrLoginHash,
      authorizationPasswordHash: hrAuthHash,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: hrUser.id, roleId: hrRole.id } },
    update: {},
    create: { userId: hrUser.id, roleId: hrRole.id },
  });

  // User 3: Branch Manager (Branch-scoped to Al Bateen)
  const bmUser = await prisma.user.upsert({
    where: { email: "bm.bateen@tasha.ae" },
    update: {},
    create: {
      organizationId: org.id,
      email: "bm.bateen@tasha.ae",
      username: "bmbateen",
      name: "Mahmoud Al Nuaimi",
      status: "ACTIVE",
    },
  });

  await prisma.userSecurityProfile.upsert({
    where: { userId: bmUser.id },
    update: {
      loginPasswordHash: bmLoginHash,
      authorizationPasswordHash: bmAuthHash,
    },
    create: {
      userId: bmUser.id,
      loginPasswordHash: bmLoginHash,
      authorizationPasswordHash: bmAuthHash,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: bmUser.id, roleId: branchManagerRole.id } },
    update: {},
    create: { userId: bmUser.id, roleId: branchManagerRole.id },
  });

  // Assign branch scope to Al Bateen
  await prisma.userBranchScope.upsert({
    where: { userId_branchId: { userId: bmUser.id, branchId: branch1.id } },
    update: {},
    create: { userId: bmUser.id, branchId: branch1.id },
  });

  // User 4: Finance Manager
  const finUser = await prisma.user.upsert({
    where: { email: "finance@tasha.ae" },
    update: {},
    create: {
      organizationId: org.id,
      email: "finance@tasha.ae",
      username: "finance",
      name: "Suresh Menon",
      status: "ACTIVE",
    },
  });

  await prisma.userSecurityProfile.upsert({
    where: { userId: finUser.id },
    update: {
      loginPasswordHash: finLoginHash,
      authorizationPasswordHash: finAuthHash,
    },
    create: {
      userId: finUser.id,
      loginPasswordHash: finLoginHash,
      authorizationPasswordHash: finAuthHash,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: finUser.id, roleId: financeRole.id } },
    update: {},
    create: { userId: finUser.id, roleId: financeRole.id },
  });

  // User 5: Compliance Officer
  const compUser = await prisma.user.upsert({
    where: { email: "compliance@tasha.ae" },
    update: {},
    create: {
      organizationId: org.id,
      email: "compliance@tasha.ae",
      username: "compliance",
      name: "Noor Al Hashimi",
      status: "ACTIVE",
    },
  });

  await prisma.userSecurityProfile.upsert({
    where: { userId: compUser.id },
    update: {
      loginPasswordHash: compLoginHash,
      authorizationPasswordHash: compAuthHash,
    },
    create: {
      userId: compUser.id,
      loginPasswordHash: compLoginHash,
      authorizationPasswordHash: compAuthHash,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: compUser.id, roleId: complianceRole.id } },
    update: {},
    create: { userId: compUser.id, roleId: complianceRole.id },
  });

  // 7. Document Types
  const docTypes = [
    { nameAr: "الرخصة التجارية", nameEn: "Trade License", category: "Business Legal", requiresPdf: true, requiresExpiryDate: true, requiresReferenceNumber: true },
    { nameAr: "تصريح المنشأة الغذائية (أدافسيا)", nameEn: "ADAFSA Food Permit", category: "Compliance", requiresPdf: true, requiresExpiryDate: true, requiresReferenceNumber: true },
    { nameAr: "عقد الإيجار والتوثيق", nameEn: "Tawtheeq Lease Contract", category: "Business Legal", requiresPdf: true, requiresExpiryDate: true, requiresReferenceNumber: true },
    { nameAr: "شهادة الدفاع المدني والسلامة", nameEn: "Civil Defense Certificate", category: "Compliance", requiresPdf: true, requiresExpiryDate: true, requiresReferenceNumber: true },
    { nameAr: "شهادة التسجيل الضريبي TRN", nameEn: "Tax Registration Certificate", category: "Tax", requiresPdf: true, requiresExpiryDate: false, requiresReferenceNumber: true },
    { nameAr: "جواز السفر للموظف", nameEn: "Employee Passport", category: "Employee Identity", requiresPdf: true, requiresExpiryDate: true, requiresReferenceNumber: true },
    { nameAr: "بطاقة الهوية الإماراتية", nameEn: "Emirates ID", category: "Employee Identity", requiresPdf: true, requiresExpiryDate: true, requiresReferenceNumber: true },
    { nameAr: "تأشيرة الإقامة والعمل", nameEn: "Residency Visa", category: "Employee Identity", requiresPdf: true, requiresExpiryDate: true, requiresReferenceNumber: true },
    { nameAr: "تصريح عمل وزارة الموارد البشرية", nameEn: "MOHRE Work Permit", category: "Employee Contract", requiresPdf: true, requiresExpiryDate: true, requiresReferenceNumber: true },
    { nameAr: "عقد العمل الموحد", nameEn: "Employment Contract", category: "Employee Contract", requiresPdf: true, requiresExpiryDate: true, requiresReferenceNumber: true },
    { nameAr: "شهادة تدريب سلامة الغذاء EFST", nameEn: "EFST Training Certificate", category: "Compliance", requiresPdf: true, requiresExpiryDate: true, requiresReferenceNumber: true },
    { nameAr: "التأمين الصحي الإلزامي", nameEn: "Health Insurance Card", category: "Employee Identity", requiresPdf: true, requiresExpiryDate: true, requiresReferenceNumber: true },
  ];

  const docTypeMap: Record<string, string> = {};
  for (const dt of docTypes) {
    const createdDt = await prisma.documentType.upsert({
      where: { organizationId_nameEn: { organizationId: org.id, nameEn: dt.nameEn } },
      update: {},
      create: {
        organizationId: org.id,
        ...dt,
      },
    });
    docTypeMap[dt.nameEn] = createdDt.id;
  }

  // 8. Official Business Documents with Versions
  // Document A: Trade License (Active, expires in 280 days)
  const tradeLicenseDoc = await prisma.document.create({
    data: {
      organizationId: org.id,
      branchId: branch1.id,
      entityType: "ORGANIZATION",
      entityId: org.id,
      documentTypeId: docTypeMap["Trade License"],
      title: "Commercial Trade License 2026 - Abu Dhabi DED",
      referenceNumber: "CN-1984210",
      issueDate: new Date("2026-01-10"),
      expiryDate: new Date("2027-01-09"),
      status: "ACTIVE",
      isLegal: true,
      createdBy: ownerUser.name,
    },
  });

  const tlVersion = await prisma.documentVersion.create({
    data: {
      documentId: tradeLicenseDoc.id,
      versionNumber: 1,
      originalFilename: "trade_license_2026_signed.pdf",
      storageKey: `documents/${tradeLicenseDoc.id}/v1/trade_license_2026.pdf`,
      sizeBytes: 1048576,
      sha256: crypto.createHash("sha256").update("sample_trade_license_pdf_bytes_v1").digest("hex"),
      scanStatus: "CLEAN",
      uploadedBy: ownerUser.name,
      notes: "Annual renewal approved by Abu Dhabi DED",
    },
  });

  await prisma.document.update({
    where: { id: tradeLicenseDoc.id },
    data: { currentVersionId: tlVersion.id },
  });

  // Document B: Tenancy Lease (Expiring soon, in 22 days!)
  const leaseExpiryDate = new Date();
  leaseExpiryDate.setDate(leaseExpiryDate.getDate() + 22);

  const leaseDoc = await prisma.document.create({
    data: {
      organizationId: org.id,
      branchId: branch1.id,
      entityType: "BRANCH",
      entityId: branch1.id,
      documentTypeId: docTypeMap["Tawtheeq Lease Contract"],
      title: "Al Bateen Marina Tenancy Tawtheeq Contract",
      referenceNumber: "TWT-2025-99214",
      issueDate: new Date("2025-10-22"),
      expiryDate: leaseExpiryDate,
      status: "EXPIRING_SOON",
      isLegal: true,
      createdBy: ownerUser.name,
    },
  });

  const leaseVersion = await prisma.documentVersion.create({
    data: {
      documentId: leaseDoc.id,
      versionNumber: 1,
      originalFilename: "bateen_lease_tawtheeq.pdf",
      storageKey: `documents/${leaseDoc.id}/v1/bateen_lease_tawtheeq.pdf`,
      sizeBytes: 1572864,
      sha256: crypto.createHash("sha256").update("sample_lease_pdf_bytes_v1").digest("hex"),
      scanStatus: "CLEAN",
      uploadedBy: ownerUser.name,
      notes: "Tawtheeq registered lease contract",
    },
  });

  await prisma.document.update({
    where: { id: leaseDoc.id },
    data: { currentVersionId: leaseVersion.id },
  });

  // Document C: Civil Defense Certificate (Expired 5 days ago!)
  const cdExpiryDate = new Date();
  cdExpiryDate.setDate(cdExpiryDate.getDate() - 5);

  const cdDoc = await prisma.document.create({
    data: {
      organizationId: org.id,
      branchId: branch1.id,
      entityType: "BRANCH",
      entityId: branch1.id,
      documentTypeId: docTypeMap["Civil Defense Certificate"],
      title: "Abu Dhabi Civil Defense Safety Certificate - Branch 1",
      referenceNumber: "ADCD-2025-8812",
      issueDate: new Date("2025-09-25"),
      expiryDate: cdExpiryDate,
      status: "EXPIRED",
      isLegal: true,
      createdBy: ownerUser.name,
    },
  });

  const cdVersion = await prisma.documentVersion.create({
    data: {
      documentId: cdDoc.id,
      versionNumber: 1,
      originalFilename: "civil_defense_cert_2025.pdf",
      storageKey: `documents/${cdDoc.id}/v1/civil_defense_cert_2025.pdf`,
      sizeBytes: 819200,
      sha256: crypto.createHash("sha256").update("sample_cd_pdf_bytes_v1").digest("hex"),
      scanStatus: "CLEAN",
      uploadedBy: ownerUser.name,
      notes: "Previous year safety compliance certificate",
    },
  });

  await prisma.document.update({
    where: { id: cdDoc.id },
    data: { currentVersionId: cdVersion.id },
  });

  // 9. Example Employees
  const employeesData = [
    {
      code: "EMP-001",
      nameAr: "محمود النعيمي",
      nameEn: "Mahmoud Al Nuaimi",
      jobTitle: "General Restaurant Manager",
      gender: "MALE",
      deptCode: "MGMT",
      branchId: branch1.id,
      nationality: "Emirati",
      photoUrl: "/images/employees/emp-001.jpg",
      basicSalary: 12000,
      housingAllowance: 4000,
      transportAllowance: 2000,
      otherAllowances: 1000,
      mobile: "+971 50 123 4567",
      email: "m.nuaimi@tasha.ae",
      status: "ACTIVE",
      passportNumberMasked: "N******89",
      emiratesIdMasked: "784-1988-******2-1",
      visaNumberMasked: "201/2024/*****4",
    },
    {
      code: "EMP-002",
      nameAr: "أندريا روسي",
      nameEn: "Andrea Rossi",
      jobTitle: "Executive Head Chef",
      gender: "MALE",
      deptCode: "KIT",
      branchId: branch1.id,
      nationality: "Italian",
      photoUrl: "/images/employees/emp-002.jpg",
      basicSalary: 14000,
      housingAllowance: 4500,
      transportAllowance: 1500,
      otherAllowances: 1500,
      mobile: "+971 52 987 6543",
      email: "andrea.rossi@tasha.ae",
      status: "ACTIVE",
      passportNumberMasked: "YA*****12",
      emiratesIdMasked: "784-1982-******1-4",
      visaNumberMasked: "201/2023/*****9",
    },
    {
      code: "EMP-003",
      nameAr: "محمد علي كريم",
      nameEn: "Mohamed Ali Kareem",
      jobTitle: "Senior Restaurant Waiter",
      gender: "MALE",
      deptCode: "SRV",
      branchId: branch1.id,
      nationality: "Egyptian",
      photoUrl: "/images/employees/emp-003.jpg",
      basicSalary: 3500,
      housingAllowance: 1000,
      transportAllowance: 500,
      otherAllowances: 300,
      mobile: "+971 54 444 3322",
      email: "mohamed.ali@tasha.ae",
      status: "ACTIVE",
      passportNumberMasked: "A******45",
      emiratesIdMasked: "784-1994-******7-2",
      visaNumberMasked: "201/2024/*****1",
    },
    {
      code: "EMP-004",
      nameAr: "سارة جونسون",
      nameEn: "Sarah Johnson",
      jobTitle: "Food Safety & Quality Specialist",
      gender: "FEMALE",
      deptCode: "COMP",
      branchId: branch1.id,
      nationality: "British",
      photoUrl: "/images/employees/emp-004.jpg",
      basicSalary: 8500,
      housingAllowance: 2500,
      transportAllowance: 1000,
      otherAllowances: 500,
      mobile: "+971 50 777 8899",
      email: "sarah.j@tasha.ae",
      status: "ACTIVE",
      passportNumberMasked: "54*****09",
      emiratesIdMasked: "784-1991-******9-8",
      visaNumberMasked: "201/2023/*****6",
    },
    {
      code: "EMP-005",
      nameAr: "راجيش كومار",
      nameEn: "Rajesh Kumar",
      jobTitle: "Commis Chef",
      gender: "MALE",
      deptCode: "KIT",
      branchId: branch2.id,
      nationality: "Indian",
      photoUrl: "/images/employees/emp-005.jpg",
      basicSalary: 2800,
      housingAllowance: 800,
      transportAllowance: 400,
      otherAllowances: 200,
      mobile: "+971 56 111 2233",
      email: "rajesh.k@tasha.ae",
      status: "ACTIVE",
      passportNumberMasked: "Z******33",
      emiratesIdMasked: "784-1996-******4-5",
      visaNumberMasked: "201/2025/*****8",
    },
  ];

  const createdEmployees: any[] = [];
  for (const emp of employeesData) {
    const createdEmp = await prisma.employee.upsert({
      where: { organizationId_employeeCode: { organizationId: org.id, employeeCode: emp.code } },
      update: {
        photoUrl: emp.photoUrl,
        nameAr: emp.nameAr,
        nameEn: emp.nameEn,
        jobTitle: emp.jobTitle,
      },
      create: {
        organizationId: org.id,
        branchId: emp.branchId,
        departmentId: deptMap[emp.deptCode],
        employeeCode: emp.code,
        nameAr: emp.nameAr,
        nameEn: emp.nameEn,
        jobTitle: emp.jobTitle,
        gender: emp.gender,
        nationality: emp.nationality,
        photoUrl: emp.photoUrl,
        basicSalary: emp.basicSalary,
        housingAllowance: emp.housingAllowance,
        transportAllowance: emp.transportAllowance,
        otherAllowances: emp.otherAllowances,
        mobile: emp.mobile,
        email: emp.email,
        status: emp.status,
        passportNumberMasked: emp.passportNumberMasked,
        emiratesIdMasked: emp.emiratesIdMasked,
        visaNumberMasked: emp.visaNumberMasked,
      },
    });
    createdEmployees.push(createdEmp);

    // Attach Passport and Emirates ID documents for each employee
    const passDoc = await prisma.document.create({
      data: {
        organizationId: org.id,
        branchId: emp.branchId,
        entityType: "EMPLOYEE",
        entityId: createdEmp.id,
        documentTypeId: docTypeMap["Employee Passport"],
        title: `Passport - ${emp.nameEn}`,
        referenceNumber: emp.passportNumberMasked,
        issueDate: new Date("2023-05-10"),
        expiryDate: new Date("2028-05-09"),
        status: "ACTIVE",
        isLegal: true,
        createdBy: hrUser.name,
      },
    });

    const passVersion = await prisma.documentVersion.create({
      data: {
        documentId: passDoc.id,
        versionNumber: 1,
        originalFilename: `passport_${emp.code}.pdf`,
        storageKey: `documents/${passDoc.id}/v1/passport_${emp.code}.pdf`,
        sizeBytes: 942080,
        sha256: crypto.createHash("sha256").update(`passport_${emp.code}_bytes`).digest("hex"),
        scanStatus: "CLEAN",
        uploadedBy: hrUser.name,
        notes: "Verified identity document copy",
      },
    });

    await prisma.document.update({
      where: { id: passDoc.id },
      data: { currentVersionId: passVersion.id },
    });
  }

  // 10. Procedures (Government / PRO Workflows)
  const proc1 = await prisma.procedure.create({
    data: {
      organizationId: org.id,
      branchId: branch1.id,
      reference: "PROC-2026-001",
      type: "VISA_RENEWAL",
      subjectType: "EMPLOYEE",
      subjectId: createdEmployees[2].id, // Mohamed Ali Kareem
      title: "Residency Visa & Labour Card Renewal - Mohamed Ali Kareem",
      description: "Annual MOHRE work permit renewal followed by ICP residency visa endorsement.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      dueDate: new Date("2026-10-25"),
      createdBy: hrUser.id,
      assignedTo: hrUser.id,
      steps: {
        create: [
          { stepNumber: 1, title: "Submit MOHRE Labour Card Renewal", status: "COMPLETED", assignedTo: hrUser.name, completedAt: new Date("2026-09-28") },
          { stepNumber: 2, title: "Conduct Medical Fitness Examination", status: "COMPLETED", assignedTo: hrUser.name, completedAt: new Date("2026-09-29") },
          { stepNumber: 3, title: "ICP Emirates ID & Visa Stamping Application", status: "IN_PROGRESS", assignedTo: hrUser.name },
          { stepNumber: 4, title: "Upload Final Visa & Archive Compliance PDF", status: "PENDING", assignedTo: hrUser.name },
        ],
      },
    },
  });

  const proc2 = await prisma.procedure.create({
    data: {
      organizationId: org.id,
      branchId: branch1.id,
      reference: "PROC-2026-002",
      type: "TRADE_LICENSE_RENEWAL",
      subjectType: "BUSINESS",
      subjectId: branch1.id,
      title: "Abu Dhabi Civil Defense Annual Certificate Renewal",
      description: "Coordinating fire safety inspection and equipment certification renewal with ADCD.",
      status: "PENDING",
      priority: "URGENT",
      dueDate: new Date("2026-10-15"),
      createdBy: compUser.id,
      assignedTo: compUser.id,
      steps: {
        create: [
          { stepNumber: 1, title: "Schedule Site Safety Audit", status: "IN_PROGRESS", assignedTo: compUser.name },
          { stepNumber: 2, title: "Civil Defense Inspector Visit", status: "PENDING", assignedTo: compUser.name },
          { stepNumber: 3, title: "Pay Certification Fees", status: "PENDING", assignedTo: finUser.name },
          { stepNumber: 4, title: "Receive & Upload New PDF Certificate", status: "PENDING", assignedTo: compUser.name },
        ],
      },
    },
  });

  // 11. Suppliers
  const supp1 = await prisma.supplier.create({
    data: {
      organizationId: org.id,
      code: "SUPP-01",
      legalName: "Al Ain Farms for Livestock Production LLC",
      tradingName: "Al Ain Dairy & Poultry",
      contactPerson: "Khalid Al Mansoori",
      phone: "+971 3 754 1111",
      email: "orders@alainfarms.com",
      address: "Al Ain Industrial Area, Abu Dhabi",
      trn: "100012345600003",
      paymentTerms: "Net 30",
      status: "ACTIVE",
    },
  });

  const supp2 = await prisma.supplier.create({
    data: {
      organizationId: org.id,
      code: "SUPP-02",
      legalName: "Barakat Quality Plus LLC",
      tradingName: "Barakat Fresh Fruits & Veg",
      contactPerson: "Dinesh Patel",
      phone: "+971 4 880 1177",
      email: "supply@barakatfresh.ae",
      address: "Dubai Industrial City, UAE",
      trn: "100298765400003",
      paymentTerms: "Net 15",
      status: "ACTIVE",
    },
  });

  // 12. Inventory Items
  const invItems = [
    { sku: "ING-001", nameAr: "صدور دجاج طازجة مبردة", nameEn: "Fresh Chicken Breast", category: "Poultry", unit: "KG", minStock: 25, reorderPoint: 50, currentStock: 120, avgCost: 28.5, supplierId: supp1.id },
    { sku: "ING-002", nameAr: "لحم بقري واغيو أسترالي MB5", nameEn: "Australian Wagyu Beef Striploin MB5", category: "Meat", unit: "KG", minStock: 15, reorderPoint: 30, currentStock: 45, avgCost: 165.0, supplierId: supp1.id },
    { sku: "ING-003", nameAr: "أرز بسمتي فاخر هندي", nameEn: "Premium Basmati Rice", category: "Dry Goods", unit: "KG", minStock: 50, reorderPoint: 100, currentStock: 250, avgCost: 8.5, supplierId: supp2.id },
    { sku: "ING-004", nameAr: "زيت زيتون بكر ممتاز", nameEn: "Extra Virgin Olive Oil", category: "Dry Goods", unit: "L", minStock: 20, reorderPoint: 40, currentStock: 85, avgCost: 32.0, supplierId: supp2.id },
    { sku: "ING-005", nameAr: "جبن بارميزان إيطالي أصلي", nameEn: "Parmigiano Reggiano 24M", category: "Dairy", unit: "KG", minStock: 10, reorderPoint: 20, currentStock: 18, avgCost: 95.0, supplierId: supp1.id },
    { sku: "ING-006", nameAr: "حبوب بن أرابيكا إثيوبي مختص", nameEn: "Specialty Ethiopian Arabica Beans", category: "Beverages", unit: "KG", minStock: 10, reorderPoint: 25, currentStock: 60, avgCost: 110.0, supplierId: supp2.id },
  ];

  const createdItems: any[] = [];
  for (const item of invItems) {
    const { avgCost, ...restItem } = item;
    const ci = await prisma.inventoryItem.create({
      data: {
        organizationId: org.id,
        branchId: branch1.id,
        averageCost: avgCost,
        lastPurchaseCost: avgCost,
        ...restItem,
      },
    });
    createdItems.push(ci);

    // Initial stock movement
    await prisma.stockMovement.create({
      data: {
        organizationId: org.id,
        branchId: branch1.id,
        itemId: ci.id,
        movementType: "OPENING_BALANCE",
        quantity: item.currentStock,
        unitCost: avgCost,
        totalCost: Number(item.currentStock) * Number(avgCost),
        performedBy: "Initial System Setup",
      },
    });
  }

  // 13. Recipes & Food Cost Calculation
  const recipe1 = await prisma.recipe.create({
    data: {
      organizationId: org.id,
      sku: "DISH-001",
      nameAr: "برجر واغيو الكمأة الفاخر",
      nameEn: "Signature Truffle Wagyu Burger",
      category: "Main Course",
      yieldQuantity: 1,
      portionSize: "1 Burger with Fries",
      sellingPrice: 85.0,
      costPerPortion: 24.5,
      foodCostPercentage: 28.82,
      isPublished: true,
      preparationNotes: "200g Wagyu Patty, Truffle Aioli, Aged Cheddar, Brioche Bun",
      ingredients: {
        create: [
          { itemId: createdItems[1].id, quantity: 0.22, unit: "KG", wastePercent: 5, cost: 36.3 },
          { itemId: createdItems[4].id, quantity: 0.04, unit: "KG", wastePercent: 2, cost: 3.8 },
        ],
      },
    },
  });

  const recipe2 = await prisma.recipe.create({
    data: {
      organizationId: org.id,
      sku: "DISH-002",
      nameAr: "ريزوتو الزعفران والدجاج المشوي",
      nameEn: "Saffron Risotto with Grilled Chicken",
      category: "Main Course",
      yieldQuantity: 1,
      portionSize: "350g plate",
      sellingPrice: 72.0,
      costPerPortion: 18.2,
      foodCostPercentage: 25.28,
      isPublished: true,
      preparationNotes: "Arborio rice infused with Spanish saffron, grilled chicken breast, Parmigiano Reggiano",
      ingredients: {
        create: [
          { itemId: createdItems[0].id, quantity: 0.2, unit: "KG", wastePercent: 5, cost: 5.7 },
          { itemId: createdItems[3].id, quantity: 0.03, unit: "L", wastePercent: 0, cost: 0.96 },
        ],
      },
    },
  });

  // 14. Financials: Expenses & Payments & VAT
  const expCat1 = await prisma.expenseCategory.upsert({
    where: { organizationId_code: { organizationId: org.id, code: "RENT" } },
    update: {},
    create: { organizationId: org.id, code: "RENT", nameAr: "إيجارات الفروع والمنشآت", nameEn: "Property Leases & Rent" },
  });

  const expCat2 = await prisma.expenseCategory.upsert({
    where: { organizationId_code: { organizationId: org.id, code: "SUPPLIES" } },
    update: {},
    create: { organizationId: org.id, code: "SUPPLIES", nameAr: "مشتريات المواد الغذائية", nameEn: "Food & Beverage Ingredients" },
  });

  const expCat3 = await prisma.expenseCategory.upsert({
    where: { organizationId_code: { organizationId: org.id, code: "GOV_FEES" } },
    update: {},
    create: { organizationId: org.id, code: "GOV_FEES", nameAr: "الرسوم والتراخيص الحكومية", nameEn: "Government & Municipality Fees" },
  });

  await prisma.expense.create({
    data: {
      organizationId: org.id,
      branchId: branch1.id,
      expenseNumber: "EXP-2026-001",
      categoryId: expCat2.id,
      payee: "Al Ain Farms for Livestock Production",
      date: new Date("2026-09-25"),
      amount: 14250.0,
      vatAmount: 712.5, // 5% UAE VAT
      paymentMethod: "BANK_TRANSFER",
      status: "PAID",
      description: "Weekly chilled poultry and dairy delivery invoice #AAF-9921",
      createdBy: finUser.name,
      approvedBy: ownerUser.name,
    },
  });

  await prisma.expense.create({
    data: {
      organizationId: org.id,
      branchId: branch1.id,
      expenseNumber: "EXP-2026-002",
      categoryId: expCat3.id,
      payee: "Abu Dhabi Department of Economic Development",
      date: new Date("2026-09-26"),
      amount: 4500.0,
      vatAmount: 0.0, // Exempt government fee
      paymentMethod: "CARD",
      status: "PAID",
      description: "Commercial activity license renewal fee",
      createdBy: finUser.name,
      approvedBy: ownerUser.name,
    },
  });

  await prisma.payment.create({
    data: {
      organizationId: org.id,
      branchId: branch1.id,
      paymentNumber: "PAY-2026-001",
      paymentType: "SUPPLIER",
      payee: "Al Ain Farms for Livestock Production",
      amount: 14962.5,
      paymentDate: new Date("2026-09-27"),
      paymentMethod: "BANK_TRANSFER",
      reference: "FT-ADCB-20260927-1124",
      status: "COMPLETED",
      notes: "Settlement of invoice #AAF-9921 with 5% VAT",
      createdBy: finUser.name,
    },
  });

  await prisma.taxRecord.upsert({
    where: { organizationId_taxType_period: { organizationId: org.id, taxType: "VAT", period: "2026-Q3" } },
    update: {},
    create: {
      organizationId: org.id,
      taxType: "VAT",
      period: "2026-Q3",
      taxableSales: 480000.0,
      outputVat: 24000.0, // 5% on sales
      taxablePurchases: 195000.0,
      inputVat: 9750.0, // 5% recoverable VAT
      netTaxPayable: 14250.0,
      status: "DRAFT",
      dueDate: new Date("2026-10-28"),
      notes: "Quarterly UAE FTA VAT Return (Form VAT201)",
    },
  });

  // 15. ADAFSA Food Safety Compliance
  const checklist = await prisma.foodSafetyChecklist.create({
    data: {
      organizationId: org.id,
      titleAr: "قائمة التفتيش اليومية للسلامة الغذائية - هيئة أبوظبي للزراعة والسلامة الغذائية",
      titleEn: "ADAFSA Daily Food Safety & Hygiene Checklist",
      type: "DAILY",
      items: [
        { section: "Personal Hygiene", question: "All food handlers wearing clean chef attire, hairnets, and no jewelry" },
        { section: "Temperature Control", question: "Chillers operating below 4°C and Freezers below -18°C" },
        { section: "Cross Contamination", question: "Color-coded cutting boards used correctly (Red for raw meat, Green for produce)" },
        { section: "Sanitization", question: "Three-compartment sink chemicals tested with test strips" },
      ],
    },
  });

  const inspection = await prisma.foodSafetyInspection.create({
    data: {
      organizationId: org.id,
      branchId: branch1.id,
      checklistId: checklist.id,
      inspectionDate: new Date("2026-09-29"),
      inspectorName: "Sarah Johnson (Food Safety Specialist)",
      score: 95.0,
      status: "NEEDS_ACTION",
      notes: "High overall compliance. One minor finding identified in preparation station.",
      findings: {
        create: [
          {
            section: "Temperature Control",
            question: "Chiller #2 temperature calibration",
            severity: "MEDIUM",
            description: "Chiller #2 recorded at 5.2°C during morning rush. Needs technician calibration.",
            correctiveAction: "Adjusted thermostat setting and scheduled HVAC maintenance visit.",
            assignedTo: "Chef Andrea Rossi",
            dueDate: new Date("2026-10-01"),
            status: "IN_PROGRESS",
          },
        ],
      },
    },
  });

  // Food Handler EFST Training Records
  await prisma.foodHandlerTraining.create({
    data: {
      organizationId: org.id,
      employeeId: createdEmployees[1].id, // Chef Andrea Rossi
      program: "EFST",
      provider: "ADAFSA Certified Food Hygiene Academy",
      certificateNumber: "EFST-AD-2024-88412",
      trainingDate: new Date("2024-11-15"),
      expiryDate: new Date("2027-11-14"),
      status: "ACTIVE",
      notes: "Essential Food Safety Training valid for 3 years",
    },
  });

  await prisma.foodHandlerTraining.create({
    data: {
      organizationId: org.id,
      employeeId: createdEmployees[4].id, // Rajesh Kumar (Commis)
      program: "EFST",
      provider: "ADAFSA Certified Training Center",
      certificateNumber: "EFST-AD-2025-10492",
      trainingDate: new Date("2025-04-10"),
      expiryDate: new Date("2028-04-09"),
      status: "ACTIVE",
      notes: "Essential Food Safety Training certificate",
    },
  });

  // 16. Attendance & Shifts (UAE Labour Law 2021 compliant)
  const today = new Date();
  for (const emp of createdEmployees) {
    await prisma.attendanceRecord.create({
      data: {
        organizationId: org.id,
        employeeId: emp.id,
        branchId: emp.branchId,
        workDate: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        scheduledStart: "08:00",
        scheduledEnd: "16:00",
        actualClockIn: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 7, 58),
        actualClockOut: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 5),
        breakMinutes: 60,
        lateMinutes: 0,
        overtimeMinutes: 5,
        status: "PRESENT",
        source: "BIOMETRIC",
      },
    });
  }

  // 17. In-App Notifications
  await prisma.notification.create({
    data: {
      organizationId: org.id,
      branchId: branch1.id,
      userId: ownerUser.id,
      type: "DOC_EXPIRY",
      title: "Commercial Tenancy Lease Expiring Soon",
      body: "Al Bateen Marina Tawtheeq Lease Contract expires in 22 days. Renewal procedure required.",
      severity: "WARNING",
      relatedEntityType: "DOCUMENT",
      relatedEntityId: leaseDoc.id,
    },
  });

  await prisma.notification.create({
    data: {
      organizationId: org.id,
      branchId: branch1.id,
      userId: compUser.id,
      type: "DOC_EXPIRY",
      title: "Civil Defense Safety Certificate Expired",
      body: "Civil Defense Certificate expired 5 days ago. High priority renewal underway.",
      severity: "CRITICAL",
      relatedEntityType: "DOCUMENT",
      relatedEntityId: cdDoc.id,
    },
  });

  // 18. Audit Trail & Cryptographic HMAC Hash Chaining
  let prevHash = "0000000000000000000000000000000000000000000000000000000000000000";

  const auditEvents = [
    {
      actorUserId: ownerUser.id,
      actorNameSnapshot: ownerUser.name,
      actorEmailSnapshot: ownerUser.email,
      action: "INITIAL_SETUP",
      module: "security",
      entityType: "ORGANIZATION",
      entityId: org.id,
      entityDisplayName: org.nameEn,
      occurredAt: new Date(Date.now() - 3600000 * 5),
      changesBefore: null,
      changesAfter: { organization: org.nameEn, trn: org.trn, emirate: org.emirate },
      changedFields: JSON.stringify(["organization", "trn", "emirate"]),
      reason: "System initialization and organization onboarding",
    },
    {
      actorUserId: ownerUser.id,
      actorNameSnapshot: ownerUser.name,
      actorEmailSnapshot: ownerUser.email,
      action: "CREATE",
      module: "document",
      entityType: "DOCUMENT",
      entityId: tradeLicenseDoc.id,
      entityDisplayName: tradeLicenseDoc.title,
      occurredAt: new Date(Date.now() - 3600000 * 4),
      changesBefore: null,
      changesAfter: { title: tradeLicenseDoc.title, ref: tradeLicenseDoc.referenceNumber, expiry: tradeLicenseDoc.expiryDate },
      changedFields: JSON.stringify(["title", "referenceNumber", "expiryDate"]),
      reason: "Official Commercial Trade License registration",
    },
    {
      actorUserId: hrUser.id,
      actorNameSnapshot: hrUser.name,
      actorEmailSnapshot: hrUser.email,
      action: "CREATE",
      module: "employee",
      entityType: "EMPLOYEE",
      entityId: createdEmployees[2].id,
      entityDisplayName: createdEmployees[2].nameEn,
      occurredAt: new Date(Date.now() - 3600000 * 3),
      changesBefore: null,
      changesAfter: { name: createdEmployees[2].nameEn, salary: 3500, jobTitle: "Senior Restaurant Waiter" },
      changedFields: JSON.stringify(["name", "salary", "jobTitle"]),
      reason: "Staff hiring and onboarding completed",
    },
    {
      actorUserId: compUser.id,
      actorNameSnapshot: compUser.name,
      actorEmailSnapshot: compUser.email,
      action: "CREATE",
      module: "food_safety",
      entityType: "INSPECTION",
      entityId: inspection.id,
      entityDisplayName: "ADAFSA Daily Hygiene Inspection",
      occurredAt: new Date(Date.now() - 3600000 * 2),
      changesBefore: null,
      changesAfter: { score: 95, status: "NEEDS_ACTION", findingsCount: 1 },
      changedFields: JSON.stringify(["score", "status"]),
      reason: "ADAFSA daily internal self-inspection completed",
    },
    {
      actorUserId: finUser.id,
      actorNameSnapshot: finUser.name,
      actorEmailSnapshot: finUser.email,
      action: "CREATE",
      module: "finance",
      entityType: "PAYMENT",
      entityId: "PAY-2026-001",
      entityDisplayName: "Settlement to Al Ain Farms",
      occurredAt: new Date(Date.now() - 3600000 * 1),
      changesBefore: null,
      changesAfter: { amount: 14962.5, currency: "AED", payee: "Al Ain Farms" },
      changedFields: JSON.stringify(["amount", "payee"]),
      reason: "Supplier settlement via ADCB bank transfer",
    },
  ];

  let seq = 1;
  for (const ev of auditEvents) {
    const hash = computeAuditHash(prevHash, {
      sequenceNumber: seq,
      actorUserId: ev.actorUserId,
      action: ev.action,
      entityType: ev.entityType,
      entityId: ev.entityId,
      occurredAt: ev.occurredAt.toISOString(),
      changesAfter: ev.changesAfter,
    });

    await prisma.auditLog.create({
      data: {
        sequenceNumber: seq,
        organizationId: org.id,
        branchId: branch1.id,
        actorUserId: ev.actorUserId,
        actorNameSnapshot: ev.actorNameSnapshot,
        actorEmailSnapshot: ev.actorEmailSnapshot,
        action: ev.action,
        module: ev.module,
        entityType: ev.entityType,
        entityId: ev.entityId,
        entityDisplayName: ev.entityDisplayName,
        occurredAt: ev.occurredAt,
        success: true,
        reason: ev.reason,
        changesBefore: ev.changesBefore || undefined,
        changesAfter: ev.changesAfter,
        changedFields: ev.changedFields,
        previousHash: prevHash,
        hash: hash,
      },
    });

    prevHash = hash;
    seq++;
  }

  // Update chain head
  await prisma.auditChainHead.upsert({
    where: { organizationId: org.id },
    update: {
      sequenceNumber: seq - 1,
      currentHash: prevHash,
    },
    create: {
      organizationId: org.id,
      sequenceNumber: seq - 1,
      currentHash: prevHash,
    },
  });

  console.log("Seeding completed successfully!");
  console.log("Created users:");
  console.log(" - Owner: owner@tasha.ae (Login: OwnerLogin@2026! | Auth: OwnerAuth@2026!)");
  console.log(" - HR: hrmanager@tasha.ae (Login: HrManager@2026! | Auth: HrAuth@2026!)");
  console.log(" - Branch Mgr: bm.bateen@tasha.ae (Login: BranchMgr@2026! | Auth: BranchAuth@2026!)");
  console.log(" - Finance: finance@tasha.ae (Login: FinanceMgr@2026! | Auth: FinanceAuth@2026!)");
  console.log(" - Compliance: compliance@tasha.ae (Login: Compliance@2026! | Auth: ComplianceAuth@2026!)");
}

main()
  .catch((e) => {
    console.error("Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
