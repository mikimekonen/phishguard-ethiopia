import "dotenv/config";
import { prisma } from "./prisma";
import { hashPassword } from "./auth";

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@phishguard.et";
  const password = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  const tenantName = process.env.TENANT_NAME || "PhishGuard Ethiopia";
  const tenantSlug = process.env.TENANT_SLUG || "default";

  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    update: { name: tenantName },
    create: { name: tenantName, slug: tenantSlug },
  });

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    console.log("Admin already exists", email);
    return;
  }

  const passwordHash = await hashPassword(password);
  await prisma.adminUser.create({
    data: { email, passwordHash, role: "superadmin", tenantId: tenant.id },
  });
  console.log("Seeded admin user", email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
