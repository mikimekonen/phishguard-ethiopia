/*
  Warnings:

  - Added the required column `tenantId` to the `AdminUser` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `CommunityReport` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `DetectionLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `TrustedDomain` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "Tenant" ("id", "name", "slug") VALUES ('tenant_default', 'PhishGuard Ethiopia', 'default');

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadataJson" TEXT,
    "prevHash" TEXT,
    "hash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "AdminUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "detectionLogId" TEXT,
    "createdById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Case_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Case_detectionLogId_fkey" FOREIGN KEY ("detectionLogId") REFERENCES "DetectionLog" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Case_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Case_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "AdminUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CaseNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CaseNote_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CaseNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "AdminUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AdminUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "tenantId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" DATETIME,
    CONSTRAINT "AdminUser_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_AdminUser" ("createdAt", "email", "id", "passwordHash", "tenantId") SELECT "createdAt", "email", "id", "passwordHash", 'tenant_default' FROM "AdminUser";
DROP TABLE "AdminUser";
ALTER TABLE "new_AdminUser" RENAME TO "AdminUser";
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");
CREATE TABLE "new_CommunityReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "reporter" TEXT,
    "message" TEXT NOT NULL,
    "url" TEXT,
    "source" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "CommunityReport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_CommunityReport" ("createdAt", "id", "message", "reporter", "reviewed", "source", "url", "tenantId") SELECT "createdAt", "id", "message", "reporter", "reviewed", "source", "url", 'tenant_default' FROM "CommunityReport";
DROP TABLE "CommunityReport";
ALTER TABLE "new_CommunityReport" RENAME TO "CommunityReport";
CREATE TABLE "new_DetectionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "inputType" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "aiScore" INTEGER,
    "riskScore" INTEGER,
    "riskLevel" TEXT NOT NULL DEFAULT 'low',
    "indicatorsJson" TEXT NOT NULL,
    "summary" TEXT,
    "summaryAm" TEXT,
    "contentPreview" TEXT,
    "contentHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trustedDomain" BOOLEAN NOT NULL DEFAULT false,
    "institution" TEXT,
    "attackType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "softDeleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "DetectionLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DetectionLog" ("aiScore", "attackType", "confidence", "contentHash", "contentPreview", "createdAt", "id", "indicatorsJson", "inputType", "institution", "result", "riskLevel", "riskScore", "softDeleted", "status", "summary", "summaryAm", "trustedDomain", "tenantId") SELECT "aiScore", "attackType", "confidence", "contentHash", "contentPreview", "createdAt", "id", "indicatorsJson", "inputType", "institution", "result", "riskLevel", "riskScore", "softDeleted", "status", "summary", "summaryAm", "trustedDomain", 'tenant_default' FROM "DetectionLog";
DROP TABLE "DetectionLog";
ALTER TABLE "new_DetectionLog" RENAME TO "DetectionLog";
CREATE TABLE "new_TrustedDomain" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    CONSTRAINT "TrustedDomain_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_TrustedDomain" ("createdAt", "createdBy", "domain", "id", "tenantId") SELECT "createdAt", "createdBy", "domain", "id", 'tenant_default' FROM "TrustedDomain";
DROP TABLE "TrustedDomain";
ALTER TABLE "new_TrustedDomain" RENAME TO "TrustedDomain";
CREATE UNIQUE INDEX "TrustedDomain_tenantId_domain_key" ON "TrustedDomain"("tenantId", "domain");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
