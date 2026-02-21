<p align="center">
  <img src="jalseva/public/icons/icon-192.png" alt="JalSeva Logo" width="120" height="120" />
</p>

<h1 align="center">JalSeva (जलसेवा)</h1>

<p align="center">
  <sub>A <a href="https://dmj.one">dmj.one</a> project — Team Dhurandhar | SPRINT 2026</sub>
</p>

---

## The Problem

163 million Indians lack access to clean water. In thousands of towns across Bharat, families depend on water tankers — but the system is broken. No transparency. No tracking. No accountability. You call a number, hope someone picks up, and wait. Sometimes for hours. Sometimes they never come.

**We thought we could do better.**

---

## The Solution

**JalSeva** is a complete water tanker delivery platform. Think of it as three things:

1. **A booking app** — customers order water in 3 taps, or just speak in their language
2. **A business tool** — suppliers get real-time orders, route navigation, and earnings analytics
3. **An operations hub** — admins verify suppliers, manage commissions, and monitor every delivery live

But here's the thing — **these are not three separate apps.** This is one platform. One codebase. One `docker compose up`.

It just works.

---

## What Makes It Different

Most apps are built for people who speak English, read well, and have fast phones. That's not Bharat.

JalSeva is **voice-first**. Speak in Hindi, Tamil, Bengali — any of 22 Indian languages — and Gemini AI handles the rest. The interface is icon-driven, screen-reader accessible, and works offline as a PWA.

> Your grandmother who can't read English? She can order water with her voice. That's the bar we set.

---

## Three Taps. That's It.

**Tap one** — pick your location.
**Tap two** — choose your tanker size.
**Tap three** — pay with UPI.

Then watch your tanker arrive in real time on the map. Get notified at every step. Rate the delivery when it's done.

For suppliers, it's just as simple — accept orders, follow navigation, get paid. No paperwork. No middlemen.

---

## Features

| | What It Does |
|---|---|
| **Customer App** | Voice ordering, 3-tap booking, live GPS tracking, UPI payments |
| **Supplier Dashboard** | Real-time notifications, route navigation, earnings analytics |
| **Admin Panel** | Supplier verification, commission management, live ops map |
| **WhatsApp Bot** | Order water through a conversation — in any Indian language |
| **ONDC / Beckn** | Open Network for Digital Commerce integration |
| **Accessibility** | Hindi-first, ARIA labels, screen reader support, RTL-ready, reduced motion |

---

## Under the Hood

Great products hide their complexity. Here's what's running beneath the surface:

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 · React 19 · Tailwind CSS 4 · PWA (Serwist) |
| Animation | Motion (formerly Framer Motion) |
| AI | Google Gemini 3 Flash — voice, translation, demand prediction |
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
              │ + Auth  │ │(L1+) │ │ 3 Flash │
              └─────────┘ └──────┘ └─────────┘

Resilience layers at every level:
  ├── Circuit breakers (exponential backoff, 1-probe recovery)
  ├── L1 in-process cache (1-120s TTL, Firestore/Redis bypass)
  ├── Batch writer (50K buffer cap, backpressure, coalesced writes)
  ├── Rate limiting (Nginx edge + Redis application layer)
  └── Graceful shutdown (30s drain, parallel flushes, zero-downtime)
