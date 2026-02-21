## Description

<!-- A brief description of the changes in this PR. -->

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Performance improvement
- [ ] Documentation update
- [ ] Refactoring (no functional changes)

## Related Issues

<!-- Link related issues: Closes #123, Fixes #456 -->

## Changes Made

<!-- List the key changes: -->
-
-

## Testing

<!-- Describe the tests you ran and how to reproduce: -->
- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] Tested locally in browser
- [ ] Tested on mobile viewport

## Performance Checklist

<!-- If your change touches API routes or core libraries: -->
- [ ] Firestore queries use `.limit()` (no unbounded reads)
- [ ] External API calls wrapped with circuit breaker
- [ ] Hot-path data uses L1 cache where appropriate
- [ ] Non-critical writes use batch writer

## Accessibility Checklist

<!-- If your change touches UI components: -->
- [ ] ARIA labels on interactive elements
- [ ] Keyboard navigable (tab order, focus management)
- [ ] Works with `prefers-reduced-motion`
- [ ] Tested with screen reader (or sr-only text provided)

## Screenshots

<!-- If applicable, add before/after screenshots: -->

## Checklist

- [ ] My code follows the project's code style
- [ ] I have not committed any API keys or secrets
- [ ] I have updated documentation if needed
- [ ] My changes generate no new warnings
