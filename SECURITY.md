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

### Application Layer

| Defense | How It Works |
|---|---|
| **Rate limiting** | Redis-backed per-IP limiter (`src/lib/rate-limiter.ts`) — stops brute force |
| **Circuit breakers** | Isolate external service failures — no cascading crashes (`src/lib/circuit-breaker.ts`) |
| **Bounded queries** | Every Firestore read uses `.limit()` — no memory exhaustion, ever |
| **Input validation** | Request body validation on every API route |
| **Auth verification** | Firebase Admin SDK token verification on all protected routes |
| **Batch writer cap** | 50K buffer limit with backpressure — prevents OOM under load |

### Infrastructure Layer

| Defense | How It Works |
|---|---|
| **Nginx rate limiting** | 100 req/sec per IP, 60K req/sec global cap — DDoS mitigation at the edge |
| **Security headers** | `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy` |
| **Non-root container** | Docker runs as `nextjs:nodejs` (UID 1001) — principle of least privilege |
| **Server tokens off** | Nginx hides version information — no fingerprinting |
| **Request size limits** | 10MB max body, 128KB buffer — no payload bombs |
| **Graceful shutdown** | 30s drain period — zero dropped connections during deploys |

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
