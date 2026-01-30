// Security note: keep API host permissions narrow and update API_BASE_URL for production.
// Switch between dev/prod by toggling USE_PROD (no runtime env in extensions).
const USE_PROD = false;
const DEV_API_BASE_URL = "http://localhost:8787";
const PROD_API_BASE_URL = "https://api.phishguard.et";
const API_BASE_URL = USE_PROD ? PROD_API_BASE_URL : DEV_API_BASE_URL;
const API_URL = `${API_BASE_URL}/api/detect`;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_KEY = "verdictCache";
const LAST_RESULT_KEY = "lastResult";
const ERROR_LOG_KEY = "errorLog";
const BLOCK_RULE_PREFIX = 9000;
const NOTIFY_RATE_KEY = "notificationRateLimit";
const NOTIFY_LINKS_KEY = "notificationLinks";
const NOTIFY_COOLDOWN_MS = 10 * 60 * 1000;
const DEFAULT_ICON_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAAlElEQVR42u3EIQEAAAgDsMeiPL1wEAOziaV6NpIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZIkSZKk7w7B+Ar26m57qgAAAABJRU5ErkJggg==";

// Cross-browser API alias (Chrome MV3 + Firefox MV3).
const ext = globalThis.browser ?? chrome;

console.log("[PhishGuard] Service worker initialized");

ext.runtime.onInstalled.addListener(() => {
  console.log("[PhishGuard] Extension installed/updated");
});

const isHttpUrl = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const normalizeUrl = (url) => {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url;
  }
};

const sanitizeText = (text) => String(text || "").slice(0, 500);

const getCache = async () => {
  const data = await ext.storage.local.get(CACHE_KEY);
  return data[CACHE_KEY] || {};
};

const setCache = async (cache) => {
  await ext.storage.local.set({ [CACHE_KEY]: cache });
};

const getCachedVerdict = async (url) => {
  const cache = await getCache();
  const entry = cache[url];
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    delete cache[url];
    await setCache(cache);
    return null;
  }
  return entry;
};

const cacheVerdict = async (url, verdict) => {
  const cache = await getCache();
  cache[url] = { ...verdict, ts: Date.now() };
  await setCache(cache);
};

const createNotificationSafe = async (id, options) => {
  try {
    return await ext.notifications.create(id, {
      ...options,
      iconUrl: DEFAULT_ICON_DATA_URL,
    });
  } catch {
    return undefined;
  }
};

const showNotification = async ({ title, message }) => {
  await createNotificationSafe("", {
    type: "basic",
    title: sanitizeText(title),
    message: sanitizeText(message),
  });
};

const setLastResult = async (result) => {
  await ext.storage.local.set({ [LAST_RESULT_KEY]: result });
};

const logLocalError = async (message) => {
  const data = await ext.storage.local.get(ERROR_LOG_KEY);
  const entries = data[ERROR_LOG_KEY] || [];
  entries.push({ message: sanitizeText(message), ts: Date.now() });
  if (entries.length > 50) entries.shift();
  await ext.storage.local.set({ [ERROR_LOG_KEY]: entries });
};

const buildWarningUrl = (originalUrl, verdict) => {
  const params = new URLSearchParams({
    url: originalUrl,
    status: verdict.status,
    confidence: String(verdict.confidence ?? ""),
    reason: verdict.reason || "Suspicious activity detected.",
  });
  return ext.runtime.getURL(`warning.html?${params.toString()}`);
};

const getNotificationRate = async () => {
  const data = await ext.storage.local.get(NOTIFY_RATE_KEY);
  return data[NOTIFY_RATE_KEY] || {};
};

const setNotificationRate = async (rateMap) => {
  await ext.storage.local.set({ [NOTIFY_RATE_KEY]: rateMap });
};

const setNotificationLink = async (notificationId, url) => {
  const data = await ext.storage.local.get(NOTIFY_LINKS_KEY);
  const links = data[NOTIFY_LINKS_KEY] || {};
  links[notificationId] = { url, ts: Date.now() };
  const entries = Object.entries(links).slice(-50);
  await ext.storage.local.set({ [NOTIFY_LINKS_KEY]: Object.fromEntries(entries) });
};

