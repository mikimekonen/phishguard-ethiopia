import { prisma } from "../prisma";

let cachedDefaultTenantId: string | null = null;

export async function getDefaultTenantId() {
  if (cachedDefaultTenantId) return cachedDefaultTenantId;
  const tenant = await prisma.tenant.findFirst({ where: { slug: "default" } });
  if (!tenant) {
    const created = await prisma.tenant.create({ data: { name: "Default Tenant", slug: "default" } });
    cachedDefaultTenantId = created.id;
    return created.id;
  }
  cachedDefaultTenantId = tenant.id;
  return tenant.id;
}
