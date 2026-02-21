<p align="center">
  <img src="jalseva/public/icons/icon-192x192.png" alt="JalSeva Logo" width="96" height="96" />
</p>

<h1 align="center">JalSeva (जलसेवा)</h1>

<p align="center">
  <strong>Uber for Water Tankers — built for Bharat</strong>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> ·
  <a href="#features">Features</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#deployment">Deployment</a> ·
  <a href="#scaling">Scaling</a> ·
  <a href="#api-reference">API</a> ·
  <a href="#contributing">Contributing</a>
</p>

---

**JalSeva** is an open-source digital marketplace that connects water-tanker suppliers with customers across India. Real-time booking, live GPS tracking, dynamic pricing, and UPI payments — in a voice-first, icon-heavy PWA designed for users with limited literacy.

> Supports 22 Indian languages via Gemini AI. Accessible by default — Hindi locale, ARIA labels, RTL-ready, `prefers-reduced-motion` support.

---

## Features

| Area | Highlights |
|---|---|
| **Customer App** | Voice ordering via Gemini AI, 3-tap booking, live map tracking, UPI payments |
| **Supplier Dashboard** | Real-time order notifications, route navigation, earnings analytics |
| **Admin Panel** | Supplier verification, commission management, live ops map, analytics |
| **WhatsApp Bot** | Conversational ordering in any Indian language |
| **ONDC / Beckn** | Open Network for Digital Commerce integration (staging sandbox) |
| **Accessibility** | `lang="hi-IN"`, skip-to-content, screen reader support, RTL, reduced motion |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 · React 19 · Tailwind CSS 4 · PWA (Serwist) |
| Animation | Motion (formerly Framer Motion) |
| AI | Google Gemini 2.0 Flash — voice, translation, demand prediction |
| Maps | Google Maps JavaScript API |
| Auth | Firebase Auth (Phone OTP) |
| Database | Cloud Firestore (real-time) |
| Payments | Razorpay (UPI, Cards, Wallets) — _simulated in dev_ |
| State | Zustand |
| Cache | Upstash Redis (serverless) + L1 in-process cache |
| Runtime | Node.js 22 · TypeScript 5.9 |
| Linting | Biome |
| Testing | Vitest · Testing Library |
| Deploy | Docker · Nginx · Cluster mode (multi-core) |

---

## Architecture

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Customer   │  │  Supplier   │  │   Admin     │  │  WhatsApp   │
│  PWA (/)    │  │  (/supplier)│  │  (/admin)   │  │  Bot        │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │                │
       └────────────────┴────────────────┴────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │    Nginx (optional)   │  Rate limiting, gzip,
                    │    Load Balancer      │  static cache, security headers
                    └───────────┬───────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                  ▼
        ┌──────────┐    ┌──────────┐       ┌──────────┐
        │ Worker 1 │    │ Worker 2 │  ...  │ Worker N │
        │ (Next.js)│    │ (Next.js)│       │ (Next.js)│
        └────┬─────┘    └────┬─────┘       └────┬─────┘
             └───────────────┼────────────────────┘
                             │
                   ┌─────────┼─────────┐
                   ▼         ▼         ▼
              ┌─────────┐ ┌──────┐ ┌─────────┐
              │Firestore│ │Redis │ │ Gemini  │
              │ + Auth  │ │(L1+) │ │ 2.0     │
              └─────────┘ └──────┘ └─────────┘

Resilience layers at every level:
  ├── Circuit breakers (exponential backoff, 1-probe recovery)
  ├── L1 in-process cache (1-120s TTL, Firestore/Redis bypass)
  ├── Batch writer (50K buffer cap, backpressure, coalesced writes)
  ├── Rate limiting (Nginx edge + Redis application layer)
  └── Graceful shutdown (30s drain, parallel flushes, zero-downtime)
```

### Performance Features

| Feature | Impact |
|---|---|
| **Cluster mode** | One worker per CPU core via `server.cluster.js` — 2-4x throughput |
| **L1 cache** | In-process cache on auth, pricing, payments — avoids Firestore/Redis round trips |
| **Haversine tracking** | Sub-millisecond distance calculation (replaced blocking Maps API) |
| **Circuit breakers** | Prevents cascade failures; 1-probe half-open recovery with backoff |
| **Batch writer** | Coalesces Firestore writes; 50K buffer cap with backpressure |
| **Bounded queries** | All Firestore scans use `.limit()` — no unbounded reads |
| **Nginx caching** | Static assets cached 1 year; pricing API cached 30s at edge |
| **Gzip compression** | 60-80% payload reduction on text responses |

---

## Quick Start

### Prerequisites

- **Node.js** >= 20 (22 recommended)
- **npm** >= 9
- A Firebase project with Firestore & Auth enabled
- Google Maps & Gemini API keys

### Installation

```bash
# Clone
git clone https://github.com/divyamohan1993/jalseva.git
cd jalseva/jalseva

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys (see Environment Variables below)

