<p align="center">
  <img src="jalseva/public/icons/icon-192.png" alt="JalSeva Logo" width="120" height="120" />
</p>

<h1 align="center">JalSeva (जलसेवा)</h1>

<p align="center">
  <sub>Capstone Project · <a href="https://jalseva.dmj.one">jalseva.dmj.one</a></sub>
</p>

<p align="center">
  <sub><b>Jatin Sharma</b> (GF202219717) · B.Tech CSE (Data Science), Semester 8</sub><br/>
  <sub>Mentor: <b>Dr. Abhishek Tomar</b> · Yogananda School of AI, Computers and Data Sciences</sub><br/>
  <sub>Shoolini University of Biotechnology and Management Sciences, Solan, H.P., India</sub>
</p>

<p align="center">
  <a href="https://jalseva.dmj.one">🌐 Live App</a>
  &nbsp;·&nbsp;
  <a href="https://jalseva.dmj.one/pitch">🎤 Pitch Deck</a>
  &nbsp;·&nbsp;
  <a href="https://jalseva.dmj.one/report">📄 Project Report</a>
</p>

---

## The Problem

163 million Indians lack reliable access to clean piped water and depend on private water tankers for daily survival. The system is broken: no transparency, no tracking, no accountability. You phone a number, hope someone picks up, and wait. Sometimes for hours. Sometimes they never come.

**We thought we could do better.**

---

## The Solution

**JalSeva** is a complete water-tanker delivery platform with three faces:

1. **A booking app** — customers order water in 3 taps
2. **A supplier dashboard** — real-time order queue, live navigation, earnings analytics
3. **An operations hub** — admins verify suppliers, monitor every delivery live

This is **one platform, one codebase, one container**. Built for Bharat, deployed to a single Cloud Run service that scales to zero when idle.

---

## What's Live

The deployed system is reachable from any device at **<https://jalseva.dmj.one>**.

**Try the demo flow on two devices** using these zero-billing Firebase test phone numbers (no SMS sent):

| Phone | OTP | Suggested Role |
|---|---|---|
| `+91 99999 00001` | `123456` | Customer |
| `+91 99999 00002` | `654321` | Supplier |
| `+91 99999 00003` | `111111` | Customer (2nd) |
| `+91 99999 00004` | `222222` | Supplier (2nd) |
| `+91 99999 00005` | `333333` | Either |

1. **Device A (customer)** — open the site, tap "Customer", enter `+91 99999 00001`, OTP `123456`. Place an order.
2. **Device B (supplier)** — open the site, tap "Supplier", enter `+91 99999 00002`, OTP `654321`. Toggle online — the customer's order appears in the dashboard.
3. **Supplier accepts** → status flips to `accepted` and the customer's booking page transitions to "Track Delivery".
4. **Supplier hits "Start Navigation"** → `watchPosition` begins broadcasting GPS to `/api/tracking` every 5 s. The customer sees the marker advance on their map in real time via Firestore `onSnapshot`.
5. **Supplier marks delivered** → both screens transition to the completion state.

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

---

## Features

| | What It Does |
|---|---|
| **Customer App** | Voice ordering, 3-tap booking, live GPS tracking, UPI payments |
| **Supplier Dashboard** | Real-time Firestore order queue, route navigation, earnings analytics |
| **Admin Panel** | Supplier verification, commission management, live ops map |
| **WhatsApp Bot** | Order water through a conversation — in any Indian language *(scaffolded)* |
| **ONDC / Beckn** | Open Network for Digital Commerce integration *(scaffolded)* |
| **Accessibility** | Hindi-first, ARIA labels, screen reader support, RTL-ready, reduced motion |

---

## Under the Hood

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 · React 19 · Tailwind CSS 4 · PWA (Serwist) |
| Animation | Motion (formerly Framer Motion) |
| AI | Google Gemini — voice, translation, demand prediction |
| Maps | Google Maps JavaScript API (referrer-restricted) |
| Auth | **Firebase Phone Auth** (real OTP + test numbers for demo) |
| Database | Cloud Firestore (real-time, `asia-south2`) |
| Server credentials | **IAM service account via ADC** — zero private keys in image |
| Payments | Razorpay (UPI, Cards, Wallets) — _simulated in dev_ |
| State | Zustand |
| Cache | Optional Upstash Redis (L2) + L1 in-process cache |
| Runtime | Node.js 22 · **Google Cloud Run** (`asia-east1`, scale-to-zero) |
| Build | pnpm 10 · Multi-stage Docker · Next standalone output |
| CDN | Cloudflare DNS + proxy at `jalseva.dmj.one` |

