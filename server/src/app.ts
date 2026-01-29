import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import multer from "multer";
import { authRouter } from "./routes/auth";
import { publicLogsRouter, adminLogsRouter } from "./routes/logs";
import { trustedDomainsRouter } from "./routes/trustedDomains";
import { publicReportsRouter, adminReportsRouter } from "./routes/reports";
import { detectRouter } from "./routes/detect";
import { exportsRouter } from "./routes/exports";
import { casesRouter } from "./routes/cases";
import { evidenceRouter } from "./routes/evidence";
import { downloadsRouter } from "./routes/downloads";
import { metricsRouter } from "./routes/metrics";
import { recordRequest } from "./utils/metrics";

const allowedOrigins =
  process.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()) || ["http://localhost:5173"];

export const app = express();
app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  const requestId = crypto.randomUUID();
  (req as any).id = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
});

morgan.token("reqid", (req) => ((req as any).id as string) || "-");
app.use(morgan(":method :url :status :res[content-length] - :response-time ms :reqid"));

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    recordRequest(req.method, req.path, res.statusCode, duration);
  });
  next();
});

const publicLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use(downloadsRouter);

app.use(authRouter);
app.use("/api/detect", publicLimiter);
app.use("/logs", publicLimiter);
app.use("/reports", publicLimiter);
app.use(detectRouter);
app.use(publicLogsRouter);
app.use(publicReportsRouter);

app.use("/admin", adminLogsRouter);
app.use("/admin", trustedDomainsRouter);
app.use("/admin", adminReportsRouter);
app.use("/admin", exportsRouter);
app.use("/admin", casesRouter);
app.use("/admin", evidenceRouter);
app.use("/admin", metricsRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  if (
    err?.message === "Unsupported file type" ||
    err?.message === "Suspicious filename" ||
    err?.message === "Unsupported file extension" ||
    err?.message === "Could not verify file type"
  ) {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: "Server error" });
});
