import { prisma } from "../prisma";

let cachedDefaultTenantId: string | null = null;
const DEFAULT_TENANT_SLUG = process.env.TENANT_SLUG || "default";

export async function getDefaultTenantId() {
  if (cachedDefaultTenantId) return cachedDefaultTenantId;
  const tenant = await prisma.tenant.findFirst({ where: { slug: DEFAULT_TENANT_SLUG } });
  if (!tenant) {
    const created = await prisma.tenant.create({ data: { name: "Default Tenant", slug: DEFAULT_TENANT_SLUG } });
    cachedDefaultTenantId = created.id;
    return created.id;
  }
  cachedDefaultTenantId = tenant.id;
  return tenant.id;
}
