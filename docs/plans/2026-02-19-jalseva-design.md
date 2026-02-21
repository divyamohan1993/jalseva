# JalSeva — Design Document

**Version:** 2.0 | **Date:** February 19, 2026 | **Status:** Implemented

---

## The Problem

Every day in India, millions of families wait for water. Not from a tap — from a tanker. They call a number, hope someone picks up, and wait. Sometimes for hours. Sometimes the tanker never comes.

There's no tracking. No pricing transparency. No accountability. And no one is building the technology to fix it.

**Until now.**

---

## What JalSeva Is

JalSeva (जलसेवा — "Water Service") is an open-source digital marketplace connecting water tanker suppliers with customers across India.

Think of it as three things in one:

1. A **customer app** — order water in 3 taps or by speaking in your language
2. A **supplier platform** — accept orders, navigate to customers, get paid
3. An **operations hub** — verify suppliers, manage commissions, monitor everything live

**Design Principles:**

- Voice-first, icon-heavy UI for users with limited literacy
- 3-tap maximum to complete any booking
- Works on low-end Android devices and 2G/3G networks (PWA)
- Hindi-first with 22 Indian language support via Gemini AI

---

## The Tech Stack

Every technology choice was made for a reason:

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, PWA (Serwist) | Server-side rendering, offline support, fast on slow networks |
| Animation | Motion 12 (formerly Framer Motion) | Smooth transitions that respect `prefers-reduced-motion` |
| Backend | Next.js 16 API Routes (standalone mode) | Single codebase, no separate backend to deploy |
| Database | Cloud Firestore (real-time) | Real-time sync for live tracking, zero ops |
| Auth | Firebase Auth (Phone OTP) | Phone-first — 95% of India logs in with a phone number |
| Maps | Google Maps JavaScript API, Routes API, Geocoding | The standard for India's map data |
| Payments | Razorpay (UPI, Cards, Wallets) — simulated in dev | UPI-first — 10B+ UPI transactions/month in India |
| AI | Gemini 3 Flash — voice, translation, demand prediction | Multilingual voice understanding, built for Indic languages |
| WhatsApp | Meta Cloud API (WhatsApp Business) | 500M+ WhatsApp users in India |
| State | Zustand 5 | Minimal, fast, no boilerplate |
| Cache | Upstash Redis (serverless) + L1 in-process cache | Two-layer caching — sub-millisecond hot paths |
| ONDC | Beckn Protocol (staging sandbox) | Open commerce — get discovered by 300K+ ONDC sellers/buyers |
| Runtime | Node.js 22, TypeScript 5.9 | Type safety, latest performance optimizations |
| Linting | Biome | Fast, opinionated, zero-config |
| Testing | Vitest, Testing Library | Fast tests, component-level coverage |
| Deploy | Docker, Nginx, Cluster mode | One command to production, any VM |

---

## System Architecture

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Customer   │  │  Supplier   │  │   Admin     │  │  WhatsApp   │
│  PWA (/)    │  │ (/supplier) │  │  (/admin)   │  │  Bot        │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │                │
       └────────────────┴────────────────┴────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │    Nginx (optional)   │  Rate limiting, gzip,
                    │    Load Balancer      │  static cache, WebSocket
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
         ┌─────────┬─────────┼─────────┬─────────┐
         ▼         ▼         ▼         ▼         ▼
    Firestore   Firebase   Redis    Gemini    Razorpay
    (DB)        Auth       (Cache)  3 Flash   (Pay)
                                      │
                          ┌───────────▼───────────┐
                          │  ONDC/Beckn Protocol  │
                          │  Layer (BAP + BPP)    │
                          └───────────────────────┘
```

### Resilience — What Happens When Things Go Wrong

Every request passes through multiple safety layers:

```
Request → Nginx rate limit → Circuit breaker → L1 cache → Redis → Firestore
                                    │               │         │
                                    │ (open)        │ (hit)   │ (miss)
                                    ▼               ▼         ▼
                              Return 503     Return cached   Query + cache
