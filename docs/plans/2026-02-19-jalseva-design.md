# JalSeva — Design Document

**Version:** 2.0 | **Date:** February 19, 2026 | **Status:** Implemented

---

## 1. Overview

JalSeva (जलसेवा — "Water Service") is an open-source digital marketplace connecting water tanker suppliers with customers across India. Like Uber for ride-hailing, JalSeva provides real-time booking, live tracking, dynamic pricing, and UPI payments for water delivery.

**Target Users:** Indian households relying on water tankers for drinking water, especially in areas with poor groundwater quality.

**Design Principles:**
- Voice-first, icon-heavy UI for users with limited literacy
- 3-tap maximum to complete any booking
- Works on low-end Android devices and 2G/3G networks (PWA)
- Hindi-first with 22 Indian language support via Gemini AI

---

## 2. Architecture

### 2.1 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, PWA (Serwist) |
| Animation | Motion 12 (formerly Framer Motion) |
| Backend | Next.js 16 API Routes (standalone mode) |
| Database | Cloud Firestore (real-time) |
| Auth | Firebase Auth (Phone OTP) |
| Maps | Google Maps JavaScript API, Routes API, Geocoding |
| Payments | Razorpay (UPI, Cards, Wallets) — simulated in dev |
| AI | Gemini 2.0 Flash — voice, translation, demand prediction |
| WhatsApp | Meta Cloud API (WhatsApp Business) |
| State | Zustand 5 |
| Cache | Upstash Redis (serverless) + L1 in-process cache |
| ONDC | Beckn Protocol (staging sandbox) |
| Runtime | Node.js 22, TypeScript 5.9 |
| Linting | Biome |
| Testing | Vitest, Testing Library |
| Deploy | Docker, Nginx, Cluster mode |

### 2.2 System Diagram

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
    (DB)        Auth       (Cache)  2.0       (Pay)
                                      │
                          ┌───────────▼───────────┐
                          │  ONDC/Beckn Protocol  │
                          │  Layer (BAP + BPP)    │
                          └───────────────────────┘
```

### 2.3 Resilience Architecture

```
Request → Nginx rate limit → Circuit breaker → L1 cache → Redis → Firestore
                                    │               │         │
                                    │ (open)        │ (hit)   │ (miss)
                                    ▼               ▼         ▼
                              Return 503     Return cached   Query + cache
