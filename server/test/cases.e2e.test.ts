import { describe, it, beforeAll, afterAll, expect } from "vitest";
import request from "supertest";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, "..");
const testDbPath = path.join(serverRoot, "prisma", "e2e.db");
const uploadsRoot = path.join(serverRoot, "uploads", "cases");

let app: any;
let prisma: any;
let token = "";
let caseId = "";
let evidenceId = "";

async function seed() {
  const auth = await import("../src/auth");
  const { hashPassword } = auth;
  const tenant = await prisma.tenant.create({
    data: { name: "E2E Tenant", slug: `e2e-${Date.now()}` },
  });
  const passwordHash = await hashPassword("Password123!");
  const user = await prisma.adminUser.create({
    data: {
      email: "e2e-admin@phishguard.et",
      passwordHash,
      role: "admin",
      tenantId: tenant.id,
    },
  });
  return { user };
}

describe("Cases + evidence E2E", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = `file:${testDbPath}`;
    process.env.JWT_SECRET = "test-secret";
    process.env.ALLOWED_ORIGINS = "http://localhost:5173";

    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    execSync("npx prisma db push", {
      cwd: serverRoot,
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    });

    const prismaMod = await import("../src/prisma");
    prisma = prismaMod.prisma;

    await seed();

    const appMod = await import("../src/app");
    app = appMod.app;

    const login = await request(app)
      .post("/auth/login")
      .send({ email: "e2e-admin@phishguard.et", password: "Password123!" });

    token = login.body.token;

    const created = await request(app)
      .post("/admin/cases")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "E2E Case", description: "Evidence flow", severity: "high" });

    caseId = created.body.data.id;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    if (fs.existsSync(uploadsRoot)) {
      fs.rmSync(uploadsRoot, { recursive: true, force: true });
    }
  });

  it("uploads evidence, downloads, signed URL, and deletes it", async () => {
    const fixturePath = path.join(__dirname, "fixtures", "evidence.txt");
    const uploadRes = await request(app)
      .post(`/admin/cases/${caseId}/evidence`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", fixturePath, { contentType: "text/plain" });

    expect(uploadRes.status).toBe(201);
    evidenceId = uploadRes.body.data.id;
    expect(evidenceId).toBeTruthy();

    const listRes = await request(app)
      .get(`/admin/cases/${caseId}/evidence`)
      .set("Authorization", `Bearer ${token}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBe(1);

    const downloadRes = await request(app)
      .get(`/admin/cases/evidence/${evidenceId}/download`)
      .set("Authorization", `Bearer ${token}`);

    expect(downloadRes.status).toBe(200);
    expect(downloadRes.headers["content-type"]).toContain("text/plain");

    const signedRes = await request(app)
      .get(`/admin/cases/evidence/${evidenceId}/signed-url`)
      .set("Authorization", `Bearer ${token}`);

    expect(signedRes.status).toBe(200);
    const signedUrl = new URL(signedRes.body.url);
    const signedDownload = await request(app).get(`${signedUrl.pathname}${signedUrl.search}`);
    expect(signedDownload.status).toBe(200);

    const deleteRes = await request(app)
      .delete(`/admin/cases/evidence/${evidenceId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(deleteRes.status).toBe(204);

    const listAfter = await request(app)
      .get(`/admin/cases/${caseId}/evidence`)
      .set("Authorization", `Bearer ${token}`);

    expect(listAfter.status).toBe(200);
    expect(listAfter.body.data.length).toBe(0);
  });

  it("rejects upload without auth", async () => {
    const fixturePath = path.join(__dirname, "fixtures", "evidence.txt");
    const res = await request(app)
      .post(`/admin/cases/${caseId}/evidence`)
      .attach("file", fixturePath, { contentType: "text/plain" });
    expect(res.status).toBe(401);
  });

  it("rejects invalid mime and suspicious filename", async () => {
    const badPath = path.join(__dirname, "fixtures", "bad.exe");
    const badRes = await request(app)
      .post(`/admin/cases/${caseId}/evidence`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", badPath, { contentType: "application/x-msdownload" });
    expect(badRes.status).toBe(400);

    const doubleExtPath = path.join(__dirname, "fixtures", "report.pdf.exe");
    const doubleRes = await request(app)
      .post(`/admin/cases/${caseId}/evidence`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", doubleExtPath, { contentType: "application/pdf" });
    expect(doubleRes.status).toBe(400);
  });

  it("exports case PDF and CSV with hash headers", async () => {
    const pdfRes = await request(app)
      .get(`/admin/cases/${caseId}/export/pdf`)
      .set("Authorization", `Bearer ${token}`);
    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers["content-type"]).toContain("application/pdf");
    expect(pdfRes.headers["x-export-hash"]).toBeTruthy();
    expect(pdfRes.headers["x-export-signature"]).toBeTruthy();

    const csvRes = await request(app)
      .get(`/admin/cases/${caseId}/export/csv`)
      .set("Authorization", `Bearer ${token}`);
    expect(csvRes.status).toBe(200);
    expect(csvRes.headers["content-type"]).toContain("text/csv");
    expect(csvRes.headers["x-export-hash"]).toBeTruthy();
    expect(csvRes.headers["x-export-signature"]).toBeTruthy();
  });
});
