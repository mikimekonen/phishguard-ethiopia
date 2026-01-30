const params = new URLSearchParams(window.location.search);
const url = params.get("url") || "";
const reason = params.get("reason") || "Unknown";
const confidence = params.get("confidence") || "0";

const urlEl = document.getElementById("url");
const reasonEl = document.getElementById("reason");
const confidenceEl = document.getElementById("confidence");
const goBack = document.getElementById("goBack");
const proceed = document.getElementById("proceed");

urlEl.textContent = url;
reasonEl.textContent = reason;
const numericConfidence = Number(confidence);
const percent = Number.isFinite(numericConfidence)
  ? (numericConfidence > 1 ? Math.min(100, Math.round(numericConfidence)) : Math.round(numericConfidence * 100))
  : 0;
confidenceEl.textContent = `${percent}%`;

goBack.addEventListener("click", () => history.back());
proceed.addEventListener("click", () => {
  if (!url) return;
  window.location.href = url;
});
