import { prisma } from "../src/lib/db/prisma";

async function main() {
  const org = await prisma.organization.findFirst({ where: { code: "ORG-01" } });
  if (!org) return;

  const newPerms = [
    { code: "CREATE_BRANCH", module: "business", description: "Create restaurant branches" },
    { code: "EDIT_BRANCH", module: "business", description: "Edit branch details" },
    { code: "ARCHIVE_BRANCH", module: "business", description: "Archive or deactivate restaurant branches" },
    { code: "REACTIVATE_BRANCH", module: "business", description: "Reactivate archived branches" },
    { code: "branch.create", module: "business", description: "Create restaurant branches (alias)" },
    { code: "branch.update", module: "business", description: "Edit branch details (alias)" },
    { code: "branch.archive", module: "business", description: "Archive branches (alias)" },
  ];

  const ownerRole = await prisma.role.findFirst({
    where: { organizationId: org.id, name: "Owner" },
  });

  for (const p of newPerms) {
    const perm = await prisma.permission.upsert({
      where: { code: p.code },
      update: {},
      create: p,
    });

    if (ownerRole) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: ownerRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: ownerRole.id, permissionId: perm.id },
      });
    }
  }

  // Also update existing branches with defaults if null
  await prisma.branch.updateMany({
    where: { code: "BR-01", type: "RESTAURANT" },
    data: {
      type: "RESTAURANT",
      addressAr: "مارينا البطين، أبوظبي",
      email: "bateen@tasha.ae",
    },
  });

  await prisma.branch.updateMany({
    where: { code: "BR-02" },
    data: {
      type: "WATERFRONT",
      addressAr: "جزيرة ياس، الطابق الأرضي، بوليفارد المطاعم",
      email: "yasmall@tasha.ae",
    },
  });

  await prisma.branch.updateMany({
    where: { code: "BR-03" },
    data: {
      type: "CENTRAL_KITCHEN",
      addressAr: "مصفح الصناعية م-14، مستودع 12",
      email: "central.kitchen@tasha.ae",
    },
  });

  console.log("Branch permissions and defaults ensured successfully.");
}

main().catch(console.error).finally(() => process.exit(0));
