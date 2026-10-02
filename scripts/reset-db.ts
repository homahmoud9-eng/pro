import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function resetDatabase() {
  console.log("=================================================");
  console.log("🧹 EXPLICIT DATABASE RESET - CLEAN BUSINESS STATE");
  console.log("=================================================");

  // Production guard
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_RESET !== "true") {
    throw new Error(
      "SAFETY VIOLATION: Database reset is blocked in production mode. Set ALLOW_PROD_RESET=true if intentionally performing maintenance."
    );
  }

  // 1. Identify and verify the real Owner account
  const ownerUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: "owner@tasha.ae" },
        { username: "owner" },
        { roles: { some: { role: { name: "Owner" } } } },
      ],
    },
    include: {
      securityProfile: true,
      sessions: true,
    },
  });

  if (!ownerUser) {
    throw new Error("CRITICAL: Real Owner account not found. Cannot proceed with safe reset.");
  }

  console.log(`Preserving real Owner account: ${ownerUser.name} (${ownerUser.email}) [ID: ${ownerUser.id}]`);
  console.log(`Preserving ${ownerUser.sessions.length} active session(s)`);

  // 2. Remove all business / demo records in correct dependency order
  console.log("\nDeleting business, operational, and transactional demo records...");

  // Food Safety
  await prisma.foodSafetyFinding.deleteMany();
  await prisma.foodSafetyInspection.deleteMany();
  await prisma.foodSafetyChecklist.deleteMany();
  await prisma.foodHandlerTraining.deleteMany();

  // Inventory, Recipes, Operations
  await prisma.wasteRecord.deleteMany();
  await prisma.recipeIngredient.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.supplier.deleteMany();

  // Finance
  await prisma.payment.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.taxRecord.deleteMany();

  // Procedures
  await prisma.procedureComment.deleteMany();
  await prisma.procedureStep.deleteMany();
  await prisma.procedure.deleteMany();

  // Attendance, Leave, Payroll
  await prisma.attendanceRecord.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.leaveType.deleteMany();
  await prisma.payrollEntry.deleteMany();
  await prisma.payrollPeriod.deleteMany();
  await prisma.endOfServiceCalculation.deleteMany();
  await prisma.contract.deleteMany();

  // Documents
  await prisma.documentReminder.deleteMany();
  // Clear currentVersionId foreign key before deleting document versions
  await prisma.document.updateMany({
    data: { currentVersionId: null },
  });
  await prisma.documentVersion.deleteMany();
  await prisma.document.deleteMany();

  // Employees
  await prisma.employee.deleteMany();

  // Notifications & Audit Logs
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();

  // Reset audit chain head to genesis for the organization
  await prisma.auditChainHead.deleteMany();
  await prisma.auditChainHead.create({
    data: {
      organizationId: ownerUser.organizationId,
      sequenceNumber: 0,
      currentHash: "0000000000000000000000000000000000000000000000000000000000000000",
    },
  });

  // User Branch Scopes (Owner has global access, clear branch scopes)
  await prisma.userBranchScope.deleteMany();

  // Branches
  await prisma.branch.deleteMany();

  // Non-owner Users, their sessions and security profiles
  console.log("\nRemoving non-owner demo users and obsolete roles...");
  const otherUsers = await prisma.user.findMany({
    where: { id: { not: ownerUser.id } },
  });

  for (const u of otherUsers) {
    await prisma.userRole.deleteMany({ where: { userId: u.id } });
    await prisma.session.deleteMany({ where: { userId: u.id } });
    await prisma.userSecurityProfile.deleteMany({ where: { userId: u.id } });
    await prisma.securityEvent.deleteMany({ where: { userId: u.id } });
    await prisma.user.delete({ where: { id: u.id } });
    console.log(`  Removed demo user: ${u.email} (${u.name})`);
  }

  // Clear remaining security events
  await prisma.securityEvent.deleteMany();

  // 3. Enforce Owner-Only Role Model
  // Delete all roles other than "Owner"
  const nonOwnerRoles = await prisma.role.findMany({
    where: {
      organizationId: ownerUser.organizationId,
      name: { not: "Owner" },
    },
  });

  for (const r of nonOwnerRoles) {
    await prisma.rolePermission.deleteMany({ where: { roleId: r.id } });
    await prisma.userRole.deleteMany({ where: { roleId: r.id } });
    await prisma.role.delete({ where: { id: r.id } });
    console.log(`  Removed role: ${r.name}`);
  }

  // Ensure "Owner" role exists and is active
  let ownerRole = await prisma.role.findFirst({
    where: {
      organizationId: ownerUser.organizationId,
      name: "Owner",
    },
  });

  if (!ownerRole) {
    ownerRole = await prisma.role.create({
      data: {
        organizationId: ownerUser.organizationId,
        name: "Owner",
        description: "Full system authority across all branches, finance, HR, compliance, and security.",
        isSystem: true,
      },
    });
  }

  // Ensure all permissions are assigned to the Owner role
  const allPermissions = await prisma.permission.findMany();
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: ownerRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: ownerRole.id,
        permissionId: perm.id,
      },
    });
  }

  // Ensure owner user is assigned to the Owner role
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: ownerUser.id,
        roleId: ownerRole.id,
      },
    },
    update: {},
    create: {
      userId: ownerUser.id,
      roleId: ownerRole.id,
    },
  });

  // Ensure owner user is active
  await prisma.user.update({
    where: { id: ownerUser.id },
    data: { status: "ACTIVE" },
  });

  // 4. Clean physical files in uploads directory
  const uploadsDir = path.resolve(process.cwd(), "uploads");
  if (fs.existsSync(uploadsDir)) {
    const entries = fs.readdirSync(uploadsDir);
    for (const entry of entries) {
      const fullPath = path.join(uploadsDir, entry);
      fs.rmSync(fullPath, { recursive: true, force: true });
    }
    console.log(`\nCleaned file storage: ${uploadsDir}`);
  }

  console.log("\n=================================================");
  console.log("✅ DATABASE RESET COMPLETED SUCCESSFULLY");
  console.log("=================================================");
  console.log(`- Roles: Exactly 1 (Owner / المالك)`);
  console.log(`- Users: Exactly 1 (Owner: ${ownerUser.email})`);
  console.log(`- Branches: 0 (Clean state)`);
  console.log(`- Employees: 0 (Clean state)`);
  console.log(`- Documents: 0 (Clean state)`);
  console.log(`- Expenses: 0 (Clean state)`);
  console.log(`- Inventory: 0 (Clean state)`);
  console.log(`- Audit Head: Initialized to genesis hash`);
}

resetDatabase()
  .catch((e) => {
    console.error("❌ Reset error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