```

| Layer | Implementation | Purpose |
|---|---|---|
| **Circuit Breaker** | `src/lib/circuit-breaker.ts` | Exponential backoff, 1-probe HALF_OPEN recovery |
| **L1 Cache** | `src/lib/cache.ts` | In-process cache (1-120s TTL) to bypass Redis/Firestore |
| **Batch Writer** | `src/lib/batch-writer.ts` | Coalesce Firestore writes, 50K buffer cap, backpressure |
| **Rate Limiter** | `src/lib/rate-limiter.ts` | Redis-backed per-IP rate limiting |
| **Graceful Shutdown** | `src/lib/shutdown.ts` | 30s drain, parallel flushes, zero-downtime deploys |
| **Cluster Mode** | `server.cluster.js` | One worker per CPU core, auto-restart with backoff |

---

## 3. User Interfaces

### 3.1 Customer App (/)

Voice-first, icon-heavy design for near-illiterate users:

- Big microphone button on home screen for voice ordering
- Visual water type selection with icons (RO/Mineral/Tanker)
- Quantity picker with jar illustrations (1 jar = 20L)
- Live price display based on distance + demand
- One-tap booking (max 3 taps to complete order)
- Full Google Maps live tracking with ETA
- UPI payment via deep-link (GPay/PhonePe)
- Star rating + voice feedback after delivery
- Color-coded status: green=delivered, yellow=on way, red=cancelled
- Hindi + English + regional languages via Gemini AI translation

### 3.2 Supplier App (/supplier)

- Phone OTP signup + document upload (Aadhaar, RC, License)
- Dashboard: today's orders, earnings, rating score
- Real-time order notifications with accept/reject (30s countdown)
- Google Maps navigation to customer
- One-tap delivery confirmation with photo proof
- Earnings reports (daily/weekly/monthly)
- Online/offline toggle

### 3.3 Admin Panel (/admin)

- Supplier approval workflow with document verification
- Commission management (per region, water type, tier)
- Live operations map with all active orders
- Analytics dashboard (orders, revenue, delivery time, retention)
- Complaint management
- Surge pricing controls
- GST-compliant financial reports

### 3.4 WhatsApp Bot

- Gemini 2.0 Flash powered conversational ordering
- Any Indian language supported
- Water type selection via buttons
- Location via WhatsApp location share
- Tracking link in chat
- UPI payment link

---

## 4. Data Model (Firestore)

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

## 5. API Endpoints

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

## 6. ONDC/Beckn Integration

Implements both BAP (Buyer App) and BPP (Seller App):

- `/search` → `/on_search` (find available tankers)
- `/select` → `/on_select` (get quote)
- `/init` → `/on_init` (initialize order)
- `/confirm` → `/on_confirm` (confirm order)
- `/track` → `/on_track` (GPS + ETA)
- `/status` → `/on_status` (order status)
- `/cancel` → `/on_cancel` (cancel order)
- `/rating` → `/on_rating` (rate service)

Connected to ONDC Staging sandbox for demo. Production-ready architecture.

---

## 7. Revenue Model

| Stream | Implementation |
|---|---|
| Commission (5-15%) | Auto-deducted via Razorpay Route |
| Premium listing | Razorpay Subscriptions API |
| Surge pricing | Gemini 2.0 Flash demand prediction |
| Supplier subscription | Monthly plans, reduced commission |

---

## 8. Deployment & Scaling

### Deployment Modes

| Mode | Command | Throughput |
|---|---|---|
| Development | `npm run dev` | N/A |
| Single container | `docker compose up` | 5-20K RPS |
| Scaled (Nginx + 4 containers) | `docker compose --profile scaled up` | 20K+ RPS |
| Multi-VM | Scaled mode x N VMs + LB | 50K+ RPS |

### Scaling Path

| Stage | Infrastructure | RPS | Cost |
|---|---|---|---|
| MVP (1 city) | e2-medium, single container | 5-10K | ~$25/mo |
| 1 state | e2-standard-4, single container | 15-25K | ~$100/mo |
| Multi-state | 2x e2-standard-4 + GCP LB | 40-60K | ~$250/mo |
| National | GKE Autopilot + Memorystore | 50K+ | Pay per use |

**Key insight:** Zero code changes between any scaling stage. Every step is an infrastructure dial.

### Performance Optimizations

| Optimization | Before | After |
|---|---|---|
| Cluster mode | Only worker 0 received traffic | All CPU cores serve requests |
| Tracking API | 50-300ms (blocking Maps API) | <1ms (Haversine fallback) |
| Auth lookup | Firestore hit every request | L1 cached (120s TTL) |
| Pricing | Firestore + Redis per request | L1 (5s) + Nginx cache (30s) |
| Firestore queries | Unbounded `.get()` | Bounded `.limit()` on all paths |
| Circuit breaker | Thundering herd on recovery | 1-probe HALF_OPEN + backoff |
| Batch writer | Unbounded buffer | 50K cap + backpressure |

---

## 9. Accessibility

| Feature | Implementation |
|---|---|
| Language | `lang="hi-IN"` default, 22 languages via Gemini AI |
| Screen readers | ARIA labels, `role` attributes, `sr-only` text |
| Keyboard | Skip-to-content link, logical tab order |
| Motion | Respects `prefers-reduced-motion` |
| RTL | Ready for Urdu and other RTL scripts |
| Voice | Microphone-based ordering for low-literacy users |
| Visual | Large icons, color-coded status indicators |
