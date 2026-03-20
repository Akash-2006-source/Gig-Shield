# Render Monolith Deploy — Design Spec

## Goal

Deploy the Gig-Shield full-stack app (React frontend + Express backend) as a single Render Web Service. One URL, one deploy, zero CORS issues.

## Context

- Hackathon project — ephemeral data (SQLite resets on deploy) is acceptable
- Free tier on Render
- Helping another developer (Akash) get this deployed
- No Netlify config existed; Netlify can't run Express backends anyway

## Changes Required

### 1. Backend `server.js` — Serve static frontend in production

Add middleware to serve the Vite-built React app from `../frontend/dist`. Add SPA fallback that excludes `/api` routes so malformed API requests still get proper 404s instead of `index.html`.

```js
const path = require('path')
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')))
  // SPA fallback — exclude /api routes
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'))
  })
}
```

### 2. Frontend `src/services/api.js` — Use relative API URL

Change hardcoded `http://localhost:5000/api` to `/api` so requests go to the same origin in production and can be proxied in development.

```js
const API_BASE_URL = '/api'
```

### 3. Frontend `vite.config.js` — Add dev proxy

So local development still works (frontend dev server proxies `/api` to the backend):

```js
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:5000'
    }
  }
})
```

### 4. Add `render.yaml` at project root

Infrastructure-as-Code file telling Render how to build and run. Let Render assign the PORT automatically (don't hardcode it). Specify Node 20 to avoid compatibility issues with Vite 8 / React 19.

```yaml
services:
  - type: web
    name: gig-shield
    runtime: node
    nodeVersion: "20"
    buildCommand: cd frontend && npm install && npm run build && cd ../backend && npm install
    startCommand: cd backend && node server.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: JWT_SECRET
        generateValue: true
```

### 5. Environment variables

Set via Render dashboard (not committed):
- `JWT_SECRET` — auto-generated via render.yaml
- `OPENWEATHER_API_KEY` — if needed for demo
- `STRIPE_SECRET_KEY` — if needed for demo (set a dummy value like `sk_test_dummy` to prevent crash on startup)
- `NODE_ENV=production`
- `PORT` — let Render assign automatically

### 6. Untrack `.env` from git

The `.env` file is currently tracked in the repo despite being in `.gitignore` (it was added before the gitignore entry). Run `git rm --cached .env` to stop tracking it.

### 7. Add health check endpoint

Add `GET /api/health` to help Render's health checks:

```js
app.get('/api/health', (req, res) => res.json({ status: 'ok' }))
```

## Notes

- **dotenv in production:** `server.js` calls `dotenv.config({ path: '../.env' })`. On Render, env vars are injected natively so this call silently no-ops (no `.env` file exists). No change needed.
- **CommonJS vs ESM:** Root `package.json` has `"type": "module"` but backend uses `require()`. This works because `backend/package.json` is closer and doesn't set `"type"`, defaulting to CommonJS. Fragile but fine as-is.
- **Duplicate root files:** Root has `package.json`, `vite.config.js`, `index.html` that duplicate `frontend/`. These are unused artifacts — not touching them to minimize changes.
- **CORS middleware:** Unnecessary in production monolith mode (same origin). Leaving it — harmless.

## What stays the same

- All frontend components, pages, services (except api.js base URL)
- All backend routes, controllers, models, middleware
- SQLite database (ephemeral on Render free tier — acceptable for hackathon)
- Project directory structure

## Build & Runtime Flow

```
Build:  cd frontend && npm install && npm run build && cd ../backend && npm install
Start:  cd backend && node server.js
```

Express serves:
- `/api/*` — backend API routes
- `/*` — React static files from `frontend/dist/`
- SPA fallback — any non-API route returns `index.html`

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Render free tier has 30-60s cold starts after 15min inactivity | Acceptable for hackathon demo |
| SQLite data resets on every deploy | Acceptable per requirements |
| `.env` is currently tracked in git | Untrack with `git rm --cached .env` |
| Stripe crashes if `STRIPE_SECRET_KEY` unset | Set dummy value in Render env vars |
