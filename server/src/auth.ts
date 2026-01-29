import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { getDefaultTenantId } from "./utils/tenant";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export type Role = "superadmin" | "admin" | "analyst" | "viewer";

export type JwtPayload = {
  sub: string;
  email: string;
  role: Role;
  tenantId: string;
};

export function signToken(userId: string, email: string, role: Role, tenantId: string) {
  return jwt.sign({ sub: userId, email, role, tenantId } as JwtPayload, JWT_SECRET, { expiresIn: "12h" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.slice("Bearer ".length);
  try {
    const payload = verifyToken(token) as JwtPayload;
    if (!payload.tenantId) {
      payload.tenantId = await getDefaultTenantId();
    }
    if (!payload.role) {
      payload.role = "admin";
    }
    (req as any).user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

const roleRank: Record<Role, number> = {
  superadmin: 4,
  admin: 3,
  analyst: 2,
  viewer: 1,
};

export function requireRole(minRole: Role) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as JwtPayload | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (roleRank[user.role] < roleRank[minRole]) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return next();
  };
}
