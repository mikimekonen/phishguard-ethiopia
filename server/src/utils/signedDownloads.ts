import crypto from "crypto";

const SIGNED_URL_SECRET =
  process.env.SIGNED_URL_SECRET || process.env.JWT_SECRET || "dev-signed-secret";

export type SignedDownloadPayload = {
  id: string;
  tenantId: string;
  type: "case" | "log" | "export";
  exp: number;
};

const base64UrlEncode = (input: string | Buffer) =>
  Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

const base64UrlDecode = (input: string) => {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return Buffer.from(padded, "base64").toString("utf8");
};

const sign = (data: string) =>
  base64UrlEncode(crypto.createHmac("sha256", SIGNED_URL_SECRET).update(data).digest());

export function createSignedDownloadToken(payload: Omit<SignedDownloadPayload, "exp">, ttlSeconds = 600) {
  const exp = Date.now() + ttlSeconds * 1000;
  const body = base64UrlEncode(JSON.stringify({ ...payload, exp }));
  const signature = sign(body);
  return `${body}.${signature}`;
}

export function verifySignedDownloadToken(token: string): SignedDownloadPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = sign(body);
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }
  try {
    const payload = JSON.parse(base64UrlDecode(body)) as SignedDownloadPayload;
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function buildSignedUrl(req: { protocol?: string; get?: (key: string) => string | undefined }, path: string, token: string) {
  const base = process.env.PUBLIC_BASE_URL || `${req.protocol || "http"}://${req.get?.("host") || "localhost"}`;
  return `${base}${path}?token=${encodeURIComponent(token)}`;
}
