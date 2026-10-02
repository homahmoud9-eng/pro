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

  // 10. Official Statutory Regulatory Requirements (ADAFSA & UAE Authorities)
  const regulatoryRequirements = [
    {
      code: "ADAFSA-EFST-01",
      authority: "ADAFSA",
      category: "EFST_TRAINING",
      titleAr: "شهادة تدريب سلامة الغذاء الأساسية (EFST) لمتداولي الأغذية",
      titleEn: "Essential Food Safety Training (EFST) for Food Handlers",
      sourceReference: "ADAFSA Food Hygiene Regulation No. (6) of 2020 / EFST Directive",
      sourceUrl: "https://www.adafsa.gov.ae",
      scope: "EMPLOYEE",
      frequency: "CONTINUOUS",
      evidenceRequired: true,
      descriptionAr: "إلزامية تدريب واجتياز اختبار سلامة الغذاء الأساسي لجميع العاملين في إعداد وتداول الأغذية من خلال مراكز معتمدة من أدافسيا.",
      descriptionEn: "Mandatory training and examination for all personnel handling food in food service establishments via ADAFSA-approved training centers.",
      notes: "ADAFSA Official Statutory Requirement. Certificate valid for statutory duration and tracked per employee.",
    },
    {
      code: "ADAFSA-TEMP-01",
      authority: "ADAFSA",
      category: "TEMPERATURE_CONTROL",
      titleAr: "الرقابة على درجات حرارة التبريد والتجميد وحفظ الأطعمة",
      titleEn: "Chilled & Frozen Storage Temperature Monitoring (Max 4°C / -18°C)",
      sourceReference: "ADAFSA Code of Practice No. (1) of 2012, Sec 4.2",
      sourceUrl: "https://www.adafsa.gov.ae",
      scope: "BRANCH",
      frequency: "DAILY",
      evidenceRequired: true,
      descriptionAr: "الحفاظ على درجات حرارة التبريد (<= 4°C)، التجميد (<= -18°C)، وحفظ الأطعمة الساخنة (>= 60°C) وتوثيق القراءات مرتين يومياً.",
      descriptionEn: "Maintain and document chilling (<= 4°C), freezing (<= -18°C), and hot holding (>= 60°C) with twice-daily operational logging.",
      notes: "Statutory food safety control point verified during ADAFSA routine and surprise inspections.",
    },
    {
      code: "ADAFSA-PEST-01",
      authority: "ADAFSA",
      category: "PEST_CONTROL",
      titleAr: "عقد وسجلات مكافحة آفات الصحة العامة المعتمدة",
      titleEn: "Approved Pest Control Contract & Periodic Service Reports",
      sourceReference: "ADAFSA Food Hygiene Regulation No. (6) of 2020, Article 18",
      sourceUrl: "https://www.adafsa.gov.ae",
      scope: "BRANCH",
      frequency: "MONTHLY",
      evidenceRequired: true,
      descriptionAr: "التعاقد مع مشغل مكافحة آفات مرخص من مركز أبوظبي لإدارة النفايات (تدوير) مع حفظ تقارير الزيارات الدورية ومواقع الفخاخ.",
      descriptionEn: "Contract with a licensed pest control operator with periodic service logs, trap layout maps, and chemical safety data sheets.",
      notes: "Must maintain signed physical/digital inspection certificates at the establishment.",
    },
    {
      code: "ADAFSA-CLEAN-01",
      authority: "ADAFSA",
      category: "PREMISES_HYGIENE",
      titleAr: "جدول التنظيف والتعقيم اليومي ومصائد الشحوم",
      titleEn: "Sanitation Schedule, Food Contact Surfaces & Grease Trap Maintenance",
      sourceReference: "ADAFSA Code of Practice No. (1) of 2012, Sec 6",
      sourceUrl: "https://www.adafsa.gov.ae",
      scope: "BRANCH",
      frequency: "DAILY",
      evidenceRequired: true,
      descriptionAr: "جداول وسجلات التنظيف والتعقيم للأسطح الملامسة للغذاء، وسجلات صيانة وتفريغ مصائد الشحوم.",
      descriptionEn: "Documented sanitation schedules for food preparation areas, contact equipment, and regular grease trap pumping.",
      notes: "Food-grade sanitizers must meet statutory ppm concentration thresholds.",
    },
    {
      code: "ADAFSA-TRACE-01",
      authority: "ADAFSA",
      category: "TRACEABILITY_RECALL",
      titleAr: "نظام التتبع والاستدعاء وسجلات استلام الأغذية",
      titleEn: "Food Traceability, Receiving Checks & Recall Readiness Plan",
      sourceReference: "ADAFSA Regulation No. (1) of 2008 concerning Traceability and Recall of Food",
      sourceUrl: "https://www.adafsa.gov.ae",
      scope: "BRANCH",
      frequency: "CONTINUOUS",
      evidenceRequired: true,
      descriptionAr: "الاحتفاظ بفواتير التوريد، أرقام التشغيلات (Lot/Batch)، فحص درجات حرارة الاستلام، وجاهزية خطة استدعاء المواد الغذائية.",
      descriptionEn: "One-step-back and one-step-forward traceability, delivery vehicle inspection logs, batch records, and mock recall procedures.",
      notes: "Full traceability records must be retrievable within statutory timeframes upon ADAFSA request.",
    },
    {
      code: "ADAFSA-HACCP-01",
      authority: "ADAFSA",
      category: "HACCP",
      titleAr: "نظام إدارة سلامة الغذاء القائم على مبادئ الهاسب (HACCP)",
      titleEn: "HACCP-based Food Safety Management System & CCP Monitoring",
      sourceReference: "ADAFSA Regulation No. (6) of 2020, Article 8",
      sourceUrl: "https://www.adafsa.gov.ae",
      scope: "BRANCH",
      frequency: "CONTINUOUS",
      evidenceRequired: true,
      descriptionAr: "تحديد نقاط التحكم الحرجة (CCPs)، وتعيين مسؤول مدرب، وحفظ سجلات المراجعة الدورية.",
      descriptionEn: "Hazard analysis, Critical Control Point (CCP) monitoring, corrective action protocols, and certified supervisory personnel.",
      notes: "Separates food safety management system implementation from basic handler training.",
    },
    {
      code: "CIVILDEF-FIRE-01",
      authority: "CIVIL_DEFENSE",
      category: "LICENSING",
      titleAr: "شهادة استيفاء شروط السلامة والوقاية من الحريق للدفاع المدني",
      titleEn: "Civil Defense Fire Safety Compliance & Equipment Certification",
      sourceReference: "Abu Dhabi Civil Defense Authority Fire Safety Regulations",
      sourceUrl: "https://www.adcd.gov.ae",
      scope: "BRANCH",
      frequency: "ANNUAL",
      evidenceRequired: true,
      descriptionAr: "شهادة سنوية سارية لنظام إخماد حريق المطبخ (Ansul system) وكواشف الدخان وطفيات الحريق.",
      descriptionEn: "Annual civil defense inspection certificate and kitchen hood fire suppression system maintenance contract.",
      notes: "Mandatory prerequisite for municipal trade license renewal.",
    },
    {
      code: "ADDED-TL-01",
      authority: "DED_ABU_DHABI",
      category: "LICENSING",
      titleAr: "الرخصة التجارية وعقد الإيجار وتوثيق الساري",
      titleEn: "Commercial Trade License & Tawtheeq Tenancy Registration",
      sourceReference: "Abu Dhabi Department of Economic Development (ADDED) Regulations",
      sourceUrl: "https://www.added.gov.ae",
      scope: "ALL",
      frequency: "ANNUAL",
      evidenceRequired: true,
      descriptionAr: "الرخصة التجارية الرئيسية وفروع المنشأة، مع اشتراط التوثيق الساري للموقع.",
      descriptionEn: "Commercial trade license issued by ADDED and registered municipal tenancy contract (Tawtheeq).",
      notes: "Primary statutory business and branch operating license.",
    },
  ];

  for (const req of regulatoryRequirements) {
    const upsertedReq = await prisma.regulatoryRequirement.upsert({
      where: { organizationId_code: { organizationId: org.id, code: req.code } },
      update: {
        titleAr: req.titleAr,
        titleEn: req.titleEn,
        sourceReference: req.sourceReference,
        sourceUrl: req.sourceUrl,
        category: req.category,
        authority: req.authority,
        scope: req.scope,
        frequency: req.frequency,
        evidenceRequired: req.evidenceRequired,
        descriptionAr: req.descriptionAr,
        descriptionEn: req.descriptionEn,
        notes: req.notes,
      },
      create: {
        organizationId: org.id,
        code: req.code,
        titleAr: req.titleAr,
        titleEn: req.titleEn,
        sourceReference: req.sourceReference,
        sourceUrl: req.sourceUrl,
        category: req.category,
        authority: req.authority,
        scope: req.scope,
        frequency: req.frequency,
        evidenceRequired: req.evidenceRequired,
        descriptionAr: req.descriptionAr,
        descriptionEn: req.descriptionEn,
        notes: req.notes,
      },
    });

    const existingVersion = await prisma.regulatoryRequirementVersion.findFirst({
      where: { requirementId: upsertedReq.id, versionNumber: 1 },
    });
    if (!existingVersion) {
      await prisma.regulatoryRequirementVersion.create({
        data: {
          requirementId: upsertedReq.id,
          versionNumber: 1,
          effectiveDate: new Date("2026-01-01"),
          sourceRef: req.sourceReference,
          changeNotes: "Initial statutory baseline registration pursuant to Abu Dhabi regulatory framework.",
        },
      });
    }
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
