# Contributing to JalSeva

Thank you for your interest in contributing to JalSeva! Every contribution helps make water delivery more accessible across India.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Docker Development](#docker-development)
- [Code Style](#code-style)
- [Testing](#testing)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Architecture Notes](#architecture-notes)
- [Reporting Issues](#reporting-issues)

---

## Getting Started

1. **Fork** the repository on GitHub.
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/jalseva.git
   cd jalseva/jalseva
   ```
3. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

---

## Development Setup

### Prerequisites

- **Node.js** >= 20 (22 recommended)
- **npm** >= 9
- **Docker** and **Docker Compose** (for containerized development)

### Local Development

```bash
cd jalseva/jalseva

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start dev server
npm run dev
```

The app runs at **http://localhost:3000** with hot reloading.

### Environment Variables

See `.env.example` for the full list. At minimum you need:

- Firebase client + admin credentials
- Google Maps API key
- Gemini AI API key
- Upstash Redis URL + token

Razorpay, WhatsApp, and ONDC are simulated by default — no real keys needed for development.

---

## Docker Development

### Single Container

```bash
docker compose up --build
```

This starts the app with cluster mode on port 3000.

### Scaled Mode (Nginx + 4 containers)

```bash
docker compose --profile scaled up --build
```

This starts Nginx on port 80 load-balancing across 4 app containers. Useful for testing production-like performance locally.

### Useful Commands

```bash
# View logs
docker compose logs -f app

# Restart a specific service
docker compose restart app

# Rebuild after dependency changes
docker compose up --build

# Tear down
docker compose down
```

---

## Code Style

- **TypeScript** — all new code must be typed. No `any` unless absolutely necessary.
- **Biome** — linter and formatter. Run `npm run lint` before committing.
- **Tailwind CSS** — use utility classes; avoid custom CSS where possible.
- **Components** — place shared components in `src/components/shared/`, UI primitives in `src/components/ui/`.
- **Hooks** — place custom hooks in `src/hooks/`.
- **API routes** — place in `src/app/api/<domain>/route.ts`.
- **Libraries** — place core utilities in `src/lib/`.

### File Naming

- Components: `PascalCase.tsx` (e.g., `OrderCard.tsx`)
- Utilities: `kebab-case.ts` (e.g., `circuit-breaker.ts`)
- Types: `kebab-case.ts` in `src/types/`
- API routes: `route.ts` inside the appropriate directory

---

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint
npm run lint

# Build (checks for type errors)
npm run build
```

When adding new features, include tests where applicable. We use **Vitest** with **Testing Library** for component tests.

---

## Pull Request Guidelines

1. **Keep PRs small** — focused on a single concern.
2. **Write a clear description** of what changed and why.
3. **Reference related issues** (e.g., `Closes #42`).
4. **Ensure the build passes:**
   ```bash
   npm run lint
   npm run build
   npm test
   ```
5. **Test on mobile viewports** — JalSeva's primary users are on mobile.
6. **No secrets** — never commit API keys, credentials, or `.env` files.

### Performance Considerations

If your change touches API routes or core libraries, please consider:

- **Firestore queries** — always use `.limit()` to prevent unbounded reads.
- **External API calls** — wrap with the circuit breaker (`src/lib/circuit-breaker.ts`).
- **Hot paths** — consider L1 caching (`src/lib/cache.ts`) for frequently accessed data.
- **Write operations** — use the batch writer (`src/lib/batch-writer.ts`) for non-critical writes.

---

## Architecture Notes

Understanding these patterns will help you contribute effectively:

| Pattern | File | Purpose |
|---|---|---|
| Circuit Breaker | `src/lib/circuit-breaker.ts` | Prevents cascade failures to external services |
| L1 Cache | `src/lib/cache.ts` | In-process cache to reduce Firestore/Redis hits |
| Batch Writer | `src/lib/batch-writer.ts` | Coalesces Firestore writes for throughput |
| Rate Limiter | `src/lib/rate-limiter.ts` | Application-level rate limiting via Redis |
| Graceful Shutdown | `src/lib/shutdown.ts` | Drain connections on SIGTERM for zero-downtime deploys |
| Cluster Mode | `server.cluster.js` | Fork one worker per CPU core for multi-core throughput |

---

## Reporting Issues

### Bugs

1. Check [existing issues](https://github.com/divyamohan1993/jalseva/issues) to avoid duplicates.
2. Open a new issue using the **Bug Report** template.
3. Include steps to reproduce, expected vs. actual behavior, and screenshots if applicable.

### Feature Requests

1. Open an issue using the **Feature Request** template.
2. Describe the problem you're trying to solve and your proposed solution.

### Security Vulnerabilities

**Do not open a public issue.** See [SECURITY.md](SECURITY.md) for responsible disclosure.

---

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## Questions?

Open a [Discussion](https://github.com/divyamohan1993/jalseva/discussions) or reach out via an issue. We're happy to help!
