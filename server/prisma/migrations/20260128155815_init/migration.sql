-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DetectionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "softDeleted" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "TrustedDomain" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "domain" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT
);

-- CreateTable
CREATE TABLE "CommunityReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reporter" TEXT,
    "message" TEXT NOT NULL,
    "url" TEXT,
    "source" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed" BOOLEAN NOT NULL DEFAULT false
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TrustedDomain_domain_key" ON "TrustedDomain"("domain");