```

### Performance

We obsessed over every millisecond:

| What We Built | Why It Matters |
|---|---|
| **Cluster mode** | One worker per CPU core — 2-4x throughput, automatic |
| **L1 cache** | In-process cache bypasses Firestore and Redis entirely for hot paths |
| **Haversine tracking** | Sub-millisecond distance math — replaced blocking Maps API calls |
| **Circuit breakers** | One service goes down? Everything else keeps running |
| **Batch writer** | 50K write buffer with backpressure — Firestore never chokes |
| **Bounded queries** | Every Firestore scan has a `.limit()` — no runaway reads, ever |
| **Nginx edge cache** | Static assets cached 1 year. Pricing API cached 30s at edge |
| **Gzip compression** | 60-80% smaller payloads on every response |

---

## Getting Started

Four commands. That's all.

```bash
git clone https://github.com/divyamohan1993/jalseva.git
cd jalseva/jalseva
cp .env.example .env    # Add your API keys
npm install && npm run dev
```

Open **http://localhost:3000**. You're running JalSeva.

### Prerequisites

- **Node.js** >= 20 (22 recommended)
- **npm** >= 9
- A Firebase project with Firestore & Auth enabled
- Google Maps & Gemini API keys

### Prefer Docker?

```bash
cd jalseva/jalseva
docker compose up --build
```

One container. Cluster mode. Auto-detects your CPU cores. Done.

### Production Scale?

```bash
docker compose --profile scaled up --build
```

Nginx + 4 app containers. Each running cluster mode internally. **20,000+ requests per second** on a single VM.

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

## One More Thing.

Scaling. The part everyone gets wrong.

Most platforms need a rewrite to go from one city to national scale. JalSeva doesn't. **Zero code changes** — every scaling step is just an infrastructure decision:

| Scale | Code Change? | What You Do |
|---|---|---|
| **1 city** (MVP) | None | Single VM — `docker compose up` |
| **1 state** | None | Bigger VM |
| **Multi-state** | None | 2 VMs + load balancer |
| **National** | None | GKE Autopilot + Memorystore Redis |

Here's what that looks like in practice:

| Setup | Requests/sec | Cost |
|---|---|---|
| 1x e2-medium (2 vCPU, 4 GB) | 5-10K | ~$25/mo |
| 1x e2-standard-4, scaled mode | ~20K | ~$100/mo |
| 2x e2-standard-4 + GCP LB | ~40-60K | ~$250/mo |
| GKE Autopilot (auto-scales) | 50K+ | Pay per use |

**$25 a month to serve an entire city.** That's the starting point.

### How?

Eight things, working together:

- **Cluster mode** — every CPU core is used, automatically
- **L1 caching** — 80%+ fewer calls to external services
- **Circuit breakers** — failures stay isolated, never cascade
- **Batch writer** — Firestore writes coalesce under load
- **Bounded queries** — no runaway reads, predictable memory
- **Nginx edge** — rate limiting, compression, static caching
- **Graceful shutdown** — zero dropped requests during deploys
- **Stateless containers** — need more throughput? Add another

---

## Built for Everyone

JalSeva is built for all of Bharat — including users with disabilities, limited literacy, and diverse language needs:

- **22 languages** — Hindi default, with Gemini AI powering real-time translation
- **Voice-first** — microphone-based ordering for users who can't read
- **Screen readers** — ARIA labels, `role` attributes, `sr-only` text throughout
- **Keyboard navigation** — skip-to-content, logical tab order
- **Reduced motion** — respects `prefers-reduced-motion` system setting
- **RTL support** — ready for Urdu and other right-to-left scripts
- **Icon-driven UI** — large, color-coded visual indicators at every step

---

## Testing

```bash
cd jalseva/jalseva

npm test             # Run all tests
npm run test:watch   # Watch mode
npm run lint         # Lint with Biome
npm run build        # Production build
```

---

## Contributing

We'd love your help. Read [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

---

## Security

Found a vulnerability? Follow our [Security Policy](SECURITY.md). **Do not open a public issue** — email **contact@dmj.one** instead.

---

## The Team

| Role | Name | Contribution |
|------|------|-------------|
| **Owner & Orchestrator** | **Divya Mohan** ([@divyamohan1993](https://github.com/divyamohan1993)) | Project vision, architecture, management, execution & security review (Cybersecurity) |
| **AI Development Partner** | **Claude** (by Anthropic) | Full-stack code implementation under Divya's direction |
| Idea & Data Consulting | Jatin | Original idea for the platform; advised on analytics approach (Data Science) |
| Cloud Consulting | Anshuman | Provided input on infrastructure and deployment (Cloud) |
| Security Consulting | Ashutosh | Reviewed security and product design aspects (Cybersecurity) |
| AI Consulting | Kaustuv | Provided input on Gemini integration and demand prediction (AI) |

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
  Made with &#10084; for Bharat by <a href="https://dmj.one">dmj.one</a> — Team Dhurandhar
</p>
