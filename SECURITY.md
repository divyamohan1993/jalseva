# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 2.x     | :white_check_mark: |
| 1.x     | :x: |

## Reporting a Vulnerability

If you discover a security vulnerability in JalSeva, **please do not open a public issue**.

Report it responsibly:

1. **Email:** Send details to **contact@dmj.one** with the subject line `[SECURITY] JalSeva Vulnerability Report`.
2. Include:
   - A description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Response Timeline

- **Acknowledgement:** Within 48 hours
- **Initial assessment:** Within 5 business days
- **Fix & disclosure:** Coordinated with the reporter

## Scope

### In Scope

- The JalSeva web application (`jalseva/` directory)
- API routes and server-side logic (`src/app/api/`)
- Authentication and authorization flows
- Payment processing logic
- Data exposure or injection vulnerabilities
- Rate limiting bypass
- Circuit breaker misconfiguration

### Out of Scope

- Third-party services (Firebase, Google Maps, Razorpay, Upstash) — report directly to those providers
- Social engineering attacks
- Denial of service attacks

## Security Measures Implemented

JalSeva includes multiple layers of security hardening:

### Application Layer

| Measure | Implementation |
|---|---|
| **Rate limiting** | Redis-backed per-IP rate limiter (`src/lib/rate-limiter.ts`) |
| **Circuit breakers** | Protect external service calls from cascade failures (`src/lib/circuit-breaker.ts`) |
| **Bounded queries** | All Firestore reads use `.limit()` to prevent memory exhaustion |
| **Input validation** | Request body validation on all API routes |
| **Auth verification** | Firebase Admin SDK token verification on protected routes |
| **Batch writer cap** | 50K buffer limit with backpressure to prevent OOM |

### Infrastructure Layer

| Measure | Implementation |
|---|---|
| **Nginx rate limiting** | 100 req/sec per IP, 60K req/sec global cap |
| **Security headers** | `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy` |
| **Non-root container** | Docker runs as `nextjs:nodejs` user (UID 1001) |
| **Server tokens off** | Nginx hides version information |
| **Request size limits** | 10MB max body, 128KB buffer |
| **Graceful shutdown** | 30s drain period prevents connection drops during deploys |

### Development Practices

| Practice | Detail |
|---|---|
| **No secrets in code** | All credentials via environment variables (`.env`) |
| **`.env.example`** | Template with empty values — real `.env` is gitignored |
| **Simulated payments** | Razorpay runs in simulation mode by default |
| **Dependency auditing** | `npm audit` in CI pipeline |

## Best Practices for Contributors

When contributing code, please:

- Never commit API keys, secrets, or credentials
- Use environment variables for all sensitive configuration
- Validate and sanitize all user input on API routes
- Use parameterized queries — never concatenate user input into query strings
- Wrap external service calls with the circuit breaker
- Follow the [OWASP Top 10](https://owasp.org/www-project-top-ten/) guidelines

Thank you for helping keep JalSeva secure.
