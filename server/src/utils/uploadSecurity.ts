import path from "path";
import fs from "fs";
import { fileTypeFromFile } from "file-type";

export const allowedMimeTypes = ["image/png", "image/jpeg", "application/pdf", "text/plain"] as const;
export const allowedExtensions = [".png", ".jpg", ".jpeg", ".pdf", ".txt"] as const;

const blockedExtensions = new Set([
  ".exe",
  ".js",
  ".sh",
  ".bat",
  ".cmd",
  ".scr",
  ".ps1",
  ".jar",
  ".com",
  ".vbs",
  ".msi",
  ".dll",
]);

export function isSuspiciousFilename(filename: string) {
  const lower = filename.toLowerCase();
  const parts = lower.split(".").filter(Boolean);
  if (parts.length <= 1) return false;
  if (parts.length >= 3) {
    const secondLast = `.${parts[parts.length - 2]}`;
    if (blockedExtensions.has(secondLast)) return true;
  }
  const ext = path.extname(lower);
  return blockedExtensions.has(ext);
}

export function getExtension(filename: string) {
  return path.extname(filename).toLowerCase();
}

export function isAllowedExtension(ext: string) {
  return (allowedExtensions as readonly string[]).includes(ext);
}

export async function validateUploadedFile(file: Express.Multer.File) {
  if (!file) return { ok: false, reason: "Missing file" } as const;

  const ext = getExtension(file.originalname);
  if (!isAllowedExtension(ext)) {
    return { ok: false, reason: "Unsupported file extension" } as const;
  }
  if (isSuspiciousFilename(file.originalname)) {
    return { ok: false, reason: "Suspicious filename" } as const;
  }

  const detected = await fileTypeFromFile(file.path);
  const detectedMime = detected?.mime;

  if (detectedMime && !(allowedMimeTypes as readonly string[]).includes(detectedMime)) {
    return { ok: false, reason: "Unsupported file type" } as const;
  }

  if (!detectedMime) {
    if (file.mimetype !== "text/plain" || ext !== ".txt") {
      return { ok: false, reason: "Could not verify file type" } as const;
    }
  }

  const normalizedMime = detectedMime || file.mimetype;
  return { ok: true, normalizedMime } as const;
}

export function safeUnlink(filePath?: string) {
  if (!filePath) return;
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
