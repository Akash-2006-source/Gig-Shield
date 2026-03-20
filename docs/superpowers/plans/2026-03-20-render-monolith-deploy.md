# Render Monolith Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the Gig-Shield full-stack app as a single Render Web Service — one URL serving both the Express API and the React frontend.

**Architecture:** Express backend serves API routes at `/api/*` and the Vite-built React frontend as static files for all other routes. SPA fallback ensures React Router works on page refresh.

**Tech Stack:** Express, React, Vite, SQLite, Render

**Spec:** `docs/superpowers/specs/2026-03-20-render-monolith-deploy-design.md`

---

### Task 1: Change frontend API base URL to relative path

**Files:**
- Modify: `frontend/src/services/api.js:4`

- [ ] **Step 1: Update API_BASE_URL**

Change line 4 from:
```js
const API_BASE_URL = 'http://localhost:5000/api'
```
to:
```js
const API_BASE_URL = '/api'
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/services/api.js
git commit -m "fix: use relative API URL for production deployment"
```

---

### Task 2: Add Vite dev proxy for local development

**Files:**
- Modify: `frontend/vite.config.js`

- [ ] **Step 1: Add proxy config**

Replace the full contents of `frontend/vite.config.js` with:
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:5000'
    }
  }
})
```

- [ ] **Step 2: Commit**

```bash
git add frontend/vite.config.js
git commit -m "feat: add Vite dev proxy for /api routes"
```

---

### Task 3: Add health check and static file serving to backend

**Files:**
- Modify: `backend/server.js`

- [ ] **Step 1: Add `path` require at top of file**

Add after line 3 (`const dotenv = require('dotenv')`):
```js
const path = require('path')
```

- [ ] **Step 2: Add health check endpoint**

Add after line 31 (`app.use('/api/user', require('./routes/userRoutes'))`):
```js

// Health check for Render
app.get('/api/health', (req, res) => res.json({ status: 'ok' }))
```

- [ ] **Step 3: Add production static file serving and SPA fallback**

Add after the health check endpoint (before `const PORT`):
```js

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')))
  // SPA fallback — exclude /api routes
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'))
  })
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/server.js
git commit -m "feat: serve frontend static files in production, add health check"
```

---

### Task 4: Add render.yaml

**Files:**
- Create: `render.yaml` (project root)

- [ ] **Step 1: Create render.yaml**

Create `/Users/rahul/Documents/Github/Gig-Shield/render.yaml` with:
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

- [ ] **Step 2: Commit**

```bash
git add render.yaml
git commit -m "feat: add render.yaml for Render deployment"
```

---

### Task 5: Untrack .env from git

**Files:**
- Untrack: `.env`

- [ ] **Step 1: Remove .env from git tracking**

```bash
git rm --cached .env
```

This keeps the file locally but stops tracking it. It's already in `.gitignore`.

- [ ] **Step 2: Commit**

```bash
git commit -m "chore: untrack .env file from git"
```

---

### Task 6: Build and verify locally

- [ ] **Step 1: Install frontend dependencies and build**

```bash
cd frontend && npm install && npm run build
```

Expected: `frontend/dist/` directory is created with built assets.

- [ ] **Step 2: Verify dist directory exists**

```bash
ls frontend/dist/
```

Expected: Contains `index.html`, `assets/` folder with JS/CSS bundles.

- [ ] **Step 3: Install backend dependencies**

```bash
cd backend && npm install
```

- [ ] **Step 4: Test production mode locally**

```bash
cd backend && NODE_ENV=production node server.js
```

Expected: Server starts on port 5000. Visit `http://localhost:5000` — should show the React app. Visit `http://localhost:5000/api/health` — should return `{"status":"ok"}`.

- [ ] **Step 5: Stop the server (Ctrl+C) and commit any lockfile changes if needed**

---

### Task 7: Push and deploy on Render

- [ ] **Step 1: Push all commits to GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Deploy on Render**

Go to https://render.com → New → Web Service → Connect GitHub repo `Gig-Shield` → Render detects `render.yaml` and auto-configures. Click "Create Web Service".

- [ ] **Step 3: Set additional env vars in Render dashboard (if needed for demo)**

- `STRIPE_SECRET_KEY` = `sk_test_dummy` (prevents crash on payment routes)
- `OPENWEATHER_API_KEY` = actual key if weather features need to work

- [ ] **Step 4: Verify deployment**

Once deploy completes, visit the Render URL:
- `/` — React app loads
- `/api/health` — returns `{"status":"ok"}`
- Navigate around the React app, refresh on a sub-route — SPA fallback works