---

## Architecture

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Customer   │  │  Supplier   │  │   Admin     │
│  PWA (/)    │  │  (/supplier)│  │  (/admin)   │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────────────┴────────────────┘
                        │ HTTPS · jalseva.dmj.one
            ┌───────────▼────────────┐
            │  Cloudflare DNS proxy  │
            └───────────┬────────────┘
                        ▼
            ┌────────────────────────┐
            │ Next.js (standalone)   │
            │ Cloud Run · asia-east1 │
            │ min=0 · max=3 · 512Mi  │
            └───────────┬────────────┘
                        │ ADC (no JSON key in container)
                        │ SA: jalseva-runtime@dmjone.iam
            ┌───────────┼─────────────────────────────┐
            ▼           ▼                             ▼
       ┌─────────┐  ┌──────────────┐         ┌────────────────────┐
       │Firestore│  │  Google Maps │         │ Firebase Auth      │
       │ Native  │  │  Platform    │         │ (Identity Toolkit) │
       │asia-s2  │  │  Routes/Geo  │         │ Phone OTP          │
       └─────────┘  └──────────────┘         └────────────────────┘
```

### Why these choices

- **Cloud Run scale-to-zero** — `min-instances=0` means ₹0 idle cost. First request after idle pays a ~5 s cold start.
- **IAM service-account via ADC** — the Firebase Admin SDK auto-detects the Cloud Run runtime SA via the GCE metadata server. **No private keys exist in the container.** This eliminates the most common credential-leakage vector in serverless Node deployments.
- **Public client keys (Maps, Firebase web)** — these are inherently in the JS bundle and visible to any user. Mitigation is by restriction, not concealment: HTTP-referrer allowlist + Firebase authorized-domains list reject use from anywhere except `jalseva.dmj.one` + `localhost`.

### Performance optimizations

| Built | Why |
|---|---|
| **L1 in-process cache** | Bypasses Firestore/Redis on hot reads — sub-microsecond. |
| **Write coalescer** | Collapses 5-20 GPS updates into 1 Firestore write per 500 ms window. |
| **Haversine ETA** | Sub-millisecond city-driving ETA without blocking on Maps Routes. |
| **Geohash spatial index** | `O(k)` nearby-supplier lookup instead of `O(n)` scan. |
| **Token-bucket rate limiter** | In-memory edge limit per IP, 100 burst / 50 sustained. |
| **Bounded Firestore queries** | Every scan has `.limit()` — no runaway reads. |
| **Cluster mode (single)** | `CLUSTER_WORKERS=1` on Cloud Run — instance autoscaling does the rest. |

---

## Getting Started

### Run it locally

```bash
git clone https://github.com/divyamohan1993/jalseva.git
cd jalseva/jalseva
cp .env.example .env    # Fill in your API keys
pnpm install
pnpm run dev
```

Open <http://localhost:3000>. You're running JalSeva.

### Prerequisites

- **Node.js** ≥ 20 (22 recommended)
- **pnpm** ≥ 10 (`corepack enable && corepack prepare pnpm@10.30.1 --activate`)
- A Firebase project with Firestore + Authentication enabled
- Google Maps & Gemini API keys

### Deploy your own copy to Cloud Run

```bash
# Build + push + deploy in one shot via Cloud Build
gcloud builds submit ./jalseva \
  --config=./jalseva/cloudbuild.yaml \
  --region=asia-east1 \
  --substitutions=\
