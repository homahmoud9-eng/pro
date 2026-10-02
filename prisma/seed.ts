import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Clean Production Foundation for UAE Restaurant Enterprise System...");

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

  // 2. Base Departments
  const departments = [
    { code: "MGMT", nameAr: "الإدارة العليا", nameEn: "Executive Management" },
    { code: "HR", nameAr: "الموارد البشرية والتعقيب", nameEn: "HR & Public Relations" },
    { code: "FIN", nameAr: "المالية والحسابات", nameEn: "Finance & Accounts" },
    { code: "KIT", nameAr: "المطبخ والطهي", nameEn: "Kitchen & Culinary" },
    { code: "SRV", nameAr: "الضيافة والخدمة", nameEn: "Front of House & Service" },
    { code: "PROC", nameAr: "المشتريات وسلاسل الإمداد", nameEn: "Procurement & Supply Chain" },
    { code: "COMP", nameAr: "الامتثال والسلامة الغذائية", nameEn: "Compliance & Food Safety" },
  ];

  for (const d of departments) {
    await prisma.department.upsert({
      where: { organizationId_code: { organizationId: org.id, code: d.code } },
      update: {},
      create: {
        organizationId: org.id,
        code: d.code,
        nameAr: d.nameAr,
        nameEn: d.nameEn,
      },
    });
  }

  // 3. System Permissions
  const permissionsList = [
    { code: "business.read", module: "business", description: "View company profile and branches" },
    { code: "business.update", module: "business", description: "Update company profile and branch details" },
    { code: "CREATE_BRANCH", module: "business", description: "Create restaurant branches" },
    { code: "EDIT_BRANCH", module: "business", description: "Edit branch details" },
    { code: "ARCHIVE_BRANCH", module: "business", description: "Archive or deactivate restaurant branches" },
    { code: "REACTIVATE_BRANCH", module: "business", description: "Reactivate archived branches" },
    { code: "branch.create", module: "business", description: "Create restaurant branches (alias)" },
    { code: "branch.update", module: "business", description: "Edit branch details (alias)" },
    { code: "branch.archive", module: "business", description: "Archive branches (alias)" },
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

  // 4. Exactly ONE Application Role: Owner
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

  // Assign ALL permissions to Owner role
  for (const permCode of Object.keys(permMap)) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: ownerRole.id, permissionId: permMap[permCode] } },
      update: {},
      create: { roleId: ownerRole.id, permissionId: permMap[permCode] },
    });
  }

  // 5. Real Owner Account with Two-Level Password Security
  const saltRounds = 10;
  const ownerLoginHash = await bcrypt.hash("OwnerLogin@2026!", saltRounds);
  const ownerAuthHash = await bcrypt.hash("OwnerAuth@2026!", saltRounds);

  const ownerUser = await prisma.user.upsert({
    where: { email: "owner@tasha.ae" },
    update: {
      status: "ACTIVE",
    },
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
      failedLoginAttempts: 0,
      failedAuthAttempts: 0,
      lockedUntil: null,
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

  // 6. Base Regulatory Document Types (Schema configurations without dummy files)
  const docTypes = [
    // Business Legal & Licenses
    { nameAr: "الرخصة التجارية الرئيسية", nameEn: "Main Trade License", category: "Business Legal", requiresPdf: true, requiresExpiryDate: true, requiresReferenceNumber: true },
    { nameAr: "الرخصة الاقتصادية", nameEn: "Economic License", category: "Business Legal", requiresPdf: true, requiresExpiryDate: true, requiresReferenceNumber: true },
    { nameAr: "السجل التجاري", nameEn: "Commercial License", category: "Business Legal", requiresPdf: true, requiresExpiryDate: true, requiresReferenceNumber: true },
    { nameAr: "بطاقة المنشأة", nameEn: "Establishment Card", category: "Business Legal", requiresPdf: true, requiresExpiryDate: true, requiresReferenceNumber: true },
    { nameAr: "شهادات ورخص التسجيل الحكومي", nameEn: "Government Registration Certificate", category: "Business Legal", requiresPdf: true, requiresExpiryDate: true, requiresReferenceNumber: true },

    // Company & Ownership
    { nameAr: "عقد التأسيس", nameEn: "Memorandum of Association", category: "Business Legal", requiresPdf: true, requiresExpiryDate: false, requiresReferenceNumber: true },
    { nameAr: "النظام الأساسي للشركة", nameEn: "Articles of Association", category: "Business Legal", requiresPdf: true, requiresExpiryDate: false, requiresReferenceNumber: true },
    { nameAr: "اتفاقية الشراكة والملكية", nameEn: "Partnership Agreement", category: "Business Legal", requiresPdf: true, requiresExpiryDate: false, requiresReferenceNumber: true },
    { nameAr: "وثائق ومستندات الملكية", nameEn: "Ownership Documents", category: "Business Legal", requiresPdf: true, requiresExpiryDate: false, requiresReferenceNumber: true },
    { nameAr: "سجل وشهادات المساهمين", nameEn: "Shareholder Documents", category: "Business Legal", requiresPdf: true, requiresExpiryDate: false, requiresReferenceNumber: true },

    // Tax
    { nameAr: "شهادة التسجيل الضريبي TRN", nameEn: "Tax Registration Certificate", category: "Tax", requiresPdf: true, requiresExpiryDate: false, requiresReferenceNumber: true },
    { nameAr: "شهادة التسجيل في ضريبة القيمة المضافة", nameEn: "VAT Registration Certificate", category: "Tax", requiresPdf: true, requiresExpiryDate: false, requiresReferenceNumber: true },

    // Contracts
    { nameAr: "عقد الإيجار والتوثيق الرئيسي", nameEn: "Main Tenancy Lease", category: "Contracts", requiresPdf: true, requiresExpiryDate: true, requiresReferenceNumber: true },
    { nameAr: "عقود الخدمات والتشغيل", nameEn: "Service Contracts", category: "Contracts", requiresPdf: true, requiresExpiryDate: true, requiresReferenceNumber: true },
    { nameAr: "عقود التأمين المؤسسي", nameEn: "Insurance Contracts", category: "Contracts", requiresPdf: true, requiresExpiryDate: true, requiresReferenceNumber: true },
    { nameAr: "عقود التوريد والموردين", nameEn: "Supplier Contracts", category: "Contracts", requiresPdf: true, requiresExpiryDate: true, requiresReferenceNumber: true },
    { nameAr: "عقود واتفاقيات الشركة الأخرى", nameEn: "Other Company Contracts", category: "Contracts", requiresPdf: true, requiresExpiryDate: true, requiresReferenceNumber: true },

    // Compliance
    { nameAr: "وثيقة التأمين الشامل", nameEn: "Company Insurance", category: "Compliance", requiresPdf: true, requiresExpiryDate: true, requiresReferenceNumber: true },
    { nameAr: "تصريح المنشأة الغذائية (أدافسيا)", nameEn: "ADAFSA Food Permit", category: "Compliance", requiresPdf: true, requiresExpiryDate: true, requiresReferenceNumber: true },
    { nameAr: "شهادة الدفاع المدني والسلامة", nameEn: "Civil Defense Certificate", category: "Compliance", requiresPdf: true, requiresExpiryDate: true, requiresReferenceNumber: true },
    { nameAr: "شهادة الصحة والسلامة المهنية", nameEn: "Health & Safety Certificate", category: "Compliance", requiresPdf: true, requiresExpiryDate: true, requiresReferenceNumber: true },
    { nameAr: "الشهادات والاعتمادات الحكومية", nameEn: "Government Certificates", category: "Compliance", requiresPdf: true, requiresExpiryDate: true, requiresReferenceNumber: true },
    { nameAr: "شهادات الامتثال والرقابة الأخرى", nameEn: "Other Compliance Documents", category: "Compliance", requiresPdf: true, requiresExpiryDate: true, requiresReferenceNumber: true },

    // Other Legal / Internal
    { nameAr: "السياسات واللوائح الداخلية", nameEn: "Internal Documents", category: "Other", requiresPdf: true, requiresExpiryDate: false, requiresReferenceNumber: false },
    { nameAr: "مستندات قانونية ورسمية أخرى", nameEn: "Other Legal Documents", category: "Other", requiresPdf: true, requiresExpiryDate: false, requiresReferenceNumber: false },

    // Branch & Employee Specific
    { nameAr: "الرخصة التجارية", nameEn: "Trade License", category: "Business Legal", requiresPdf: true, requiresExpiryDate: true, requiresReferenceNumber: true },
    { nameAr: "عقد الإيجار والتوثيق", nameEn: "Tawtheeq Lease Contract", category: "Business Legal", requiresPdf: true, requiresExpiryDate: true, requiresReferenceNumber: true },
    { nameAr: "جواز السفر للموظف", nameEn: "Employee Passport", category: "Employee Identity", requiresPdf: true, requiresExpiryDate: true, requiresReferenceNumber: true },
    { nameAr: "بطاقة الهوية الإماراتية", nameEn: "Emirates ID", category: "Employee Identity", requiresPdf: true, requiresExpiryDate: true, requiresReferenceNumber: true },
    { nameAr: "تأشيرة الإقامة والعمل", nameEn: "Residency Visa", category: "Employee Identity", requiresPdf: true, requiresExpiryDate: true, requiresReferenceNumber: true },
    { nameAr: "تصريح عمل وزارة الموارد البشرية", nameEn: "MOHRE Work Permit", category: "Employee Contract", requiresPdf: true, requiresExpiryDate: true, requiresReferenceNumber: true },
    { nameAr: "عقد العمل الموحد", nameEn: "Employment Contract", category: "Employee Contract", requiresPdf: true, requiresExpiryDate: true, requiresReferenceNumber: true },
    { nameAr: "شهادة تدريب سلامة الغذاء EFST", nameEn: "EFST Training Certificate", category: "Compliance", requiresPdf: true, requiresExpiryDate: true, requiresReferenceNumber: true },
    { nameAr: "التأمين الصحي الإلزامي", nameEn: "Health Insurance Card", category: "Employee Identity", requiresPdf: true, requiresExpiryDate: true, requiresReferenceNumber: true },
  ];

  for (const dt of docTypes) {
    await prisma.documentType.upsert({
      where: { organizationId_nameEn: { organizationId: org.id, nameEn: dt.nameEn } },
      update: {},
      create: {
        organizationId: org.id,
        ...dt,
      },
    });
  }

  // 7. Base Expense Categories
  const expenseCategories = [
    { code: "MUNICIPALITY_FEES", nameAr: "رسوم بلدية وتراخيص", nameEn: "Municipality & Licensing Fees" },
    { code: "UTILITIES", nameAr: "كهرباء ومياه وغاز", nameEn: "Utilities (Water, Power, Gas)" },
    { code: "KITCHEN_MAINTENANCE", nameAr: "صيانة أجهزة ومطابخ", nameEn: "Kitchen Equipment Maintenance" },
    { code: "PACKAGING", nameAr: "مواد تعبئة وتغليف", nameEn: "Packaging Supplies" },
    { code: "CLEANING_SUPPLIES", nameAr: "مواد نظافة وتعقيم", nameEn: "Sanitization & Cleaning Supplies" },
  ];

  for (const ec of expenseCategories) {
    await prisma.expenseCategory.upsert({
      where: { organizationId_code: { organizationId: org.id, code: ec.code } },
      update: {},
      create: {
        organizationId: org.id,
        code: ec.code,
        nameAr: ec.nameAr,
        nameEn: ec.nameEn,
      },
    });
  }

  // 8. Base Leave Types
  const leaveTypes = [
    { code: "ANNUAL", nameAr: "إجازة سنوية مدفوعة", nameEn: "Annual Paid Leave", defaultDaysPerYear: 30, isPaid: true },
    { code: "SICK", nameAr: "إجازة مرضية", nameEn: "Sick Leave", defaultDaysPerYear: 15, isPaid: true },
    { code: "BEREAVEMENT", nameAr: "إجازة حداد", nameEn: "Bereavement Leave", defaultDaysPerYear: 5, isPaid: true },
  ];

  for (const lt of leaveTypes) {
    await prisma.leaveType.upsert({
      where: { organizationId_code: { organizationId: org.id, code: lt.code } },
      update: {},
      create: {
        organizationId: org.id,
        code: lt.code,
        nameAr: lt.nameAr,
        nameEn: lt.nameEn,
        defaultDaysPerYear: lt.defaultDaysPerYear,
        isPaid: lt.isPaid,
      },
    });
  }

  // 9. Initialize Audit Chain Head if missing
  const chainHead = await prisma.auditChainHead.findUnique({
    where: { organizationId: org.id },
  });

  if (!chainHead) {
    await prisma.auditChainHead.create({
      data: {
        organizationId: org.id,
        sequenceNumber: 0,
        currentHash: "0000000000000000000000000000000000000000000000000000000000000000",
      },
    });
  }

  console.log("✅ Clean Foundation Seeding Completed.");
  console.log("No demo business entities created. Ready for real owner data.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
