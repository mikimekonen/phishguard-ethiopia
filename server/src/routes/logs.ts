import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "../prisma";
import { requireAuth, requireRole } from "../auth";
import { appendAuditLog } from "../utils/audit";
import { getCache, setCache } from "../utils/cache";
import { getDefaultTenantId } from "../utils/tenant";

const safeParseIndicators = (raw?: string | null) => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const safeParseJson = (raw?: string | null) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const inferRiskLevel = (result: "safe" | "suspicious" | "phishing", score?: number) => {
  if (result === "phishing") return "high";
  if (score !== undefined) {
    if (score >= 70) return "high";
    if (score >= 40) return "medium";
    return "low";
  }
  return result === "suspicious" ? "medium" : "low";
};

const logSchema = z.object({
  inputType: z.enum(["url", "sms", "email"]),
  result: z.enum(["safe", "suspicious", "phishing"]),
  confidence: z.number().int().min(0).max(100),
  aiScore: z.number().int().min(0).max(100).optional(),
  riskScore: z.number().int().min(0).max(100).optional(),
  riskLevel: z.enum(["high", "medium", "low"]).optional(),
  indicators: z.array(z.object({
    name: z.string(),
    nameAm: z.string().optional().default(""),
    detected: z.boolean(),
    severity: z.enum(["high", "medium", "low"]),
    description: z.string().optional().default(""),
  })).default([]),
  summary: z.string().optional(),
  summaryAm: z.string().optional(),
  contentPreview: z.string().optional(),
  trustedDomain: z.boolean().optional().default(false),
  institution: z.enum(["Telebirr", "CBE", "Dashen", "Awash"]).optional(),
  attackType: z.enum(["url", "sms", "email"]).optional(),
});

const inferInstitution = (content?: string | null) => {
  if (!content) return undefined;
  const text = content.toLowerCase();
  if (text.includes("telebirr")) return "Telebirr";
  if (text.includes("cbe") || text.includes("commercial bank") || text.includes("commercial bank of ethiopia")) return "CBE";
  if (text.includes("dashen")) return "Dashen";
  if (text.includes("awash")) return "Awash";
  return undefined;
};

const expandDomainVariants = (hostname: string) => {
  const parts = hostname.split(".");
  return parts.map((_, idx) => parts.slice(idx).join("."));
};

export const publicLogsRouter = Router();
export const adminLogsRouter = Router();
adminLogsRouter.use(requireAuth);

publicLogsRouter.post("/logs", async (req, res) => {
  const parsed = logSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const payload = parsed.data;
  const tenantId = await getDefaultTenantId();
  let resolvedTrustedDomain = payload.trustedDomain ?? false;
  let adjustedRiskScore = payload.riskScore;
  if (payload.inputType === "url" && payload.contentPreview) {
    try {
      const url = new URL(payload.contentPreview.trim());
      const hostname = url.hostname.toLowerCase();
      const trusted = await prisma.trustedDomain.findFirst({
        where: {
          tenantId,
          domain: {
            in: expandDomainVariants(hostname),
          },
        },
      });
      if (trusted) {
        resolvedTrustedDomain = true;
        if (typeof adjustedRiskScore === "number") {
          adjustedRiskScore = Math.max(0, adjustedRiskScore - 30);
        }
      }
    } catch {
      // ignore invalid URL parsing
    }
  }
  const contentPreview = payload.contentPreview?.slice(0, 240) || undefined;
  const contentHash = contentPreview
    ? crypto.createHash("sha256").update(contentPreview).digest("hex")
    : undefined;

  try {
    const computedRiskLevel = payload.riskLevel ?? inferRiskLevel(payload.result, adjustedRiskScore);
    const inferredInstitution = payload.institution ?? inferInstitution(payload.contentPreview);
    const attackType = payload.attackType ?? payload.inputType;
    const created = await prisma.detectionLog.create({
      data: {
        tenantId,
        inputType: payload.inputType,
        result: payload.result,
        confidence: payload.confidence,
        aiScore: payload.aiScore,
        riskScore: adjustedRiskScore,
        riskLevel: computedRiskLevel,
        indicatorsJson: JSON.stringify(payload.indicators),
        summary: payload.summary,
        summaryAm: payload.summaryAm,
        contentPreview,
        contentHash,
        trustedDomain: resolvedTrustedDomain,
        institution: inferredInstitution,
        attackType,
      },
    });

    await appendAuditLog({
      tenantId,
      action: "log.create",
      targetType: "DetectionLog",
      targetId: created.id,
      metadata: { source: "public" },
    });

    return res.status(201).json({ id: created.id });
  } catch (err) {
    return res.status(500).json({ error: "Failed to store log" });
  }
});

const listQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  result: z.enum(["safe", "suspicious", "phishing"]).optional(),
  inputType: z.enum(["url", "sms", "email"]).optional(),
  riskLevel: z.enum(["high", "medium", "low"]).optional(),
  institution: z.enum(["Telebirr", "CBE", "Dashen", "Awash"]).optional(),
  status: z.enum(["pending", "confirmed_phishing", "false_positive"]).optional(),
  includeDeleted: z.coerce.boolean().optional().default(false),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const parseAdminQuery = (req: any) => {
  const parsed = listQuery.safeParse(req.query);
  if (!parsed.success) {
    return { error: parsed.error.flatten() };
  }
  return { data: parsed.data } as const;
};

const buildFilters = (data: z.infer<typeof listQuery> & { tenantId: string }) => {
  const { result, inputType, riskLevel, institution, status, includeDeleted, from, to } = data;
  const filters: any = { tenantId: data.tenantId };
  if (result) filters.result = result;
  if (inputType) filters.inputType = inputType;
  if (riskLevel) filters.riskLevel = riskLevel;
  if (institution) filters.institution = institution;
  if (status) filters.status = status;
  if (!includeDeleted) filters.softDeleted = false;
  if (from || to) {
    filters.createdAt = {};
    if (from) filters.createdAt.gte = from;
    if (to) filters.createdAt.lte = to;
  }
  return filters;
};