const getNotificationLink = async (notificationId) => {
  const data = await ext.storage.local.get(NOTIFY_LINKS_KEY);
  return data[NOTIFY_LINKS_KEY]?.[notificationId]?.url || "";
};

const addBlockRule = async (url) => {
  try {
    const parsed = new URL(url);
    const ruleId = BLOCK_RULE_PREFIX + (hashCode(parsed.hostname + parsed.pathname) % 100000);
    const rule = {
      id: ruleId,
      priority: 1,
      action: { type: "block" },
      condition: { urlFilter: url, resourceTypes: ["main_frame"] },
    };
    await ext.declarativeNetRequest.updateDynamicRules({
      addRules: [rule],
      removeRuleIds: [rule.id],
    });
    console.log("[PhishGuard] DNR rule registered", rule.id, url);
  } catch {
    // Ignore rule failures; redirect still protects the user.
  }
};

const hashCode = (value) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const normalizeConfidence = (value) => {
  if (!Number.isFinite(value)) return 0;
  return value > 1 ? Math.min(1, Math.max(0, value / 100)) : Math.min(1, Math.max(0, value));
};

const validateApiResponse = (data) => {
  if (!data || typeof data !== "object") return null;

  // Primary format: { status: "safe" | "phishing", confidence: number, reason: string }
  if (data.status === "safe" || data.status === "phishing") {
    if (typeof data.reason !== "string") return null;
    if (typeof data.confidence !== "number" || Number.isNaN(data.confidence)) return null;
    return {
      status: data.status,
      confidence: normalizeConfidence(data.confidence),
      reason: sanitizeText(data.reason),
      institution: typeof data.institution === "string" ? sanitizeText(data.institution) : undefined,
      risk: Number.isFinite(data.risk) ? data.risk : undefined,
    };
  }

  // Backend format: { riskLevel, confidence, explanation }
  if (typeof data.riskLevel === "string" && typeof data.explanation === "string") {
    const isPhishing = data.riskLevel === "high" || data.riskLevel === "critical" || data.status === "Phishing Detected";
    if (typeof data.confidence !== "number" || Number.isNaN(data.confidence)) return null;
    return {
      status: isPhishing ? "phishing" : "safe",
      confidence: normalizeConfidence(data.confidence),
      reason: sanitizeText(data.explanation),
      institution: typeof data.targetInstitution === "string" ? sanitizeText(data.targetInstitution) : undefined,
      risk: Number.isFinite(data.riskScore) ? data.riskScore : undefined,
    };
  }

  return null;
};

// Decide when to alert users for suspicious or phishing verdicts.
const shouldNotify = (verdict, risk) => {
  if (verdict === "phishing") return true;
  // Tightened threshold to reduce noisy alerts for borderline cases.
  if (verdict === "suspicious" && risk >= 80) return true;
  return false;
};

// Notify users with a risk summary, rate-limited per hostname.
const notifyThreat = async (detection) => {
  try {
    if (!ext?.notifications) return;
    const permission = await ext.notifications.getPermissionLevel();
    if (permission !== "granted") {
      console.log("[PhishGuard] Notifications permission not granted", permission);
      return;
    }
    if (!detection || typeof detection.url !== "string") return;

    const hostname = (() => {
      try {
        return new URL(detection.url).hostname;
      } catch {
        return "";
      }
    })();

    const rateMap = await getNotificationRate();
    const last = rateMap[hostname] || 0;
    if (Date.now() - last < NOTIFY_COOLDOWN_MS) return;

    const risk = Number.isFinite(detection.risk) ? detection.risk : Math.round((detection.confidence || 0) * 100);
    if (!shouldNotify(detection.verdict, risk)) return;

    const iconUrl = DEFAULT_ICON_DATA_URL;
    const notificationId = `phishguard-${hostname || "unknown"}-${Date.now()}`;

    await createNotificationSafe(notificationId, {
      type: "basic",
      iconUrl,
      title: "⚠️ PhishGuard Alert",
      message: `Impersonating: ${detection.institution || "Unknown"}\nRisk: ${Math.round(risk)}% — Do not enter credentials`,
      priority: 2,
    });

    console.log("[PhishGuard] Notification sent", notificationId, hostname);

    await setNotificationLink(notificationId, buildWarningUrl(detection.url, {
      status: detection.verdict,
      confidence: detection.confidence,
      reason: detection.reason,
    }));

    rateMap[hostname] = Date.now();
    await setNotificationRate(rateMap);

    setTimeout(() => ext.notifications.clear(notificationId), 7000);
  } catch {
    // Fail-safe: ignore notification errors or missing permissions.
  }
};

