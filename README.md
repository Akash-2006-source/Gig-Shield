# 🛡️ GigShield AI - Parametric Insurance for Gig Workers

the pitch : https://docs.google.com/document/d/1x4q_QNIpullTfvsC8EWliCdWpTx3e84K/edit?usp=sharing&ouid=115145416683647297385&rtpof=true&sd=true

<div align="center">

# 🛡️ GigShield AI

### Parametric Income-Loss Insurance for India's Gig Economy

*Rain stopped your ride? We pay you automatically.*

[![Status](https://img.shields.io/badge/status-live-success)](https://gigshield.app)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Hackathon](https://img.shields.io/badge/Hack%20the%20Knight-2026-purple)](#)
[![Made for](https://img.shields.io/badge/made%20for-Bharat-orange)](#)

[**Live Demo**](#) · [**Video Walkthrough**](#) · [**Pitch Deck**](#) · [**Report a Bug**](../../issues)

</div>

---

## 📖 Table of Contents

- [The Problem](#-the-problem)
- [The Solution](#-the-solution)
- [How It Works](#-how-it-works)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [API Reference](#-api-reference)
- [The Decision Engine](#-the-decision-engine)
- [Behavior Scoring](#-behavior-scoring)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [Team](#-team)
- [License](#-license)

---

## 🎯 The Problem

A Zomato rider in Chennai finishes a twelve-hour shift with **₹0 in earnings** because a four-hour monsoon killed every order window. A Swiggy partner in Delhi loses half a week to an AQI spike above 300. A Rapido driver in Mumbai sits out a day of hartal. None of them files a claim. None of them receives a rupee.

India has **10 million+ platform-based gig workers** (NITI Aayog, projected 23.5M by 2030), and almost none are insured against income loss. Traditional indemnity insurance can't serve this segment:

- **Claims are too small** — a ₹600 payout cannot absorb ₹400 in manual assessment cost
- **Claims are too frequent** — monsoon season alone produces thousands of claims per rider per year
- **Losses are impossible to verify** — no adjuster can retroactively prove a rider would have taken five more orders if it hadn't rained

The economics collapse before the empathy does.

---

## 💡 The Solution

GigShield is **parametric** insurance. We don't verify losses. We verify **triggers**.

When an objective, public, government-grade data feed crosses a pre-defined threshold inside a worker's verified zone, a payout is owed. Full stop. No claim form. No proof upload. No surveyor. The worker's UPI just lights up.

### Our four data sources are already live, already public, already free

| Source | What it provides |
|---|---|
| 🌧️ **IMD** (India Meteorological Department) | Rainfall intensity, heatwave alerts, cyclone warnings |
| 🌫️ **CPCB** (Central Pollution Control Board) | Real-time AQI per monitoring station |
| 🚨 **State & municipal feeds** | Red alerts, hartal notices, curfew declarations |
| 📍 **Worker GPS** (sampled every 60s) | Verifies the worker was actually in the affected zone |

---

## ⚙️ How It Works

```
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│   THE PERSON     │  ──▶  │  THE DISRUPTION  │  ──▶  │   THE RELIEF     │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ Delivery partner │       │ Rain ≥50mm/3hr   │       │ Decision engine  │
│ City + earnings  │       │ AQI ≥200         │       │ Policy → Fraud   │
│ UPI handle       │       │ Heat ≥42°C       │       │      → Reserve   │
│ GPS consent      │       │ Cyclone / hartal │       │ UPI in <24hrs    │
└──────────────────┘       └──────────────────┘       └──────────────────┘
```

### Pricing tiers

| Plan | Premium | Coverage Cap | Triggers |
|---|---|---|---|
| 🥉 **Shield Basic** | 2.0% of earnings (~₹100/wk) | ₹2,500/week | Heavy rain, Severe AQI |
| 🥈 **Shield Standard** ⭐ | 3.5% of earnings (~₹170/wk) | ₹3,500/week | + Extreme heat, Cyclone |
| 🥇 **Shield Pro** | 5.0% of earnings (~₹245/wk) | ₹5,000/week | + Curfew / hartal / strike |

> Premium is calculated as a **percentage of weekly earnings** — never a flat fee a worker can't afford on a slow week.

---

## ✨ Features

### For workers

- ⚡ **2-minute onboarding** — daily earnings, email, UPI handle, location consent
- 📍 **Auto-syncing GPS** every 60 seconds (5min when idle, with tab-visibility detection)
- 🗺️ **Live zone tracking** with Leaflet map and accuracy display
- 💸 **Direct UPI payouts** — no claim form, no proof upload, no surveyor
- 📊 **Live dashboard** showing weather, AQI, active policy, earnings protected, claim history
- ⏸️ **Pause and reactivate** policies between shifts
- 🔄 **Switch tiers** anytime
- 📱 **Mobile-first** responsive UI

### For admins / underwriters

- 🏷️ **Claim labeling dashboard** with legit / fraud / uncertain workflow
- 📈 **Distribution stats** + readiness indicator (500-label threshold for ML)
- 🔍 **Filterable queue** by verdict, risk score, unlabeled-first
- 📝 **Full audit trail** — every label change appends to claim notes
- 📦 **Dataset export** for ML training pipelines

### Under the hood

- 🔒 **Append-only financial ledgers** — no UPDATE, no DELETE on money writes
- 🔑 **Idempotent by reference key** — every financial action has a natural unique ID
- ⚖️ **Unified decision gate** — Policy → Fraud → Reserve, in cost order
- 🕰️ **Point-in-time feature joins** — ML training data matches what the system actually saw at decision time
- 🛡️ **Behavior score floors** — score can never push payout below 85% of capped amount
- 🎯 **Rate limiting** — 60 writes/min/IP on behavior ingestion

---

## 🛠️ Tech Stack

<table>
<tr>
<td valign="top" width="33%">

### Frontend
- ⚛️ React 18
- ⚡ Vite
- 🎨 Tailwind CSS
- 🗺️ Leaflet + React-Leaflet
- 🚦 React Router
- 🪝 Custom hooks (useBehaviorSampler)

</td>
<td valign="top" width="33%">

### Backend
- 🟢 Node.js + Express
- 🗄️ Sequelize ORM
- 🐘 PostgreSQL (migrating from SQLite)
- 🔐 JWT + bcrypt
- ⏰ node-cron (nightly jobs)
- 🛡️ express-rate-limit

</td>
<td valign="top" width="33%">

### Integrations
- 💳 Razorpay (payouts)
- 🌧️ IMD API (weather)
- 🌫️ CPCB API (AQI)
- 📍 Geolocation API
- 📧 Nodemailer (alerts)
- 🔔 Webhook handlers

</td>
</tr>
<tr>
<td valign="top">

### Data & ML *(planned v2)*
- 🐼 Pandas
- 🌳 XGBoost / LightGBM
- 📊 Feature engineering pipeline
- 🏷️ Labeled dataset export

</td>
<td valign="top">

### DevOps
- 🚀 Render (full deployment)
- 🐙 GitHub
- 📦 npm + concurrently
- 📜 Sequelize migrations
- 🔧 dotenv config

</td>
<td valign="top">

### Quality
- 🧪 Pytest (backend tests)
- 📜 Sequelize migrations
- 🔍 ESLint + Prettier
- 🪵 Structured logging
- 🚨 Sentry-ready

</td>
</tr>
</table>

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Worker (Mobile/Web)                         │
│  React + Vite · Leaflet · useBehaviorSampler · Tailwind            │
└────────────────────────────────┬────────────────────────────────────┘
                                 │ HTTPS
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API Layer (Express)                         │
│  JWT auth · Rate limiter · Tiered API keys · CORS                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐    │
│   │   Decision   │  │   Behavior   │  │   Trigger Service    │    │
│   │    Engine    │  │   Sampler    │  │  (IMD + CPCB poll)   │    │
│   │              │  │              │  │                      │    │
│   │ Policy →     │  │ Ingest GPS   │  │ Match zone + cap     │    │
│   │ Fraud →      │  │ Dedup events │  │ Auto-create claims   │    │
│   │ Reserve      │  │ Compute      │  │                      │    │
│   │              │  │ features     │  │                      │    │
│   └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘    │
│          │                 │                     │                 │
└──────────┼─────────────────┼─────────────────────┼─────────────────┘
           │                 │                     │
           ▼                 ▼                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PostgreSQL (append-only)                         │
│                                                                     │
│  Users · Policies · Claims · ClaimLabels · BehaviorEvents          │
│  UserScores · PremiumCharges · ReserveLedger · Payouts             │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
                                   ▼
                          ┌────────────────┐
                          │    Razorpay    │
                          │  (UPI payouts) │
                          └────────────────┘
```

### Core invariants

1. **Append-only ledgers** — Reserve, PremiumCharge, ClaimLabel, UserScore, BehaviorEvent — no UPDATE / DELETE paths
2. **Idempotency by reference key** — every financial write has a natural unique key (e.g. `premium:{chargeId}`, `alloc-claim-{claimId}`)
3. **Point-in-time joins for training** — `UserScore.scored_at ≤ Claim.submittedAt` so features match what the system actually used
4. **Score version tags** — `v1-rules` on every row, ready for drift detection when ML lands
5. **Behavior score never guts payouts** — bounded multiplier `[0.85, 1.10]` + hard 85% floor
6. **Full audit trails** — every label change appends to `Claim.notes`; decision verdicts persisted before disbursement

---

## 🚀 Getting Started

### Prerequisites

```
Node.js   >= 18.0
npm       >= 9.0
PostgreSQL >= 14  (or SQLite for local dev)
```

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/<your-username>/gigshield-ai.git
cd gigshield-ai

# 2. Install dependencies (root + frontend + backend)
npm install

# 3. Set up environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit both .env files with your credentials

# 4. Initialize the database
cd backend
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all  # optional sample data
cd ..

# 5. Start both servers concurrently
npm run dev
```

The frontend runs at `http://localhost:5173` and the backend at `http://localhost:5000`.

### Environment variables

**`backend/.env`**

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://user:pass@localhost:5432/gigshield
JWT_SECRET=your-super-secret-jwt-key
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
IMD_API_KEY=xxxxx
CPCB_API_KEY=xxxxx
ADMIN_API_KEY=xxxxx
```

**`frontend/.env`**

```env
VITE_API_URL=http://localhost:5000/api
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxx
```

### Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Run frontend + backend concurrently |
| `npm run dev:frontend` | Frontend only |
| `npm run dev:backend` | Backend only |
| `npm run build` | Production build of frontend |
| `npm run test` | Run backend test suite |
| `npm run migrate` | Run pending DB migrations |
| `npm run backfill:premiums` | One-time ledger backfill (use `--dry-run`) |

---

## 📁 Project Structure

```
gigshield-ai/
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/              # Route-level pages
│   │   │   ├── Landing.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── WorkerDashboard.jsx
│   │   │   ├── PolicyManagement.jsx
│   │   │   ├── ClaimSubmit.jsx
│   │   │   └── admin/
│   │   │       └── ClaimLabelingDashboard.jsx
│   │   ├── hooks/
│   │   │   └── useBehaviorSampler.js   # Adaptive GPS cadence
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   ├── behaviorService.js
│   │   │   └── adminLabelingService.js
│   │   └── App.jsx
│   └── vite.config.js
│
├── backend/
│   ├── controllers/            # Request handlers
│   │   ├── authController.js
│   │   ├── policyController.js
│   │   ├── claimController.js
│   │   ├── paymentController.js
│   │   └── adminController.js
│   ├── models/                 # Sequelize models
│   │   ├── User.js
│   │   ├── Policy.js
│   │   ├── Claim.js
│   │   ├── ClaimLabel.js       # ML labeling
│   │   ├── BehaviorEvent.js    # Append-only GPS events
│   │   ├── UserScore.js        # Append-only scores
│   │   ├── PremiumCharge.js
│   │   └── ReserveLedger.js
│   ├── services/
│   │   ├── decisionEngine.js   # ⭐ Policy → Fraud → Reserve
│   │   ├── reserveService.js   # Idempotent ledger primitive
│   │   ├── triggerService.js   # IMD/CPCB polling
│   │   ├── behaviorFeatures.js # Pure feature computation
│   │   ├── behaviorScoring.js  # Pure scoring rules
│   │   ├── userScoreService.js
│   │   └── trainingDataService.js
│   ├── utils/
│   │   ├── haversine.js        # Distance calculations
│   │   └── behaviorModifier.js # Score → premium/payout multiplier
│   ├── jobs/
│   │   └── computeBehaviorScores.js  # Nightly 3 AM cron
│   ├── middleware/
│   │   ├── auth.js
│   │   └── security.js         # Rate limiters
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── policyRoutes.js
│   │   ├── claimRoutes.js
│   │   ├── behaviorRoutes.js   # POST /api/behavior/ingest
│   │   └── adminRoutes.js
│   ├── scripts/
│   │   └── backfillPremiumLiquidity.js  # One-time backfill
│   ├── config/
│   │   └── db.js
│   └── server.js
│
├── docs/
│   ├── architecture.md
│   ├── decision-engine.md
│   └── behavior-scoring.md
│
└── package.json
```

---

## 🔌 API Reference

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new gig worker |
| `POST` | `/api/auth/login` | Login, returns JWT |
| `GET` | `/api/auth/me` | Get current user |

### Policies

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/policies` | Create a policy (Basic/Standard/Pro) |
| `GET` | `/api/policies` | List user's policies |
| `PATCH` | `/api/policies/:id/pause` | Pause an active policy |
| `PATCH` | `/api/policies/:id/reactivate` | Reactivate a paused policy |
| `DELETE` | `/api/policies/:id` | Cancel a policy |

### Claims

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/claims` | Submit a claim (mostly auto-created by triggers) |
| `GET` | `/api/claims` | List user's claim history |
| `GET` | `/api/claims/:id` | Get claim details + decision verdict |

### Behavior tracking

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/behavior/ingest` | Ingest GPS event (60s cadence, 60/min rate limit) |
| `GET` | `/api/behavior/score` | Get latest behavior score |

### Admin (requires `ADMIN_API_KEY`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/claims/labeling` | Labeling queue (filterable) |
| `POST` | `/api/admin/claims/:id/label` | Label a claim (legit/fraud/uncertain) |
| `GET` | `/api/admin/claims/label-stats` | Distribution + ML readiness indicator |

---

## ⚖️ The Decision Engine

Every claim — whether self-submitted or trigger-generated — flows through a single audited gate:

```
┌──────────────────────────────────────────────────────────────┐
│  gateClaimForPayout(claimId, amount)                         │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  1. POLICY CHECK │  ← cheapest, runs first
                    │  Active? Covered?│
                    │  Within caps?    │
                    └────────┬─────────┘
                             │ pass
                             ▼
                    ┌──────────────────┐
                    │  2. FRAUD CHECK  │  ← re-evaluated at payout
                    │  Behavior score  │     time, not just at claim
                    │  Geofence check  │     creation
                    │  Velocity check  │
                    └────────┬─────────┘
                             │ pass
                             ▼
                    ┌──────────────────┐
                    │ 3. RESERVE CHECK │  ← most expensive, runs last
                    │  Liquidity OK?   │
                    │  Allocate funds  │
                    └────────┬─────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │  Verdict: AUTO / REVIEW / BLOCK │
              │  + reasons[] persisted         │
              └──────────────────────────────┘
```

The gate **short-circuits on the first hard-fail** — no point looking up reserves for an invalid policy. Every verdict is persisted to `Claim.decision_verdict`, `Claim.decision_reasons`, and `Claim.decision_checked_at` **before** any disbursement is attempted.

---

## 📊 Behavior Scoring

GigShield ships a **deterministic v1 rule-based scorer** on day one — no ML dependency required for launch. The scoring system is designed to be swapped out cleanly for v2-ml once labeled data accumulates.

### Pure feature computation

```js
computeFeatures(events) → {
  total_events,           // Count of GPS samples
  active_days,            // Days with ≥1 event
  active_hours_avg,       // Avg active hours per day
  distance_km_total,      // Total movement (haversine)
  idle_fraction,          // % of samples with speed < threshold
  avg_speed_mps,          // Movement signal
  consistency_score,      // Day-over-day variance
  insufficient_data       // Bool
}
```

### Pure scoring rules (v1-rules)

| Condition | Penalty |
|---|---|
| `active_hours_avg < 2` | −0.30 |
| `distance_km_total < 1` | −0.20 |
| `consistency_score < 0.3` | −0.15 |
| `idle_fraction > 0.5` | −0.20 |
| Floor | 0.30 |
| Ceiling | 1.00 |
| `insufficient_data` | neutral 1.0 |

### Score → money mapping

```js
modifiersFor(scoreRow) → {
  premiumMultiplier ∈ [0.90, 1.20],   // Strong effect on pricing
  payoutMultiplier  ∈ [0.85, 1.10]    // Soft effect, with floor
}
```

The **`guaranteedFloorFraction = 0.85`** ensures a low score can never push a payout below 85% of the raw capped amount. This is a legal safety requirement baked into the pricing layer rather than the policy document.

---

## 🗺️ Roadmap

### ✅ Shipped

- [x] Append-only ledger architecture
- [x] Unified decision engine (Policy → Fraud → Reserve)
- [x] Behavior event ingestion + nightly scoring job
- [x] v1-rules deterministic scoring
- [x] Premium/payout modifier wiring with hard floor
- [x] Admin claim labeling dashboard
- [x] Training data export pipeline
- [x] Auto-syncing GPS with adaptive cadence
- [x] Razorpay sandbox integration
- [x] Live deployment on Render

### 🚧 Next 30 days

- [ ] **SQLite → PostgreSQL migration** (top priority)
- [ ] Unit tests on pure services (`behaviorFeatures`, `behaviorScoring`, `behaviorModifier`)
- [ ] Real Razorpay production wiring
- [ ] Wallet model + threshold migration (1.2 / 0.9 / 0.7)
- [ ] Retry count: 3 → 6

### 🔮 Next 90 days

- [ ] Pilot with one delivery platform (target 500 riders, one city, one monsoon month)
- [ ] First ML model trained on ~500 labels (XGBoost/LightGBM)
- [ ] Bump `scoring_version` from `v1-rules` to `v2-ml`
- [ ] Bulk labeling, keyboard shortcuts, CSV dataset export
- [ ] Multi-language support (Hindi, Tamil, Telugu, Kannada)

### 🌅 Beyond

- [ ] Platform-embedded distribution (insurance offered at rider onboarding)
- [ ] Adjacent verticals — construction labor, outdoor sales, tourism guides
- [ ] B2B2C: white-label decision engine for employer-of-record platforms
- [ ] IRDAI sandbox application

---

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'feat: add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages and ensure tests pass before submitting.

---

## 👥 Team

Built for **Hack the Knight** (SRM Institute × CodeNex) and the **Hindsight Hackathon**.

| Name | Role | Links |
|---|---|---|
| **Rahul** | Full-stack & systems | [@kinghardesh](https://github.com/kinghardesh) |
| **Akash** | Backend & integrations | [@akash](https://github.com/) |

---

## 🙏 Acknowledgments

- **NITI Aayog** — for the gig-economy data that anchored our market sizing
- **IMD** & **CPCB** — for the public data feeds that make parametric triggers possible
- **NPCI** — for the UPI rails that make sub-₹1,000 instant payouts free
- **Razorpay** — for the payout API
- **OpenStreetMap** + **Leaflet** — for the open mapping stack
- **SRM Institute** & **CodeNex** — for hosting Hack the Knight
- **Vectorize.io / Hindsight** — for the memory layer used in the broader project family

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for more information.

---

<div align="center">

### 🛡️ Built for Bharat. Built for the rider in the rain.

**Rain stopped your ride? We pay you automatically.**

[⬆ Back to top](#-gigshield-ai)

</div>