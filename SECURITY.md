# Security Policy

Security isn't a feature. It's the foundation.

When people trust JalSeva with their location, their payments, and their water supply — we don't take that lightly. Every layer of this platform is built to protect that trust.

---

## Found a Vulnerability?

**Do not open a public issue.** Responsible disclosure protects our users.

Email **contact@dmj.one** with the subject: `[SECURITY] JalSeva Vulnerability Report`

Include:
- What you found
- Steps to reproduce it
- Potential impact
- Suggested fix (if you have one)

### Our Commitment

| Step | Timeline |
|------|----------|
| Acknowledgement | Within 48 hours |
| Initial assessment | Within 5 business days |
| Fix and disclosure | Coordinated with you |

We will work with you, not against you. Responsible reporters get full credit.

---

## Supported Versions

| Version | Supported |
|---------|-----------|
| 2.x     | :white_check_mark: |
| 1.x     | :x: |

---

## What's In Scope

These are fair game for security research:

- The JalSeva web application (`jalseva/` directory)
- API routes and server-side logic (`src/app/api/`)
- Authentication and authorization flows
- Payment processing logic
- Data exposure or injection vulnerabilities
- Rate limiting bypass
- Circuit breaker misconfiguration

### What's Not

- Third-party services (Firebase, Google Maps, Razorpay, Upstash) — report directly to those providers
- Social engineering attacks
- Denial of service attacks

---

## How We Protect Users

Security is layered. If one layer fails, the next one catches it. Here's what's running:

### Identity & Credentials

| Defense | How It Works |
|---|---|
| **Phone OTP auth** | Real Firebase Phone Authentication via `signInWithPhoneNumber` + invisible reCAPTCHA. |
| **Server-side ID-token verification** | The session cookie is set only after `adminAuth.verifyIdToken(token, /*checkRevoked*/ true)` succeeds — cookies cannot be forged client-side. |
| **No private keys in container** | The Firebase Admin SDK uses Application Default Credentials via the Cloud Run service account `jalseva-runtime@<project>.iam.gserviceaccount.com`. Zero `*.json` keys exist in the image, env, or build logs. |
| **Public-key restriction** | The Maps and Firebase web keys are in the client bundle by design. Mitigated via HTTP-referrer allowlist (Maps) and Firebase authorized-domains list. |
| **Least-privilege IAM** | Runtime SA has only `roles/datastore.user`, `roles/firebaseauth.admin`, `roles/iam.serviceAccountTokenCreator`. |

### Application Layer

| Defense | How It Works |
|---|---|
| **Rate limiting (in-memory)** | Per-IP token-bucket (`src/lib/rate-limiter.ts`) — 100 burst / 50 sustained — runs in Next.js middleware before any application logic. |
| **Firestore security rules** | Per-document access control (`firestore.rules`); see in-repo for the deployed ruleset. |
| **Circuit breakers** | Isolate external service failures (`src/lib/circuit-breaker.ts`) — no cascading crashes. |
| **Bounded queries** | Every Firestore read uses `.limit()` — no memory exhaustion, ever. |
| **Input validation** | Request-body validation on every API route; explicit state-machine enforcement on `/api/orders/[id]`. |
| **Batch writer cap** | 50 K buffer limit with backpressure — prevents OOM under load. |

### Infrastructure Layer

| Defense | How It Works |
|---|---|
| **Cloud Run isolation** | Each instance runs in a gVisor sandbox; container is read-only filesystem except `/tmp`. |
| **Edge rate limiting** | Middleware-level global cap (60 K burst / 50 K sustained per instance) blocks DDoS before app logic runs. |
| **Security headers** | `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restricting cam/mic/geo to first-party only. |
| **Non-root container** | Docker runs as `nextjs:nodejs` (UID 1001) — principle of least privilege. |
| **No JSON service-account keys** | Runtime IAM via GCE metadata server; project has no downloadable SA keys for the runtime. |
| **Graceful shutdown** | Cloud Run revision swap drains in-flight requests before terminating. |

### Development Practices

| Practice | Why It Matters |
|---|---|
| **No secrets in code** | All credentials via environment variables. Always. |
| **`.env.example` template** | Empty values only — real `.env` is gitignored |
| **Simulated payments** | Razorpay runs in simulation mode by default — no real money in dev |
| **Dependency auditing** | `npm audit` in the CI pipeline |

---

## For Contributors

If you're writing code for JalSeva, these are non-negotiable:

- Never commit API keys, secrets, or credentials
- Use environment variables for all sensitive configuration
- Validate and sanitize all user input on API routes
- Use parameterized queries — never concatenate user input into query strings
- Wrap external service calls with the circuit breaker
- Follow the [OWASP Top 10](https://owasp.org/www-project-top-ten/) guidelines

Security is everyone's responsibility. Thank you for helping keep JalSeva safe.
