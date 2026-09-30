import { prisma } from "../src/lib/db/prisma";
import { saveDocumentFile } from "../src/lib/storage/document-storage";
import crypto from "crypto";

async function seedBranchDocs() {
  console.log("==================================================");
  console.log("🌱 SEEDING BRANCH-SPECIFIC LEGAL DOCUMENTS");
  console.log("==================================================");

  const org = await prisma.organization.findFirst({
    where: { code: "ORG-01" },
  });
  if (!org) throw new Error("Organization ORG-01 not found");

  const branches = await prisma.branch.findMany({
    where: { organizationId: org.id },
    orderBy: { code: "asc" },
  });
  console.log(`Found ${branches.length} branches:`, branches.map((b) => `${b.code}: ${b.nameEn}`));

  // 1. Comprehensive Document Types Definition
  const documentTypesData = [
    // Legal / Licenses
    { nameEn: "Trade License", nameAr: "الرخصة التجارية", category: "Legal / Licenses" },
    { nameEn: "Commercial License", nameAr: "الرخصة المهنية والتجارية", category: "Legal / Licenses" },
    { nameEn: "Municipality License", nameAr: "رخصة البلدية", category: "Legal / Licenses" },
    { nameEn: "Food License", nameAr: "رخصة المنشأة الغذائية", category: "Legal / Licenses" },
    { nameEn: "Civil Defense Certificate", nameAr: "شهادة الدفاع المدني والسلامة", category: "Legal / Licenses" },
    { nameEn: "Health & Safety Permit", nameAr: "تصريح الصحة والسلامة المهنية", category: "Legal / Licenses" },
    { nameEn: "Tawtheeq Lease Contract", nameAr: "عقد الإيجار والتوثيق", category: "Legal / Licenses" },
    { nameEn: "Establishment Card", nameAr: "بطاقة المنشأة - الهجرة", category: "Legal / Licenses" },
    { nameEn: "Operating Permit", nameAr: "تصريح التشغيل التجاري", category: "Legal / Licenses" },

    // Contracts
    { nameEn: "Tenancy Contract", nameAr: "عقد الإيجار التجاري", category: "Contracts" },
    { nameEn: "Supplier Contract", nameAr: "عقد توريد رئيسي", category: "Contracts" },
    { nameEn: "Service Contract", nameAr: "عقد تقديم خدمات", category: "Contracts" },
    { nameEn: "Maintenance Contract", nameAr: "عقد صيانة المعدات والأنظمة", category: "Contracts" },
    { nameEn: "Cleaning Contract", nameAr: "عقد النظافة والتعقيم المتخصص", category: "Contracts" },
    { nameEn: "Security Contract", nameAr: "عقد الحراسة والأمن", category: "Contracts" },
    { nameEn: "Other Contract", nameAr: "عقود واتفاقيات أخرى", category: "Contracts" },

    // Compliance
    { nameEn: "Food Safety Certificate", nameAr: "شهادة سلامة الغذاء", category: "Compliance" },
    { nameEn: "ADAFSA Food Permit", nameAr: "تصريح المنشأة الغذائية (أدافسيا)", category: "Compliance" },
    { nameEn: "Inspection Certificate", nameAr: "شهادة التفتيش والرقابة", category: "Compliance" },
    { nameEn: "Health Certificate", nameAr: "الشهادة الصحية للمنشأة", category: "Compliance" },
    { nameEn: "Fire Safety Certificate", nameAr: "شهادة السلامة من الحرائق", category: "Compliance" },
    { nameEn: "Pest Control Certificate", nameAr: "شهادة مكافحة الحشرات والقوارض", category: "Compliance" },
    { nameEn: "EFST Training Certificate", nameAr: "شهادة تدريب سلامة الغذاء EFST", category: "Compliance" },
    { nameEn: "Other Compliance Document", nameAr: "وثائق الامتثال والرقابة الأخرى", category: "Compliance" },

    // Other
    { nameEn: "Comprehensive Business Insurance", nameAr: "وثيقة التأمين الشامل للمطعم", category: "Other" },
    { nameEn: "Government Document", nameAr: "مستند ومراسلات حكومية", category: "Other" },
    { nameEn: "Internal Policy Document", nameAr: "سياسات ولوائح التشغيل الداخلية", category: "Other" },
    { nameEn: "Tax Registration Certificate", nameAr: "شهادة التسجيل الضريبي TRN", category: "Other" },
  ];

  const typeMap: Record<string, string> = {};
  for (const dt of documentTypesData) {
    const upserted = await prisma.documentType.upsert({
      where: { organizationId_nameEn: { organizationId: org.id, nameEn: dt.nameEn } },
      update: { category: dt.category, nameAr: dt.nameAr },
      create: {
        organizationId: org.id,
        nameEn: dt.nameEn,
        nameAr: dt.nameAr,
        category: dt.category,
        requiresPdf: true,
        requiresExpiryDate: true,
        requiresReferenceNumber: true,
      },
    });
    typeMap[dt.nameEn] = upserted.id;
  }
  console.log(`✅ Loaded ${Object.keys(typeMap).length} document types.`);

  // Function to create minimal PDF buffer
  function makePdf(text: string): Buffer {
    const content = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 75 >>\nstream\nBT\n/F1 14 Tf\n50 700 Td\n(${text}) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000216 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n341\n%%EOF\n`;
    return Buffer.from(content);
  }

  // Branch 1: Al Bateen (BR-01)
  const b1 = branches.find((b) => b.code === "BR-01")!;
  // Branch 2: Yas Mall (BR-02)
  const b2 = branches.find((b) => b.code === "BR-02")!;
  // Branch 3: Musaffah (BR-03)
  const b3 = branches.find((b) => b.code === "BR-03")!;

  const now = new Date();
  const dFuture = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const dPast = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const branchDocsSeed = [
    // --- BRANCH 1: Al Bateen (BR-01) ---
    {
      branchId: b1.id,
      typeName: "Civil Defense Certificate",
      title: "Al Bateen Civil Defense Safety Certificate 2026",
      ref: "CD-AB-2026-081",
      issueDate: dPast(120),
      expiryDate: dFuture(245),
      status: "ACTIVE",
      uploadedBy: "Tariq Al Mansoori",
      notes: "Annual safety clearance approved by Abu Dhabi Civil Defense Authority",
    },
    {
      branchId: b1.id,
      typeName: "Pest Control Certificate",
      title: "Al Bateen Marina Quarterly Pest Control Protocol",
      ref: "PC-M-99120",
      issueDate: dPast(45),
      expiryDate: dFuture(45),
      status: "ACTIVE",
      uploadedBy: "Mahmoud Al Nuaimi",
      notes: "Carried out by certified pest management contractor",
    },
    {
      branchId: b1.id,
      typeName: "Maintenance Contract",
      title: "Al Bateen HVAC & Kitchen Refrigeration Annual SLA",
      ref: "SLA-HVAC-2025",
      issueDate: dPast(350),
      expiryDate: dFuture(15), // Expiring Soon!
      status: "EXPIRING_SOON",
      uploadedBy: "Tariq Al Mansoori",
      notes: "Scheduled for renewal review next week with Carrier UAE",
    },

    // --- BRANCH 2: Yas Mall (BR-02) ---
    {
      branchId: b2.id,
      typeName: "Trade License",
      title: "Yas Mall Branch Commercial License 2026 - Abu Dhabi DED",
      ref: "CN-2025-449102",
      issueDate: dPast(180),
      expiryDate: dFuture(185),
      status: "ACTIVE",
      uploadedBy: "Tariq Al Mansoori",
      notes: "Branch trade license under Abu Dhabi Department of Economic Development",
    },
    {
      branchId: b2.id,
      typeName: "Tenancy Contract",
      title: "Yas Mall Waterfront Retail Lease Agreement",
      ref: "ALD-YM-R881",
      issueDate: dPast(300),
      expiryDate: dFuture(420),
      status: "ACTIVE",
      uploadedBy: "Tariq Al Mansoori",
      notes: "Registered with Aldar Properties PJSC commercial leasing",
    },
    {
      branchId: b2.id,
      typeName: "ADAFSA Food Permit",
      title: "Yas Mall Dining Boulevard Food Safety Authorization",
      ref: "ADAFSA-FB-2026-441",
      issueDate: dPast(90),
      expiryDate: dFuture(275),
      status: "ACTIVE",
      uploadedBy: "Karim Hassan",
      notes: "Grade A compliance evaluation by Abu Dhabi Agriculture & Food Safety Authority",
    },
    {
      branchId: b2.id,
      typeName: "Civil Defense Certificate",
      title: "Yas Mall Civil Defense Fire Suppression Compliance",
      ref: "CD-YAS-9002-A",
      issueDate: dPast(400),
      expiryDate: dPast(35), // Expired!
      status: "EXPIRED",
      uploadedBy: "Karim Hassan",
      notes: "Pending civil defense inspector re-visit following sprinkler upgrade",
    },
    {
      branchId: b2.id,
      typeName: "Cleaning Contract",
      title: "Yas Mall Deep Sanitation & Kitchen Duct Cleaning Contract",
      ref: "CLN-YM-2026",
      issueDate: dPast(60),
      expiryDate: dFuture(305),
      status: "ACTIVE",
      uploadedBy: "Karim Hassan",
      notes: "Bi-weekly certified exhaust hood and kitchen degreasing services",
    },

    // --- BRANCH 3: Musaffah Central Kitchen (BR-03) ---
    {
      branchId: b3.id,
      typeName: "Trade License",
      title: "Musaffah Central Production Facility Commercial License",
      ref: "CN-IND-77810",
      issueDate: dPast(200),
      expiryDate: dFuture(165),
      status: "ACTIVE",
      uploadedBy: "Tariq Al Mansoori",
      notes: "Industrial food manufacturing and catering license Abu Dhabi",
    },
    {
      branchId: b3.id,
      typeName: "Tawtheeq Lease Contract",
      title: "Musaffah Industrial M-14 Warehouse Tawtheeq Contract",
      ref: "TWT-MSF-14-12",
      issueDate: dPast(340),
      expiryDate: dFuture(25), // Expiring Soon!
      status: "EXPIRING_SOON",
      uploadedBy: "Tariq Al Mansoori",
      notes: "Industrial plot lease contract registered with Abu Dhabi Municipality",
    },
    {
      branchId: b3.id,
      typeName: "ADAFSA Food Permit",
      title: "Central Production Kitchen High-Care Food Safety Approval",
      ref: "ADAFSA-CK-8812",
      issueDate: dPast(150),
      expiryDate: dFuture(215),
      status: "ACTIVE",
      uploadedBy: "Chef Andrea Rossi",
      notes: "HACCP accredited central prep and cold-chain distribution center",
    },
    {
      branchId: b3.id,
      typeName: "Fire Safety Certificate",
      title: "Musaffah Industrial Facility Fire Protection Certification",
      ref: "FS-MSF-0012",
      issueDate: dPast(100),
      expiryDate: dFuture(265),
      status: "ACTIVE",
      uploadedBy: "Chef Andrea Rossi",
      notes: "Fully inspected with automated FM-200 gas suppression system",
    },
    {
      branchId: b3.id,
      typeName: "Comprehensive Business Insurance",
      title: "Musaffah Central Warehouse Property & Stock Insurance Policy",
      ref: "INS-OIC-2026-99",
      issueDate: dPast(180),
      expiryDate: dFuture(185),
      status: "ACTIVE",
      uploadedBy: "Tariq Al Mansoori",
      notes: "Covers cold store contents, machinery breakdown, and transit liability",
    },
  ];

  for (const item of branchDocsSeed) {
    const docTypeId = typeMap[item.typeName];
    if (!docTypeId) {
      console.warn(`Doc type ${item.typeName} not found, skipping.`);
      continue;
    }

    // Check if doc exists
    let doc = await prisma.document.findFirst({
      where: {
        organizationId: org.id,
        branchId: item.branchId,
        referenceNumber: item.ref,
      },
      include: { currentVersion: true },
    });

    if (!doc) {
      doc = await prisma.document.create({
        data: {
          organizationId: org.id,
          branchId: item.branchId,
          entityType: "BRANCH",
          entityId: item.branchId,
          documentTypeId: docTypeId,
          title: item.title,
          referenceNumber: item.ref,
          issueDate: item.issueDate,
          expiryDate: item.expiryDate,
          status: item.status,
          isLegal: true,
          createdBy: item.uploadedBy,
        },
        include: { currentVersion: true },
      });

      const pdfBytes = makePdf(`Official UAE Legal Document: ${item.title} (Ref: ${item.ref})`);
      const stored = await saveDocumentFile(org.id, doc.id, 1, pdfBytes);

      const version = await prisma.documentVersion.create({
        data: {
          documentId: doc.id,
          versionNumber: 1,
          originalFilename: `${item.ref.toLowerCase().replace(/[^a-z0-9]/g, "_")}.pdf`,
          storageKey: stored.storageKey,
          mimeType: "application/pdf",
          sizeBytes: stored.sizeBytes,
          sha256: stored.sha256,
          scanStatus: "CLEAN",
          uploadedBy: item.uploadedBy,
          notes: item.notes,
        },
      });

      await prisma.document.update({
        where: { id: doc.id },
        data: { currentVersionId: version.id },
      });

      console.log(`  + Created branch document: ${item.title} (Branch: ${item.branchId}, Status: ${item.status})`);
    } else {
      console.log(`  = Document already exists: ${item.title}`);
    }
  }

  console.log("\n==================================================");
  console.log("🎉 ALL BRANCH DOCUMENTS SEEDED SUCCESSFULLY");
  console.log("==================================================");
}

seedBranchDocs().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