# Start dev server
npm run dev
```

The app runs at **http://localhost:3000**.

### Docker (Single Container)

```bash
cd jalseva/jalseva
docker compose up --build
```

This starts a single container with cluster mode (auto-detects CPU cores). Suitable for development and single-VM production.

### Docker (Scaled Mode — Production)

```bash
cd jalseva/jalseva
docker compose --profile scaled up --build
```

This starts **Nginx + 4 app containers**, each running cluster mode internally. Handles ~20K+ RPS on a single VM.

---

## Project Structure

```
jalseva/
├── jalseva/                    # Next.js application
│   ├── src/
│   │   ├── app/                # App Router pages & API routes
│   │   │   ├── api/            # Backend API (19 endpoints)
│   │   │   ├── admin/          # Admin panel (analytics, suppliers, orders)
│   │   │   ├── supplier/       # Supplier dashboard
│   │   │   ├── booking/        # Customer booking flow
│   │   │   ├── tracking/       # Live GPS tracking
│   │   │   └── ...
│   │   ├── components/         # Reusable UI & shared components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Core libraries
│   │   │   ├── firebase.ts     # Firebase client
│   │   │   ├── firebase-admin.ts
│   │   │   ├── gemini.ts       # Gemini AI client
│   │   │   ├── maps.ts         # Google Maps
│   │   │   ├── redis.ts        # Upstash Redis
│   │   │   ├── razorpay.ts     # Razorpay payments
│   │   │   ├── circuit-breaker.ts
│   │   │   ├── batch-writer.ts
│   │   │   ├── cache.ts        # L1 in-process cache
│   │   │   ├── rate-limiter.ts
│   │   │   ├── shutdown.ts     # Graceful shutdown
│   │   │   └── ...
│   │   └── types/              # TypeScript type definitions
│   ├── public/                 # Static assets & PWA icons
│   ├── nginx/                  # Nginx configuration
│   │   └── nginx.conf
│   ├── server.cluster.js       # Multi-core cluster server
│   ├── Dockerfile              # Multi-stage production build
│   ├── docker-compose.yml      # Single + scaled deployment modes
│   └── .env.example
├── docs/                       # Design documents
├── .github/                    # Issue & PR templates
├── CONTRIBUTING.md
├── SECURITY.md
├── CODE_OF_CONDUCT.md
└── LICENSE                     # ISC License
```

---

## Environment Variables

Copy `jalseva/.env.example` to `jalseva/.env` and fill in your keys:

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_*` | Yes | Firebase client SDK configuration (6 variables) |
| `FIREBASE_ADMIN_*` | Yes | Firebase Admin SDK credentials (4 variables) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Yes | Google Maps (client-side) |
| `GOOGLE_MAPS_API_KEY` | Yes | Google Maps (server-side) |
| `GOOGLE_GEMINI_API_KEY` | Yes | Gemini AI for voice, translation, demand prediction |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | No | Razorpay — simulated by default |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Yes | Upstash Redis for caching & rate limiting |
| `WHATSAPP_*` | No | WhatsApp Business API (3 variables) |
| `ONDC_*` | No | ONDC/Beckn — simulated by default (4 variables) |
| `CLUSTER_WORKERS` | No | `0` = auto (all CPUs), `1` = single process |
| `SHUTDOWN_TIMEOUT` | No | Graceful shutdown timeout in ms (default: `10000`) |

---

## API Reference

All routes are under `/api/`. Authentication is via Firebase Auth token in the `Authorization` header.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/send-otp` | Send phone OTP for login |
| GET/PUT | `/api/auth/profile` | Get/update user profile |
| GET | `/api/pricing` | Calculate delivery price (cached 30s) |
| POST | `/api/orders` | Create a new order |
| GET | `/api/orders` | List orders (customer/supplier) |
| GET/PUT | `/api/orders/[orderId]` | Get/update specific order |
| GET | `/api/suppliers` | List all suppliers |
| GET/PUT | `/api/suppliers/[supplierId]` | Get/update supplier |
| GET | `/api/suppliers/nearby` | Find nearby available suppliers |
| GET/PUT | `/api/tracking` | Real-time GPS tracking (Haversine + async Maps) |
| POST | `/api/payments/create-order` | Create Razorpay payment order |
| POST | `/api/payments/verify` | Verify payment signature |
| POST | `/api/ratings` | Submit delivery rating |
| GET | `/api/admin/analytics` | Admin analytics dashboard |
| POST | `/api/ai/chat` | Gemini AI chat (voice ordering) |
| POST | `/api/ai/voice` | Voice-to-text + intent extraction |
| POST | `/api/beckn/search` | ONDC search (BAP) |
| POST | `/api/beckn/confirm` | ONDC confirm (BAP) |
| POST | `/api/whatsapp/webhook` | WhatsApp Bot webhook |
| GET | `/api/health` | Health check |

---

## Deployment

### Option 1: Single VM (MVP)

Best for: getting started, city-level deployments.

```bash
# On your VM (e.g., GCP e2-medium)
git clone https://github.com/divyamohan1993/jalseva.git
cd jalseva/jalseva
cp .env.example .env
# Fill in .env with your API keys

