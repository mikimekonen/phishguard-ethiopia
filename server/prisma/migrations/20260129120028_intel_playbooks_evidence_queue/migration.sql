-- AlterTable
ALTER TABLE "DetectionLog" ADD COLUMN "localIntelJson" TEXT;
ALTER TABLE "DetectionLog" ADD COLUMN "playbookJson" TEXT;

-- CreateTable
CREATE TABLE "EvidenceAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "detectionLogId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EvidenceAttachment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EvidenceAttachment_detectionLogId_fkey" FOREIGN KEY ("detectionLogId") REFERENCES "DetectionLog" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EvidenceAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "AdminUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExportJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "paramsJson" TEXT NOT NULL,
    "resultPath" TEXT,
    "exportHash" TEXT,
    "errorMessage" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExportJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ExportJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
