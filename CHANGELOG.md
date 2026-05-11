# Changelog

All notable changes to JalSeva are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added — 2026-05-12 (afternoon)
- **Project-wide Phone-Auth SMS cap** to prevent billing abuse:
  - New API endpoint `/api/auth/sms-quota` (GET = read, POST = atomic increment in a Firestore transaction) that tracks SMS dispatches in `meta/phoneOtp/daily/{YYYY-MM-DD}.count`.
  - Login page now hits POST `/api/auth/sms-quota` before invoking `signInWithPhoneNumber` for any non-test number. If the day's count has reached `PHONE_OTP_DAILY_LIMIT` (default `2`), the SMS is refused with a friendly message pointing the user at the demo test numbers.
  - Test phone numbers (`+91 99999 00001`–`5`) bypass the counter because Firebase short-circuits them locally without dispatching SMS.
  - `PHONE_OTP_DAILY_LIMIT=2` is set on Cloud Run via `cloudbuild.yaml`.
- `meta/**` is explicitly denied in `firestore.rules` (server-only access via Admin SDK).

### Changed — 2026-05-12 (afternoon)
- `.github/workflows/ci.yml` rewritten to use **pnpm** with `pnpm/action-setup@v4` and `cache: pnpm`. The previous `npm ci` workflow was broken because the project ships `pnpm-lock.yaml`, not `package-lock.json`.
- `.github/dependabot.yml` extended with grouped updates for Next/React, Firebase, lint/test tools, plus a Docker ecosystem block for the Dockerfile.
- `.env.example` rewritten with explicit comments distinguishing build-time `NEXT_PUBLIC_*` from runtime server vars, documenting that `FIREBASE_ADMIN_CLIENT_EMAIL` / `FIREBASE_ADMIN_PRIVATE_KEY` should be **empty on Cloud Run** (Admin SDK uses ADC), and introducing `PHONE_OTP_DAILY_LIMIT`.
- `CONTRIBUTING.md` and `.github/PULL_REQUEST_TEMPLATE.md` updated for pnpm + Cloud Run; the legacy `docker compose --profile scaled` flow is replaced with `gcloud builds submit ./jalseva --config=./jalseva/cloudbuild.yaml`.
- GitHub repo metadata: description, homepage URL (`https://jalseva.dmj.one`) and 19 topics added via `gh repo edit`.

### Added — 2026-05-12
- **Capstone metadata** throughout the application:
  - `RouteCapstoneCredit` component shown on most public routes, crediting Jatin Sharma (GF202219717), mentor Dr. Abhishek Tomar.
  - `/pitch` route serving a 10-slide Guy Kawasaki-format pitch (single inlined HTML, zero external dependencies, swipe/keyboard navigable).
  - `/report` route serving an A4-paged capstone project report formatted to match the Shoolini University template (Times New Roman 12pt, red-bordered chapter headers, full 13-chapter structure with figures and tables).
  - University logo asset embedded at `public/icons/shoolini-logo.png`.
- **Real Firebase Phone Authentication** wired into `/login` (previously demo OTP-on-screen). Uses invisible reCAPTCHA + `signInWithPhoneNumber`; supports 5 zero-billing test phone numbers configured in Firebase for demo without SMS spend.
- **Role toggle** on the login page: Customer / Supplier selectable before OTP send.
- **Customer ↔ Supplier multi-device live flow**:
  - `navigator.geolocation.watchPosition` GPS broadcast on the supplier-side delivery page → POST `/api/tracking` every 5 s.
  - Customer tracking page subscribes via Firestore `onSnapshot` for sub-second propagation.
  - Order state machine wired to PUT `/api/orders/[orderId]` for transitions on Start-Navigation / Arrived / Delivered.
- **`signInWithIdToken` server action**:
  - Verifies Firebase ID token via `adminAuth.verifyIdToken(token, true)`.
  - Upserts the user document with the chosen role.
  - Auto-provisions a verified `suppliers/{uid}` document on first supplier sign-in (MLP convenience; production would require KYC).
  - Sets the `jalseva_auth` httpOnly cookie carrying the verified UID.