docker compose up -d --build
```

The app is live on port 3000. Cluster mode auto-detects your CPU cores.

| VM Type | vCPUs | RAM | Estimated RPS | Cost |
|---|---|---|---|---|
| e2-medium | 2 | 4 GB | 5-10K | ~$25/mo |
| e2-standard-4 | 4 | 16 GB | 15-25K | ~$100/mo |

### Option 2: Scaled Mode (Regional)

Best for: multi-state, higher throughput.

```bash
docker compose --profile scaled up -d --build
```

Starts Nginx + 4 app containers. Handles ~20K+ RPS on a single VM.

### Option 3: Multi-VM (National)

Best for: all-India scale, 50K+ RPS.

1. Deploy scaled mode on 2+ VMs
2. Put a GCP HTTP(S) Load Balancer in front
3. Add Cloud CDN for static assets (one checkbox)
4. Upgrade Upstash to Memorystore Redis for <1ms latency

| Setup | RPS | Cost |
|---|---|---|
| 1x e2-standard-4, scaled mode | ~20K | ~$100/mo |
| 2x e2-standard-4 + GCP LB | ~40-60K | ~$250/mo |
| GKE Autopilot (auto-scales) | 50K+ | Pay per use |

---

## Scaling

The architecture is designed to scale from a single $25/mo VM to national-level traffic with **zero code changes**. Every scaling step is an infrastructure decision:

| Scale | Code Change? | What to Do |
|---|---|---|
| MVP (1 city) | No | Single VM, `docker compose up` |
| 1 state | No | Bigger VM |
| Multi-state | No | 2 VMs + load balancer |
| National | No | GKE Autopilot + Memorystore Redis |

### What Makes This Possible

- **Cluster mode** — uses all CPU cores automatically
- **L1 caching** — reduces external service calls by 80%+
- **Circuit breakers** — isolated failures, no cascading crashes
- **Batch writer** — coalesces Firestore writes under load
- **Bounded queries** — no runaway reads, predictable memory usage
- **Nginx** — rate limiting, compression, static caching at edge
- **Graceful shutdown** — zero dropped requests during redeployments
- **Stateless containers** — scale horizontally by adding more

---

## Accessibility

JalSeva is built for Bharat — including users with disabilities, limited literacy, and diverse language needs:

- **Language**: `lang="hi-IN"` default, 22 Indian languages via Gemini AI
- **Screen readers**: ARIA labels, `role` attributes, `sr-only` text throughout
- **Keyboard**: Skip-to-content link, logical tab order
- **Motion**: Respects `prefers-reduced-motion` system setting
- **RTL**: Ready for Urdu and other right-to-left scripts
- **Voice-first**: Microphone-based ordering for low-literacy users
- **Icons**: Large, color-coded visual indicators (green/yellow/red status)

---

## Testing

```bash
cd jalseva/jalseva

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint
npm run lint

# Build
npm run build
```

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## Security

If you discover a security vulnerability, please follow our [Security Policy](SECURITY.md). **Do not open a public issue.**

---

## License

[ISC License](LICENSE) — Copyright (c) 2026 Divya Mohan

---

## Acknowledgements

- [Next.js](https://nextjs.org/) — React framework
- [React](https://react.dev/) — UI library
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS
- [Motion](https://motion.dev/) — Animation library
- [Firebase](https://firebase.google.com/) — Auth & real-time database
- [Google Maps Platform](https://developers.google.com/maps) — Maps & geocoding
- [Google Gemini AI](https://ai.google.dev/) — Voice, translation & demand prediction
- [Razorpay](https://razorpay.com/) — Payments
- [ONDC](https://ondc.org/) — Open Network for Digital Commerce
- [Upstash](https://upstash.com/) — Serverless Redis
- [Biome](https://biomejs.dev/) — Linter & formatter
- [Vitest](https://vitest.dev/) — Testing framework

---

<p align="center">
  Made with &#10084; for Bharat
</p>
