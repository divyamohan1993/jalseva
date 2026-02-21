# Contributing to JalSeva

163 million Indians lack access to clean water. The system that delivers it to them — water tankers — is broken. No tracking, no transparency, no accountability.

**You can help fix that.**

Every pull request you submit, every bug you squash, every feature you build — it gets clean water to someone faster. This isn't just code. This is infrastructure for a basic human right.

Here's how to get started.

---

## Three Steps to Your First Contribution

**Step 1.** Fork and clone.

```bash
git clone https://github.com/<your-username>/jalseva.git
cd jalseva/jalseva
```

**Step 2.** Set up your environment.

```bash
npm install
cp .env.example .env   # Add your API keys
npm run dev
```

**Step 3.** Create a branch and start building.

```bash
git checkout -b feature/your-feature-name
```

That's it. You're running JalSeva at **http://localhost:3000** with hot reloading.

### Prerequisites

- **Node.js** >= 20 (22 recommended)
- **npm** >= 9
- **Docker** and **Docker Compose** (for containerized development)

### Environment Variables

See `.env.example` for the full list. At minimum you need:

- Firebase client + admin credentials
- Google Maps API key
- Gemini AI API key
- Upstash Redis URL + token

Razorpay, WhatsApp, and ONDC are simulated by default — no real keys needed for development.

---

## Docker — If You Prefer Containers

### Single container

```bash
docker compose up --build
```

Runs on port 3000 with cluster mode. Done.

### Scaled mode — Nginx + 4 containers

```bash
docker compose --profile scaled up --build
```

This is what production looks like. Use it to test performance locally.

### Useful commands

```bash
docker compose logs -f app         # View logs
docker compose restart app         # Restart
docker compose up --build          # Rebuild after dependency changes
docker compose down                # Tear down
```

---

## The Rules

We keep things simple. Three rules:

1. **TypeScript everywhere.** All new code must be typed. No `any` unless absolutely necessary.
2. **Biome for formatting.** Run `npm run lint` before committing. Every time.
3. **Mobile first.** JalSeva's primary users are on low-end Android phones. If it doesn't work on mobile, it doesn't ship.

### Where Things Go

| What | Where |
|---|---|
| Shared components | `src/components/shared/` |
| UI primitives | `src/components/ui/` |
| Custom hooks | `src/hooks/` |
| API routes | `src/app/api/<domain>/route.ts` |
| Core utilities | `src/lib/` |

### Naming Conventions

| Type | Convention | Example |
|---|---|---|
| Components | PascalCase | `OrderCard.tsx` |
| Utilities | kebab-case | `circuit-breaker.ts` |
| Types | kebab-case | `src/types/order.ts` |
| API routes | `route.ts` in directory | `src/app/api/orders/route.ts` |

---

## Before You Submit

Run these three commands. All three must pass.

```bash
npm run lint      # Code style
npm run build     # Type checking
npm test          # Tests
```

If you're adding a feature, add tests. We use **Vitest** with **Testing Library**.

---

## Pull Request Guidelines

Keep PRs small. One concern per PR. Here's what we look for:

1. **Clear description** — what changed and why
2. **Issue reference** — `Closes #42` or `Fixes #456`
3. **Tests pass** — lint, build, and test all green
4. **Mobile tested** — tested on mobile viewports
5. **No secrets** — never commit API keys, credentials, or `.env` files

### Performance — The Non-Negotiables

If your change touches API routes or core libraries, these aren't suggestions — they're requirements:

- **Firestore queries** — always use `.limit()`. No unbounded reads. Ever.
- **External API calls** — wrap with the circuit breaker (`src/lib/circuit-breaker.ts`)
- **Hot paths** — use L1 caching (`src/lib/cache.ts`) for frequently accessed data
- **Write operations** — use the batch writer (`src/lib/batch-writer.ts`) for non-critical writes

---

## Understand the Architecture

Six patterns power everything. Know them and you can contribute to anything in the codebase:

| Pattern | File | What It Does |
|---|---|---|
| Circuit Breaker | `src/lib/circuit-breaker.ts` | Stops cascade failures to external services |
| L1 Cache | `src/lib/cache.ts` | In-process cache — bypasses Redis and Firestore |
| Batch Writer | `src/lib/batch-writer.ts` | Coalesces Firestore writes for throughput |
| Rate Limiter | `src/lib/rate-limiter.ts` | Redis-backed per-IP rate limiting |
| Graceful Shutdown | `src/lib/shutdown.ts` | Drains connections on SIGTERM — zero downtime |
| Cluster Mode | `server.cluster.js` | One worker per CPU core — uses the whole machine |

---

## Reporting Issues

### Found a bug?

1. Check [existing issues](https://github.com/divyamohan1993/jalseva/issues) first.
2. Open a new issue with the **Bug Report** template.
3. Include steps to reproduce, expected vs. actual behavior, and screenshots.

### Have an idea?

Open an issue with the **Feature Request** template. Tell us the problem you're solving.

### Found a security vulnerability?

**Stop. Do not open a public issue.** See [SECURITY.md](SECURITY.md) for responsible disclosure.

---

## Code of Conduct

By contributing, you agree to our [Code of Conduct](CODE_OF_CONDUCT.md). Be kind. Be respectful. We're all here for the same reason — clean water for everyone.

---

## Questions?

Open a [Discussion](https://github.com/divyamohan1993/jalseva/discussions) or file an issue.