_FIREBASE_API_KEY=<your-api-key>,\
_FIREBASE_AUTH_DOMAIN=<your-project>.firebaseapp.com,\
_FIREBASE_PROJECT_ID=<your-project>,\
_FIREBASE_STORAGE_BUCKET=<your-project>.firebasestorage.app,\
_FIREBASE_MESSAGING_SENDER_ID=<sender-id>,\
_FIREBASE_APP_ID=<app-id>,\
_FIREBASE_MEASUREMENT_ID=<measurement-id>,\
_MAPS_API_KEY=<maps-key>,\
_GEMINI_API_KEY=<gemini-key>
```

The Cloud Build config:
1. Builds the multi-stage Dockerfile with `NEXT_PUBLIC_*` baked at build time.
2. Pushes to `asia-east1-docker.pkg.dev/<project>/cloud-run-source-deploy/jalseva`.
3. Deploys to Cloud Run `asia-east1` with `min=0`, `max=3`, `512 MiB`, runtime SA `jalseva-runtime@<project>.iam.gserviceaccount.com`.

### Map a custom domain

In Cloud Run, add a domain mapping for `jalseva.<your-domain>`. Cloudflare DNS: add a `CNAME` record pointing to the value Cloud Run gives you, proxied.

---

## Project Structure

```
jalseva/
├── jalseva/                          # Next.js application root
│   ├── src/
│   │   ├── app/                      # App Router pages & API routes
│   │   │   ├── login/                # Real Firebase Phone Auth + role toggle
│   │   │   ├── booking/              # Customer 3-tap booking
│   │   │   ├── tracking/[orderId]/   # Customer live GPS map
│   │   │   ├── supplier/             # Supplier dashboard + delivery flow
│   │   │   ├── admin/                # Admin analytics + supplier mgmt
│   │   │   ├── api/                  # 19 backend routes incl. /api/tracking
│   │   │   ├── pitch/route.ts        # 10-slide pitch (single HTML)
│   │   │   └── report/route.ts       # A4 capstone report
│   │   ├── actions/auth.ts           # ID-token-verifying server action
│   │   ├── components/               # UI + CapstoneCredit
│   │   ├── hooks/                    # useAuth, useSupplier, useTracking
│   │   ├── lib/
│   │   │   ├── firebase.ts           # Client SDK
│   │   │   ├── firebase-admin.ts     # ADC fallback for Cloud Run
│   │   │   ├── gemini.ts             # Gemini AI
│   │   │   ├── maps.ts               # Haversine + async Routes refinement
│   │   │   ├── redis.ts              # Optional Upstash with no-op fallback
│   │   │   ├── rate-limiter.ts       # In-memory token bucket
│   │   │   └── firestore-shard.ts    # 500 ms write coalescer
│   │   └── types/                    # TypeScript types
│   ├── public/                       # Static assets, PWA icons, Shoolini logo
│   ├── nginx/                        # Nginx config (legacy, unused on Cloud Run)
│   ├── server.cluster.js             # Multi-core cluster server (legacy, unused)
│   ├── Dockerfile                    # Multi-stage, pnpm, standalone, $PORT
│   ├── cloudbuild.yaml               # Cloud Build → Cloud Run
│   ├── firestore.rules               # Firestore security rules
│   └── .env.example
├── docs/                             # Design documents + insights
│   ├── CODE_INSIGHTS.md
│   ├── pitch-deck.html               # (legacy snapshot, see /pitch route)
│   └── plans/
├── CAPSTONE PROJECT REPORT.docx      # University template (matched by /report)
├── CHANGELOG.md
├── README.md                         # ← you are here
├── CONTRIBUTING.md
├── SECURITY.md
├── CODE_OF_CONDUCT.md
└── LICENSE                           # ISC License
```

---

## Environment Variables

Copy `jalseva/.env.example` to `jalseva/.env` and fill in:

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_*` (7 vars) | Yes | Firebase client SDK — baked into client bundle at build time |
| `FIREBASE_ADMIN_PROJECT_ID` | Yes | Project ID for the Admin SDK |
| `FIREBASE_ADMIN_CLIENT_EMAIL` / `FIREBASE_ADMIN_PRIVATE_KEY` | **No on Cloud Run** | Admin SDK auto-detects ADC via the runtime IAM SA — leave these unset in production |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Yes | Maps client key — referrer-restricted to your domain |
| `GOOGLE_GEMINI_API_KEY` | Yes | Gemini AI for voice + translation |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | No | Optional L2 cache; absent = graceful no-op fallback |
| `RAZORPAY_*` | No | Simulated by default for demo |
| `CLUSTER_WORKERS` | No | `1` on Cloud Run (autoscale via instances); `0` for VM (all cores) |

---

## API Reference

All routes under `/api/`. Authentication via the `jalseva_auth` httpOnly cookie set by `signInWithIdToken` server action after Firebase ID-token verification.

| Method | Endpoint | Description |
|---|---|---|
| GET/PUT | `/api/auth/profile` | Get/update user profile |
| GET | `/api/pricing` | Calculate delivery price (cached 30 s) |
| POST/GET | `/api/orders` | Create / list orders |
| GET/PUT | `/api/orders/[orderId]` | Get / state-machine-update specific order |
| GET | `/api/suppliers` | List all suppliers |
| GET/PUT | `/api/suppliers/[supplierId]` | Get/update supplier |
| GET | `/api/suppliers/nearby` | Find nearby online suppliers (geohash O(k)) |
| GET/POST | `/api/tracking` | Live GPS broadcast + fetch (coalesced) |
| POST | `/api/payments/create-order` | Create simulated Razorpay payment |
| POST | `/api/payments/verify` | Verify HMAC-SHA256 payment signature |
| POST | `/api/ratings` | Submit delivery rating |
| GET | `/api/admin/analytics` | Aggregate analytics (5-min L2, 2-min L1 cache) |
| POST | `/api/ai/chat` / `/api/ai/voice` | Gemini chat + voice intent extraction |
| POST | `/api/beckn/search` / `/api/beckn/confirm` | ONDC handshake (scaffolded) |
| POST | `/api/whatsapp/webhook` | WhatsApp Bot webhook (scaffolded) |
| GET | `/api/health` | Health check (used by Cloud Run startup probe) |
| GET | `/pitch` | 10-slide capstone pitch (single HTML, zero deps) |
| GET | `/report` | A4 capstone project report |

