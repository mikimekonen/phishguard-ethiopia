type MetricsSnapshot = {
  startedAt: string;
  uptimeSeconds: number;
  totalRequests: number;
  totalErrors: number;
  byStatus: Record<string, number>;
  byMethod: Record<string, number>;
  byPath: Record<string, number>;
  avgLatencyMs: number;
  recentErrorCount: number;
  alerts: Array<{ level: "warning" | "critical"; message: string }>;
};

const startedAt = Date.now();
let totalRequests = 0;
let totalErrors = 0;
let totalLatency = 0;
const byStatus: Record<string, number> = {};
const byMethod: Record<string, number> = {};
const byPath: Record<string, number> = {};
const errorTimestamps: number[] = [];
const ERROR_WINDOW_MS = 5 * 60 * 1000;
const ERROR_ALERT_THRESHOLD = 5;

export function recordRequest(method: string, path: string, status: number, latencyMs: number) {
  totalRequests += 1;
  totalLatency += latencyMs;
  if (status >= 400) {
    totalErrors += 1;
    if (status >= 500) {
      errorTimestamps.push(Date.now());
    }
  }
  byStatus[String(status)] = (byStatus[String(status)] || 0) + 1;
  byMethod[method] = (byMethod[method] || 0) + 1;
  byPath[path] = (byPath[path] || 0) + 1;
}

export function getMetrics(): MetricsSnapshot {
  const cutoff = Date.now() - ERROR_WINDOW_MS;
  while (errorTimestamps.length && errorTimestamps[0] < cutoff) {
    errorTimestamps.shift();
  }
  const alerts: Array<{ level: "warning" | "critical"; message: string }> = [];
  if (errorTimestamps.length >= ERROR_ALERT_THRESHOLD) {
    alerts.push({
      level: "warning",
      message: `High error volume detected (${errorTimestamps.length} errors in last 5 minutes)`,
    });
  }
  return {
    startedAt: new Date(startedAt).toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    totalRequests,
    totalErrors,
    byStatus,
    byMethod,
    byPath,
    avgLatencyMs: totalRequests ? Math.round(totalLatency / totalRequests) : 0,
    recentErrorCount: errorTimestamps.length,
    alerts,
  };
}
