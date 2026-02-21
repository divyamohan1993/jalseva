## What This Does

<!-- One or two sentences. What does this PR change, and why? -->

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Performance improvement
- [ ] Refactoring (no functional changes)
- [ ] Documentation update
- [ ] Breaking change

## Related Issues

<!-- Closes #123, Fixes #456 -->

## Key Changes

<!-- What did you change? Keep it brief — the diff tells the full story. -->
-
-

---

## The Checklist

### It must work.

- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] `npm test` passes
- [ ] Tested locally in browser
- [ ] Tested on mobile viewport — this is where our users are

### It must be fast.

<!-- Check these if your change touches API routes or core libraries: -->
- [ ] Firestore queries use `.limit()` — no unbounded reads
- [ ] External API calls wrapped with circuit breaker
- [ ] Hot-path data uses L1 cache where appropriate
- [ ] Non-critical writes use batch writer

### It must be accessible.

<!-- Check these if your change touches UI components: -->
- [ ] ARIA labels on interactive elements
- [ ] Keyboard navigable (tab order, focus management)
- [ ] Works with `prefers-reduced-motion`
- [ ] Screen reader tested (or `sr-only` text provided)

### It must be safe.

- [ ] No API keys or secrets committed
- [ ] No new warnings generated
- [ ] Documentation updated if needed

## Screenshots

<!-- Before/after screenshots if this is a UI change. -->
