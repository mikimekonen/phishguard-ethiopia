import crypto from "crypto";
import { prisma } from "../prisma";
import { getDefaultTenantId } from "./tenant";

export type AuditPayload = {
  tenantId: string;
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, any> | null;
};

const hashPayload = (payload: Record<string, any>) =>
  crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");

export async function appendAuditLog(payload: AuditPayload) {
  const resolvedTenantId = payload.tenantId || (await getDefaultTenantId());
  const last = await prisma.auditLog.findFirst({
    where: { tenantId: resolvedTenantId },
    orderBy: { createdAt: "desc" },
  });

  const base = {
    tenantId: resolvedTenantId,
    actorId: payload.actorId || null,
    actorEmail: payload.actorEmail || null,
    action: payload.action,
    targetType: payload.targetType || null,
    targetId: payload.targetId || null,
    metadataJson: payload.metadata ? JSON.stringify(payload.metadata) : null,
    prevHash: last?.hash || null,
  } as const;

  const hash = hashPayload({ ...base, prevHash: base.prevHash || "" });

  return prisma.auditLog.create({
    data: {
      ...base,
      hash,
    },
  });
}

export const computeExportHash = (payload: Record<string, any>) =>
  crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");

export const computeExportSignature = (hash: string) => {
  const secret = process.env.EXPORT_SIGNING_SECRET || process.env.JWT_SECRET || "dev-export-secret";
  return crypto.createHmac("sha256", secret).update(hash).digest("hex");
};
