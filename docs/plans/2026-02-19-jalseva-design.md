# JalSeva - Uber for Water Tankers in India

## Design Document | February 19, 2026

---

## 1. Overview

JalSeva is a digital marketplace connecting water tanker suppliers with customers across India. Like Uber for ride-hailing, JalSeva provides real-time booking, live tracking, dynamic pricing, and UPI payments for water delivery.

**Target Users:** Indian households relying on bottled water tankers for drinking water, especially in areas with poor groundwater quality.

**App Name:** JalSeva (जलसेवा) - meaning "Water Service"

---

## 2. Architecture

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, Tailwind CSS 4, PWA (@ducanh2912/next-pwa) |
| Animation | Motion 12 (formerly Framer Motion) |
| Backend | Next.js 15 API Routes deployed on Cloud Run |
| Database | Cloud Firestore (real-time) |
| Auth | Firebase Auth (Phone OTP) |
| Maps | Google Maps JavaScript API, Routes API, Geocoding |
| Payments | Razorpay (UPI, Cards, Wallets) |
| AI | Gemini 2.0 Flash (@google/genai SDK) — voice, translation, demand prediction |
| WhatsApp | Meta Cloud API (WhatsApp Business) |
| Real-time | Firestore real-time listeners + Cloud Pub/Sub |
| Storage | Firebase Storage (documents, photos) |
| State | Zustand 5 |
| Cache | Upstash Redis (serverless) |
| ONDC | Beckn Protocol (staging sandbox) |
| Runtime | Node.js 22, TypeScript 5.9 |
| Monitoring | Cloud Operations Suite |
| Deploy | Docker, Cloud Run (GCP) / npm run dev (local) |

### System Diagram

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Customer   │  │  Supplier   │  │   Admin     │  │  WhatsApp   │
│  PWA (/)    │  │  PWA (/sup) │  │  (/admin)   │  │  Bot        │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │                │
       └────────────────┴────────────────┴────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │  Next.js API Routes   │
                    │  (Cloud Run)          │
                    └───────────┬───────────┘
                                │
    ┌──────┬──────┬─────────────┼─────────┬──────┬──────┐
    │      │      │             │         │      │      │
Firebase  Firestore  Cloud    Pub/Sub  Google  Gemini    Razorpay
Auth              Storage            Maps    2.0 Flash
                                │
                    ┌───────────▼───────────┐
                    │  ONDC/Beckn Protocol  │
                    │  Layer (BAP + BPP)    │
                    └───────────────────────┘
```

---

## 3. User Interfaces

### 3.1 Customer App (/)

**Voice-First, Icon-Heavy Design for near-illiterate users:**

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

## 5. ONDC/Beckn Integration

Implements both BAP (Buyer App) and BPP (Seller App):

- /search → /on_search (find available tankers)
- /select → /on_select (get quote)
- /init → /on_init (initialize order)
- /confirm → /on_confirm (confirm order)
- /track → /on_track (GPS + ETA)
- /status → /on_status (order status)
- /cancel → /on_cancel (cancel order)
- /rating → /on_rating (rate service)

Connected to ONDC Staging sandbox for demo. Production-ready architecture.

---

## 6. Revenue Model

| Stream | Implementation |
|---|---|
| Commission (5-15%) | Auto-deducted via Razorpay Route |
| Premium listing | Razorpay Subscriptions API |
| Surge pricing | Gemini 2.0 Flash demand prediction |
| Supplier subscription | Monthly plans, reduced commission |

---

## 7. Deployment

- **GCP:** Docker → Cloud Run, Firestore, Cloud Storage
- **Local:** npm run dev (full functionality with Firebase emulators)
- **Environment:** All API keys in .env file
