# PhishGuard-ET — Ethiopian Banking Phishing Detection

## Stack
- Frontend: Vite + React + TypeScript + TailwindCSS + shadcn-ui
- Detection: Hybrid heuristics + AI classifier (local) + optional Supabase Edge Function
- Backend API: Node + Express + JWT auth
- Database: Prisma with SQLite (dev) and PostgreSQL-ready schema
- Realtime: Supabase (pattern alerts)

## Detection Pipeline (Explainable)
- Heuristics: Domain/TLD checks, link shorteners, credential requests, urgency language, IP-based URLs.
- Machine Learning: Optional Supabase Edge Function `phishing-detect` classifier; local fallback blends signals.
- NLP Context: Amharic and English keywords, bank impersonation cues, unblock/reactivation themes.
- Each detection returns indicators including an "AI Classification" entry with score and reasons for transparency.

## Backend API (SQLite dev)
Location: `server/`

```bash
cd server
npm install
npx prisma migrate dev
npx prisma generate
npm run seed   # seeds admin user from .env
npm run dev    # http://localhost:8787
```

Key endpoints
- `POST /auth/login` → JWT for admin dashboard.
- `POST /logs` → public ingestion of detection results (used by Detect page).
- `GET /logs`, `GET /stats` → admin-only history and aggregates.
- `GET/POST/DELETE /trusted-domains` → whitelist management.
- `POST /reports`, `GET /reports` → community phishing reports.

Env (`server/.env` from `.env.example`)
- `DATABASE_URL` (SQLite dev; swap to Postgres for prod)
- `JWT_SECRET`
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`
- `ALLOWED_ORIGINS` (frontend origin)

## Frontend setup
```bash
npm install
npm run dev
```

Env
- `VITE_API_URL` (defaults to `http://localhost:8787`)
- Supabase env vars remain for Realtime and optional Edge Function.

## Admin Dashboard & Auth
- Visit `/admin/login` and sign in with the seeded admin credentials (change immediately via env + seed).
- `/dashboard` shows live stats, recent detections, and whitelist management backed by the API/SQLite.
- JWT is stored in `localStorage`; protected via a client guard.

## Educational Module
- `/learn` provides bilingual (English/Amharic) phishing education with fake vs. real examples for Ethiopian banks and Telebirr.

## Realtime Alerts
- Live alerts surface newly detected phishing patterns targeting Ethiopian banks. See the Detect page and the hook in `src/hooks/use-pattern-alerts.ts`. Configure a Supabase table `phishing_patterns` and enable Realtime to stream inserts.

## Tests
```bash
npm run test
```
Includes cases for SMS with bit.ly unblock theme and bank-lookalike URLs.
