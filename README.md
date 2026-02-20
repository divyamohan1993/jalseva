# JalSeva (जलसेवा) — Uber for Water Tankers

**JalSeva** is an open-source digital marketplace that connects water-tanker suppliers with customers across India. Think _Uber, but for water delivery_ — real-time booking, live GPS tracking, dynamic pricing, and UPI payments.

> Built for Bharat: voice-first, icon-heavy UI designed for users with limited literacy; supports 22 Indian languages.

---

## Features

| Area | Highlights |
|---|---|
| **Customer App** | Voice ordering via Gemini AI, 3-tap booking, live map tracking, UPI payments |
| **Supplier Dashboard** | Real-time order notifications, route navigation, earnings analytics |
| **Admin Panel** | Supplier verification, commission management, live ops map |
| **WhatsApp Bot** | Conversational ordering in any Indian language |
| **ONDC / Beckn** | Open Network for Digital Commerce integration (staging sandbox) |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 · React 19 · Tailwind CSS 4 · PWA (@ducanh2912/next-pwa) |
| Animation | Motion (formerly Framer Motion) |
| AI | Google Gemini 2.0 Flash (@google/genai SDK) — voice, translation, demand prediction |
| Maps | Google Maps JavaScript API |
| Auth | Firebase Auth (Phone OTP) |
| Database | Cloud Firestore (real-time) |
| Payments | Razorpay (UPI, Cards, Wallets) — _simulated in dev_ |
| State | Zustand |
| Cache | Upstash Redis (serverless) |
| Runtime | Node.js 22 · TypeScript 5.9 |
| Deploy | Docker · Google Cloud Run |

## Quick Start

### Prerequisites

- **Node.js** ≥ 20 (22 recommended)
- **npm** ≥ 9
- A Firebase project with Firestore & Auth enabled
- Google Maps & Gemini API keys

### Installation

```bash
# Clone the repository
git clone https://github.com/divyamohan1993/jalseva.git
cd jalseva

# Install dependencies
cd jalseva
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Start the dev server
npm run dev
```

The app will be running at **http://localhost:3000**.

### Docker

```bash
cd jalseva
docker compose up --build
```

## Project Structure

```
.
├── jalseva/                 # Next.js application
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   ├── components/      # Reusable UI & shared components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Firebase, Gemini, Maps clients
│   │   └── types/           # TypeScript type definitions
│   ├── public/              # Static assets & PWA icons
│   ├── Dockerfile
│   └── docker-compose.yml
└── docs/                    # Pitch deck & design documents
```

## Environment Variables

Copy `jalseva/.env.example` to `jalseva/.env` and fill in your keys:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_FIREBASE_*` | Firebase project configuration |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key |
| `GOOGLE_GEMINI_API_KEY` | Gemini AI API key |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay keys (simulated in dev) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis credentials |

See [jalseva/.env.example](jalseva/.env.example) for the full list.

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to get started.

## Security

If you discover a security vulnerability, please follow our [Security Policy](SECURITY.md). **Do not open a public issue.**

## License

This project is licensed under the [ISC License](LICENSE).

## Acknowledgements

- [Next.js 15](https://nextjs.org/) — React framework (App Router)
- [React 19](https://react.dev/) — UI library
- [Tailwind CSS 4](https://tailwindcss.com/) — Utility-first CSS (CSS-first configuration)
- [Motion](https://motion.dev/) — Animation library (formerly Framer Motion)
- [Firebase](https://firebase.google.com/) — Auth & real-time database
- [Google Maps Platform](https://developers.google.com/maps) — Maps & geocoding
- [Google Gemini AI](https://ai.google.dev/) — Voice, translation & demand prediction (@google/genai SDK)
- [ONDC](https://ondc.org/) — Open Network for Digital Commerce

---

<p align="center">
  Made with ❤️ for Bharat 🇮🇳
</p>