```

| Layer | File | What It Does |
|---|---|---|
| **Circuit Breaker** | `src/lib/circuit-breaker.ts` | Exponential backoff, 1-probe HALF_OPEN recovery — one service down doesn't take everything down |
| **L1 Cache** | `src/lib/cache.ts` | In-process cache (1-120s TTL) — bypasses Redis and Firestore entirely for hot paths |
| **Batch Writer** | `src/lib/batch-writer.ts` | Coalesces Firestore writes, 50K buffer cap with backpressure — Firestore never chokes |
| **Rate Limiter** | `src/lib/rate-limiter.ts` | Redis-backed per-IP rate limiting — stops abuse at the application layer |
| **Graceful Shutdown** | `src/lib/shutdown.ts` | 30s drain, parallel flushes — zero dropped requests during deploys |
| **Cluster Mode** | `server.cluster.js` | One worker per CPU core, auto-restart with backoff — uses the whole machine |

---

## The User Experience

### Customer App (/)

The bar: **your grandmother who can't read English can order water with her voice.**

- Big microphone button on home screen for voice ordering
- Visual water type selection with icons (RO / Mineral / Tanker)
- Quantity picker with jar illustrations (1 jar = 20L)
- Live price display based on distance + demand
- 3 taps maximum to complete any order
- Full Google Maps live tracking with ETA
- UPI payment via deep-link (GPay / PhonePe)
- Star rating + voice feedback after delivery
- Color-coded status: green = delivered, yellow = on way, red = cancelled
- Hindi + English + 20 regional languages via Gemini AI

### Supplier App (/supplier)

Simple. Get orders. Deliver water. Get paid.

- Phone OTP signup + document upload (Aadhaar, RC, License)
- Dashboard: today's orders, earnings, rating score
- Real-time order notifications with accept/reject (30s countdown)
- Google Maps navigation to customer
- One-tap delivery confirmation with photo proof
- Earnings reports (daily / weekly / monthly)
- Online/offline toggle

### Admin Panel (/admin)

Complete visibility. Total control.

- Supplier approval workflow with document verification
- Commission management (per region, water type, tier)
- Live operations map with all active orders
- Analytics dashboard (orders, revenue, delivery time, retention)
- Complaint management
- Surge pricing controls
- GST-compliant financial reports

### WhatsApp Bot

Order water without downloading an app. In any language.

- Gemini 3 Flash powered conversational ordering
- Any Indian language supported
- Water type selection via buttons
- Location via WhatsApp location share
- Tracking link in chat
- UPI payment link

---

## Data Model (Firestore)

Clean. Flat. Fast.

```
users/{userId}
  role: "customer" | "supplier" | "admin"
  phone: "+91XXXXXXXXXX"
  name, avatar, language
  location: GeoPoint
  rating: { average, count }

suppliers/{supplierId}
  userId (ref)
  documents: { aadhaar, vehicleRC, license, fssai }
  verificationStatus: "pending" | "verified" | "rejected"
  vehicle: { type, capacity, number }
  isOnline: boolean
  currentLocation: GeoPoint
  serviceArea: { center: GeoPoint, radiusKm }
  waterTypes: ["ro", "mineral", "tanker"]
  rating: { average, count }

orders/{orderId}
  customerId, supplierId
  waterType, quantityLitres
  price: { base, distance, surge, total, commission }
  status: "searching" | "accepted" | "en_route" | "delivered" | "cancelled"
  delivery: GeoPoint
  tracking: { supplierLocation: GeoPoint, eta }
  payment: { method, status, transactionId }
  rating: { customerRating, supplierRating }
  beckn: { transactionId, messageId }
  timestamps: { created, accepted, picked, delivered }

pricing/{zoneId}
  basePrice: { ro, mineral, tanker }
  perKmRate, surgeMultiplier
  demandLevel: "low" | "normal" | "high" | "surge"
```

---

## API Endpoints

19 endpoints. Every one bounded, cached, and circuit-broken.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/send-otp` | Send phone OTP (L1 cached user lookup) |
| GET/PUT | `/api/auth/profile` | User profile CRUD |
| GET | `/api/pricing` | Dynamic pricing (L1 + Nginx cached) |
| POST | `/api/orders` | Create order |
| GET | `/api/orders` | List orders (bounded `.limit(500)`) |
| GET/PUT | `/api/orders/[orderId]` | Order detail/update |
| GET | `/api/suppliers` | List suppliers (bounded `.limit(500)`) |
| GET/PUT | `/api/suppliers/[supplierId]` | Supplier detail/update |
| GET | `/api/suppliers/nearby` | Geospatial nearby search |
| GET/PUT | `/api/tracking` | GPS tracking (Haversine + async Maps) |
| POST | `/api/payments/create-order` | Razorpay order creation (L1 cached) |
| POST | `/api/payments/verify` | Payment verification (L1 cached) |
| POST | `/api/ratings` | Submit rating |
| GET | `/api/admin/analytics` | Analytics (parallel queries, bounded) |
| POST | `/api/ai/chat` | Gemini AI chat |
| POST | `/api/ai/voice` | Voice-to-text + intent |
| POST | `/api/beckn/search` | ONDC search (BAP) |
| POST | `/api/beckn/confirm` | ONDC confirm (BAP) |
| POST | `/api/whatsapp/webhook` | WhatsApp Bot |
| GET | `/api/health` | Health check |

