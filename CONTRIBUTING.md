# Contributing to JalSeva

Thank you for your interest in contributing to JalSeva! Every contribution helps make water delivery more accessible across India.

## How to Contribute

### Reporting Bugs

1. Check [existing issues](https://github.com/divyamohan1993/jalseva/issues) to avoid duplicates.
2. Open a new issue using the **Bug Report** template.
3. Include steps to reproduce, expected vs. actual behavior, and screenshots if applicable.

### Suggesting Features

1. Open an issue using the **Feature Request** template.
2. Describe the problem you're trying to solve and your proposed solution.

### Submitting Code

1. **Fork** the repository and create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Install dependencies:**
   ```bash
   cd jalseva && npm install
   ```
3. **Make your changes** — keep commits focused and atomic.
4. **Test locally:**
   ```bash
   npm run build
   npm run lint
   ```
5. **Push** your branch and open a **Pull Request** against `main`.

## Development Setup

```bash
git clone https://github.com/divyamohan1993/jalseva.git
cd jalseva/jalseva
cp .env.example .env
# Fill in your API keys
npm install
npm run dev
```

## Code Style

- **TypeScript** — all new code should be typed.
- **Tailwind CSS** — use utility classes; avoid custom CSS where possible.
- **Components** — place shared components in `src/components/shared/`, UI primitives in `src/components/ui/`.
- **Hooks** — place custom hooks in `src/hooks/`.

## Pull Request Guidelines

- Keep PRs small and focused on a single concern.
- Write a clear description of what changed and why.
- Reference related issues (e.g., `Closes #42`).
- Ensure the build passes before requesting review.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Questions?

Open a [Discussion](https://github.com/divyamohan1993/jalseva/discussions) or reach out via an issue. We're happy to help!
