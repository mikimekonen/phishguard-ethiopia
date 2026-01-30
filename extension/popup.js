const DETECTION_KEY = "lastDetection";
const contentEl = document.getElementById("content");

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const normalizeScore = (value) => {
  if (!Number.isFinite(value)) return 0;
  return value > 1 ? Math.min(100, Math.round(value)) : Math.round(value * 100);
};

const scoreClass = (score) => {
  if (score <= 30) return "green";
  if (score <= 70) return "orange";
  return "red";
};

const renderEmpty = () => {
  contentEl.innerHTML = `<div class="empty" role="status">No recent threats detected</div>`;
};

const render = (detection) => {
  if (!detection || typeof detection !== "object") return renderEmpty();

  const url = detection.url || "";
  let hostname = "";
  try {
    hostname = new URL(url).hostname;
  } catch {
    hostname = "";
  }

  const risk = normalizeScore(Number(detection.risk));
  const badge = `<span class="badge ${scoreClass(risk)}" aria-label="Risk score">Risk ${risk}%</span>`;
  const verdict = detection.verdict ? String(detection.verdict).toUpperCase() : "UNKNOWN";
  const institution = detection.institution ? escapeHtml(detection.institution) : "Not identified";
  const indicators = Array.isArray(detection.indicators) ? detection.indicators : [];

  contentEl.innerHTML = `
    <div class="subtle">Real-time phishing protection</div>
    <div class="url" aria-label="URL">
      <strong>${escapeHtml(hostname || "Unknown host")}</strong><br />
      ${escapeHtml(url)}
    </div>
    <div class="section">
      ${badge}
      <div class="label" style="margin-top: 8px;">Verdict</div>
      <div class="value verdict">${escapeHtml(verdict)}</div>
    </div>
    <div class="section">
      <div class="label">Impersonated institution</div>
      <div class="value">${institution}</div>
    </div>
    <div class="section">
      <div class="label">Indicators</div>
      <ul class="indicators" aria-label="Detected indicators">
        ${indicators.length ? indicators.map((item) => `<li>${escapeHtml(item)}</li>`).join("") : "<li>No indicators recorded.</li>"}
      </ul>
    </div>
  `;
};

chrome.storage.local.get(DETECTION_KEY, (data) => {
  render(data[DETECTION_KEY]);
});