---

## Security Posture

JalSeva treats the deployed image and its environment as a hostile surface.

- **No private keys in the container.** Firebase Admin SDK uses Application Default Credentials via the Cloud Run service account at `jalseva-runtime@dmjone.iam.gserviceaccount.com`.
- **Server-side cookie is set only after `adminAuth.verifyIdToken()` succeeds** — clients cannot forge a session by hand-rolling cookies.
- **Public keys are restricted by reach, not by secrecy.** Maps key: HTTP-referrer allowlist. Firebase Auth: authorized-domains list.
- **Firestore security rules** enforce per-user access at the document level — see `jalseva/firestore.rules`.
- **OWASP-recommended headers** set in middleware on every response: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`.
- **Token-bucket rate limit** at the edge — 100 burst / 50 sustained per IP, 60 K / 50 K global per instance.

Found a vulnerability? **Do not open a public issue.** Follow our [Security Policy](SECURITY.md) — email **contact@dmj.one**.

---

## Scaling

Patterns that don't need ripping out: stateless services, externalized state, event-driven, edge-first, graceful degradation.

| Scale | Code Change? | Infra |
|---|---|---|
| **1 city** (MVP) | None | 1 Cloud Run service · scale-to-zero · ~₹0/idle |
| **1 state** | None | Cloud Run `max-instances↑`, Firestore as-is |
| **Multi-state** | None | Cloud Run regional replicas (asia-south1 + asia-east1) |
| **National** | None | Add Memorystore Redis, Cloud Armor WAF |

---

## Built for Everyone

JalSeva is built for all of Bharat — including users with disabilities, limited literacy, and diverse language needs:

- **22 languages** — Hindi default, Gemini-powered real-time translation
- **Voice-first** — microphone-based ordering for users who can't read
- **Screen readers** — ARIA labels, `role` attributes, `sr-only` text throughout
- **Keyboard navigation** — skip-to-content, logical tab order
- **Reduced motion** — respects `prefers-reduced-motion`
- **RTL support** — ready for Urdu and other right-to-left scripts

---

## Testing

```bash
cd jalseva/jalseva
pnpm test             # Vitest unit + integration
pnpm run lint         # Biome
pnpm run build        # Production build
```

---

## Capstone Authorship

| Role | Name | Contribution |
|---|---|---|
| **Author** | **Jatin Sharma** (GF202219717) | Capstone author. Architecture, full-stack implementation, deployment, demo operations. B.Tech CSE (Data Science), Semester 8. |
| **Mentor** | **Dr. Abhishek Tomar** | Faculty advisor. Scope and engineering-rigour review. |
| **AI Build Partner** | **Claude (Anthropic)** | Code synthesis under the author's direction; security-review prompts. |
| **Hosting / Domain** | **dmj.one** (Divya Mohan) | GCP project hosting (`dmjone`), domain (`jalseva.dmj.one`), Cloudflare. |

---

## License

[ISC License](LICENSE)

---

## Acknowledgements

- [Next.js](https://nextjs.org/) · [React](https://react.dev/) · [Tailwind CSS](https://tailwindcss.com/) · [Motion](https://motion.dev/)
- [Firebase](https://firebase.google.com/) — Auth + real-time Firestore
- [Google Maps Platform](https://developers.google.com/maps) — Maps + Geocoding + Routes
- [Google Gemini AI](https://ai.google.dev/) — voice + translation
- [Razorpay](https://razorpay.com/) — payments (simulated)
- [ONDC](https://ondc.org/) — Open Network for Digital Commerce
- [Upstash](https://upstash.com/) — optional serverless Redis
- [Biome](https://biomejs.dev/) — linter & formatter · [Vitest](https://vitest.dev/) — testing

---

<p align="center">
  Made with ♥ for Bharat · Capstone Project by Jatin Sharma · Mentor Dr. Abhishek Tomar
</p>
