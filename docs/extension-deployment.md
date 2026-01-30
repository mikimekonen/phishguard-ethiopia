# PhishGuard Ethiopia Browser Extension (MV3)

## Production configuration
- Update `PROD_API_BASE_URL` in [extension/service-worker.js](extension/service-worker.js) to your production API origin.
- Keep `host_permissions` restricted to that origin in [extension/manifest.json](extension/manifest.json).
- Use `USE_PROD = true` for production builds; toggle to `false` for local development.

## Build & package
1. Ensure the extension folder contains:
   - manifest.json
   - service-worker.js
   - popup.html / popup.js
   - warning.html / warning.js
   - icons/
2. Create a zip for distribution:
   - Zip the contents of the `extension/` directory (not the parent folder).
3. Load unpacked (Chrome/Edge):
   - Open `chrome://extensions` or `edge://extensions`
   - Enable **Developer mode**
   - Click **Load unpacked** and select the `extension/` folder

## Chrome Web Store submission
- Increment version in [extension/manifest.json](extension/manifest.json) for each release.
- Provide privacy policy and explain that only URLs are analyzed.
- Ensure production API is reachable and uses HTTPS.
- Validate minimal permissions:
  - `storage` for cache
  - `notifications` for user alerts
  - `tabs` + `webNavigation` for safe redirects
  - `declarativeNetRequest` for blocking malicious navigation

## Security notes
- Response validation is strict (status, confidence, reason).
- Fail-safe mode allows navigation on network/API errors, with local logs in `chrome.storage`.
- Dynamic DNR rules enforce blocking of known phishing URLs.
