import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const users = await p.user.findMany({
    include: {
      roles: { include: { role: true } },
      sessions: true,
      securityProfile: true,
    },
  });
  console.log(JSON.stringify(users.map(u => ({
    id: u.id,
    email: u.email,
    username: u.username,
    name: u.name,
    roles: u.roles.map(r => r.role.name),
    sessionsCount: u.sessions.length,
    sessions: u.sessions.map(s => ({ id: s.id, expiresAt: s.expiresAt })),
    hasSecProfile: !!u.securityProfile,
  })), null, 2));

  const orgs = await p.organization.findMany();
  console.log("Organizations:", JSON.stringify(orgs.map(o => ({ id: o.id, code: o.code, nameAr: o.nameAr, nameEn: o.nameEn, ownerName: o.ownerName }))));
}

main().catch(console.error).finally(() => p.$disconnect());
