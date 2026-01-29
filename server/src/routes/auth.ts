import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { signToken, verifyPassword } from "../auth";
import { appendAuditLog } from "../utils/audit";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authRouter = Router();

authRouter.post("/auth/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid credentials" });
  }

  const { email, password } = parsed.data;
  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken(user.id, user.email, user.role as any, user.tenantId);
  await prisma.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await appendAuditLog({
    tenantId: user.tenantId,
    actorId: user.id,
    actorEmail: user.email,
    action: "auth.login",
    metadata: { ip: req.ip },
  });
  return res.json({ token, email: user.email });
});