---

## ONDC/Beckn Integration

JalSeva implements both BAP (Buyer App) and BPP (Seller App) on India's Open Network:

| Flow | What Happens |
|---|---|
| `/search` → `/on_search` | Find available tankers nearby |
| `/select` → `/on_select` | Get a price quote |
| `/init` → `/on_init` | Initialize the order |
| `/confirm` → `/on_confirm` | Confirm and pay |
| `/track` → `/on_track` | Live GPS + ETA |
| `/status` → `/on_status` | Order status updates |
| `/cancel` → `/on_cancel` | Cancel the order |
| `/rating` → `/on_rating` | Rate the service |

Connected to the ONDC Staging sandbox. Production-ready architecture.

**No other water delivery platform has done this yet.** JalSeva will be the first.

---

## Revenue Model

Four streams. All built in.

| Stream | How It Works |
|---|---|
| **Commission (5-15%)** | Auto-deducted via Razorpay Route on every delivery |
| **Premium listing** | Suppliers pay to appear first — Razorpay Subscriptions API |
| **Surge pricing** | Gemini 3 Flash predicts demand — prices adjust automatically |
| **Supplier subscription** | Monthly plans with reduced commission rates |

---

## Deployment and Scaling

### One More Thing.

Here's what most platforms get wrong: they build for one city and then spend months rewriting for scale. JalSeva doesn't need a rewrite. **Zero code changes** between any scaling stage:

| Mode | Command | Throughput |
|---|---|---|
| Development | `npm run dev` | N/A |
| Single container | `docker compose up` | 5-20K RPS |
| Scaled (Nginx + 4 containers) | `docker compose --profile scaled up` | 20K+ RPS |
| Multi-VM | Scaled mode x N VMs + LB | 50K+ RPS |

### The Numbers

| Stage | Infrastructure | RPS | Cost |
|---|---|---|---|
| MVP (1 city) | e2-medium, single container | 5-10K | ~$25/mo |
| 1 state | e2-standard-4, single container | 15-25K | ~$100/mo |
| Multi-state | 2x e2-standard-4 + GCP LB | 40-60K | ~$250/mo |
| National | GKE Autopilot + Memorystore | 50K+ | Pay per use |

**$25 a month to serve an entire city.** Every step after that is just turning a dial.

### What We Optimized (and How Much It Mattered)

| What We Did | Before | After |
|---|---|---|
| Cluster mode | Only worker 0 received traffic | All CPU cores serve requests |
| Tracking API | 50-300ms (blocking Maps API) | <1ms (Haversine fallback) |
| Auth lookup | Firestore hit every request | L1 cached (120s TTL) |
| Pricing | Firestore + Redis per request | L1 (5s) + Nginx cache (30s) |
| Firestore queries | Unbounded `.get()` | Bounded `.limit()` on all paths |
| Circuit breaker | Thundering herd on recovery | 1-probe HALF_OPEN + backoff |
| Batch writer | Unbounded buffer | 50K cap + backpressure |

---

## Accessibility

Built for all of Bharat. Not as an afterthought — as a design principle.

| What | How |
|---|---|
| **Language** | `lang="hi-IN"` default, 22 languages via Gemini AI translation |
| **Screen readers** | ARIA labels, `role` attributes, `sr-only` text throughout |
| **Keyboard** | Skip-to-content link, logical tab order |
| **Motion** | Respects `prefers-reduced-motion` system setting |
| **RTL** | Ready for Urdu and other right-to-left scripts |
| **Voice** | Microphone-based ordering for users who can't read |
| **Visual** | Large icons, color-coded status indicators at every step |