- **Firestore security rules** (`jalseva/firestore.rules`) — per-document access control on `users`, `suppliers`, `orders`, `payments`, `ratings`; deployed via `firebaserules.googleapis.com` REST API.
- **Cloud Build config** (`jalseva/cloudbuild.yaml`) — builds the Dockerfile with `NEXT_PUBLIC_*` substitutions, pushes to Artifact Registry `cloud-run-source-deploy/jalseva`, deploys to Cloud Run `asia-east1`.
- **Live deployment** at <https://jalseva.dmj.one> — Cloud Run, `asia-east1`, `min=0`, `max=3`, `512 MiB`, single-instance autoscaling.
- Documentation:
  - `README.md` rebranded as capstone, live URL surfaced, deploy steps written, test phone-number demo flow documented.
  - `SECURITY.md` updated to reflect IAM-internal credential design and the removal of the legacy `nginx` rate-limit claims (no longer used on Cloud Run).
  - This `CHANGELOG.md` created.

### Changed
- **`src/lib/firebase-admin.ts`** — initialization now prefers Application Default Credentials when running on Cloud Run (detected via `K_SERVICE`), eliminating the need for embedded service-account JSON. Conventional cert-based init is still supported when env vars are present.
- **`/login` page** — replaced demo OTP-on-screen logic with real Firebase Phone Auth flow + role toggle + capstone-aware redirect (`/supplier` for suppliers, `/` for customers).
- **`/booking` page** — removed the 8-second auto-assign of a fake supplier; the page now polls `/api/orders/[orderId]` every 3 s and transitions only when a real supplier accepts via Firestore.
- **`/supplier/delivery/[orderId]` page** — replaced `MOCK_ORDER` constant with state pulled from `useSupplierStore.activeOrder` or fetched live from `/api/orders/[orderId]`. Added GPS broadcast `useEffect` and status-update helpers wired to PUT `/api/orders/[orderId]`.
- **`/supplier` layout** — now calls `useSupplier()` so Firestore listeners are active for any supplier session; the online toggle writes to Firestore (`suppliers/{uid}.isOnline`) via `toggleOnline()` instead of mutating local Zustand state only.
- **`/supplier` dashboard** — removed `MOCK_INCOMING_ORDERS` injection; accept/reject now flow through `useSupplier()` Firestore mutations.
- **`Dockerfile`** — switched from `npm ci` to pnpm with frozen lockfile (matches `pnpm-lock.yaml`). Default `CLUSTER_WORKERS=1` for Cloud Run (single-vCPU per instance; horizontal scaling via instance count). Default `PORT=8080` to match Cloud Run's injected port. Build accepts `NEXT_PUBLIC_*` via Docker `ARG`/`ENV` so client-bundle keys are baked at build time.

### Security
- **Zero private keys in deployed image**: the Firebase Admin SDK uses ADC via the dedicated Cloud Run service account `jalseva-runtime@dmjone.iam.gserviceaccount.com`.
- **Session cookie integrity**: cookies are set only server-side, only after `adminAuth.verifyIdToken()` succeeds. Hand-rolled cookies cannot grant access.
- **Maps key restriction**: HTTP referrer allowlist applied to `https://jalseva.dmj.one/*` + `http://localhost*/*` plus Cloud Run URL; API-targets list restricted to Maps Platform services only.
- **Firebase Auth authorized domains** updated to include `jalseva.dmj.one` and the Cloud Run service URL; sign-in attempts from any other origin are rejected by Firebase.
- **IAM least-privilege**: runtime SA has only `roles/datastore.user`, `roles/firebaseauth.admin`, `roles/iam.serviceAccountTokenCreator`.

### Removed
- `server.cluster.js` execution at runtime — file is still present for reference but the container runs `node server.js` directly. Cloud Run's autoscaling replaces in-container clustering.
- Demo OTP generation logic from `/login/page.tsx` (`generateOtp`, `generatedOtp` state, on-screen display).
- `/booking/page.tsx` simulated 8-second supplier auto-assign block.
- `/supplier/page.tsx` `MOCK_INCOMING_ORDERS` and `_MOCK_ACTIVE_ORDER` constants.
- `/supplier/delivery/[orderId]/page.tsx` `MOCK_ORDER` and `MOCK_CUSTOMER` constants.

---

## [2.0.0] — 2026-04 (upstream)

Initial public release of JalSeva. Scaffolded customer/supplier/admin flows, Firestore real-time architecture, Maps integration, resilience patterns (circuit breakers, write coalescer, batch writer, L1/L2 cache, rate limiter, graceful shutdown), Docker multi-stage build, cluster-mode server, Nginx config. Demo OTP login. Simulated Razorpay. ONDC and WhatsApp scaffolded.