// Call the backend API and return a normalized verdict (cached when possible).
const checkUrl = async (url) => {
  const normalized = normalizeUrl(url);
  const cached = await getCachedVerdict(normalized);
  if (cached) return cached;

  console.log("[PhishGuard] Analyzing URL", normalized);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: normalized, type: "url", content: normalized }),
    });

    if (!response.ok) throw new Error("API error");
    const json = await response.json();
    const verdict = validateApiResponse(json);
    if (!verdict) throw new Error("Invalid API response");

    await cacheVerdict(normalized, verdict);
    return verdict;
  } catch (error) {
    // Fail-safe: allow browsing on network/API failures to avoid false blocks.
    await logLocalError(error?.message || "Network or API error");
    return { status: "safe", confidence: 0, reason: "Network error, allowed by fail-safe." };
  }
};

// Intercept top-level navigations to analyze URLs before load.
ext.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0 || !isHttpUrl(details.url)) return;
  if (details.url.startsWith(ext.runtime.getURL("warning.html"))) return;

  console.log("[PhishGuard] onBeforeNavigate", details.url);

  const verdict = await checkUrl(details.url);
  await setLastResult({ url: details.url, ...verdict, checkedAt: Date.now() });

  await notifyThreat({
    url: details.url,
    verdict: verdict.status,
    risk: verdict.risk,
    confidence: verdict.confidence,
    institution: verdict.institution,
    logo: verdict.logo,
    indicators: verdict.indicators,
    reason: verdict.reason,
  });

  if (verdict.status === "phishing") {
    await addBlockRule(details.url);
    await showNotification({
      title: "Phishing blocked",
      message: `Blocked a high-risk site. Confidence: ${Math.round(verdict.confidence * 100)}%`,
    });
    await ext.tabs.update(details.tabId, { url: buildWarningUrl(details.url, verdict) });
  }
});

ext.notifications.onClicked.addListener(async (notificationId) => {
  const url = await getNotificationLink(notificationId);
  if (!url) return;
  await ext.tabs.create({ url });
});

ext.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "CHECK_URL" && typeof message.url === "string") {
    checkUrl(message.url).then((verdict) => sendResponse({ verdict })).catch(() => sendResponse({ verdict: null }));
    return true;
  }
  return false;
});

// DNS failure warnings: trigger when navigation fails before network fetch.
// DNS failure warnings: detect suspicious DNS errors for main-frame navigations.
const DNS_ERRORS = new Set([
  "net::ERR_NAME_NOT_RESOLVED",
  "net::ERR_DNS_TIMED_OUT",
  "net::ERR_DNS_PROBE_FINISHED_NXDOMAIN",
]);

// Warn on DNS failures that may indicate phishing.
ext.webNavigation.onErrorOccurred.addListener(async (details) => {
  try {
    if (details.frameId !== 0) return;
    if (!isHttpUrl(details.url)) return;
    if (!DNS_ERRORS.has(details.error)) return;
    if (details.url.startsWith(ext.runtime.getURL(""))) return;

    const hostname = (() => {
      try {
        return new URL(details.url).hostname;
      } catch {
        return "";
      }
    })();

    await createNotificationSafe("", {
      type: "basic",
      title: "⚠️ Suspicious Link Blocked",
      message: `This link failed DNS resolution and may be a phishing attempt.${
        hostname ? ` (${hostname})` : ""
      }`,
    });
  } catch {
    // Fail-safe: ignore notification errors or missing permissions.
  }
});