adminLogsRouter.get("/logs", async (req, res) => {
  const parsed = parseAdminQuery(req);
  if ("error" in parsed) {
    return res.status(400).json({ error: "Invalid query", details: parsed.error });
  }
  const { limit, cursor } = parsed.data;
  const tenantId = (req as any).user.tenantId;
  const filters = buildFilters({ ...parsed.data, tenantId });

  try {
    const logs = await prisma.detectionLog.findMany({
      take: limit + 1,
      orderBy: { createdAt: "desc" },
      where: filters,
      cursor: cursor ? { id: cursor } : undefined,
    });

    const hasMore = logs.length > limit;
    const sliced = (hasMore ? logs.slice(0, limit) : logs).map((log: any) => ({
      ...log,
      indicators: safeParseIndicators(log.indicatorsJson),
      localIntel: safeParseJson(log.localIntelJson),
      playbook: safeParseJson(log.playbookJson),
    }));
    return res.json({
      data: sliced,
      nextCursor: hasMore ? sliced[sliced.length - 1].id : null,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch logs" });
  }
});

adminLogsRouter.get("/logs/export", async (req, res) => {
  const parsed = parseAdminQuery(req);
  if ("error" in parsed) {
    return res.status(400).json({ error: "Invalid query", details: parsed.error });
  }
  const tenantId = (req as any).user.tenantId;
  const filters = buildFilters({ ...parsed.data, tenantId });
  try {
    const logs = await prisma.detectionLog.findMany({
      orderBy: { createdAt: "desc" },
      where: filters,
    });
    const mapped = logs.map((log: any) => ({
      ...log,
      indicators: safeParseIndicators(log.indicatorsJson),
      localIntel: safeParseJson(log.localIntelJson),
      playbook: safeParseJson(log.playbookJson),
    }));
    return res.json({ data: mapped });
  } catch (err) {
    return res.status(500).json({ error: "Failed to export logs" });
  }
});

adminLogsRouter.get("/stats", async (req, res) => {
  try {
    const tenantId = (req as any).user.tenantId;
    const cacheKey = `stats:${tenantId}`;
    const cached = getCache<{ total: number; phishing: number; safe: number; recentByType: any[] }>(cacheKey);
    if (cached) {
      return res.json(cached);
    }
    const [total, phishing, safe] = await Promise.all([
      prisma.detectionLog.count({ where: { softDeleted: false, tenantId } }),
      prisma.detectionLog.count({ where: { result: "phishing", softDeleted: false, tenantId } }),
      prisma.detectionLog.count({ where: { result: "safe", softDeleted: false, tenantId } }),
    ]);

    const recent = await prisma.detectionLog.groupBy({
      by: ["inputType"],
      _count: { _all: true },
      _avg: { confidence: true },
      where: { tenantId },
    });

    const payload = {
      total,
      phishing,
      safe,
      recentByType: recent,
    };
    setCache(cacheKey, payload, 30 * 1000);
    return res.json(payload);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch stats" });
  }
});

const actionSchema = z.object({
  status: z.enum(["pending", "confirmed_phishing", "false_positive"]).optional(),
  softDeleted: z.boolean().optional(),
});

adminLogsRouter.patch("/logs/:id", requireRole("analyst"), async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Missing id" });

  const parsed = actionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  try {
    const tenantId = (req as any).user.tenantId;
    const existing = await prisma.detectionLog.findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Not found" });
    const updated = await prisma.detectionLog.update({ where: { id }, data: parsed.data });
    await appendAuditLog({
      tenantId,
      actorId: (req as any).user.sub,
      actorEmail: (req as any).user.email,
      action: "log.update",
      targetType: "DetectionLog",
      targetId: id,
      metadata: parsed.data,
    });
    return res.json({ data: updated });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update detection" });
  }
});

adminLogsRouter.get("/analytics", async (req, res) => {
  try {
    const tenantId = (req as any).user.tenantId;
    const rows = await prisma.detectionLog.findMany({
      where: { softDeleted: false, tenantId },
      select: { institution: true, attackType: true, createdAt: true },
    });

    const institutionCounts = rows.reduce((acc: Record<string, number>, row: { institution: string | null }) => {
      if (!row.institution) return acc;
      acc[row.institution] = (acc[row.institution] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const attackCounts = rows.reduce((acc: Record<string, number>, row: { attackType: string | null }) => {
      if (!row.attackType) return acc;
      acc[row.attackType] = (acc[row.attackType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dailyCounts = rows.reduce((acc: Record<string, number>, row: { createdAt: Date }) => {
      const day = row.createdAt.toISOString().slice(0, 10);
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostTargeted = (Object.entries(institutionCounts) as Array<[string, number]>).sort((a, b) => b[1] - a[1])[0];
    const mostCommonAttack = (Object.entries(attackCounts) as Array<[string, number]>).sort((a, b) => b[1] - a[1])[0];

    return res.json({
      mostTargeted: mostTargeted?.[0] || null,
      mostTargetedCount: mostTargeted?.[1] || 0,
      mostCommonAttack: mostCommonAttack?.[0] || null,
      mostCommonAttackCount: mostCommonAttack?.[1] || 0,
      dailyCounts,
      institutions: Object.entries(institutionCounts).map(([institution, count]) => ({
        institution,
        _count: { _all: count },
      })),
      attackTypes: Object.entries(attackCounts).map(([attackType, count]) => ({
        attackType,
        _count: { _all: count },
      })),
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch analytics" });
  }
});
