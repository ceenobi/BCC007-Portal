# Contributing to BCC007Portal

Thanks for taking the time to contribute! This guide covers the project conventions, the git workflow, and how to get your changes merged.

## Code of Conduct

By participating in this project you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## License

This project is released under the [MIT License](LICENSE). By contributing, you agree that your contributions are licensed under the same terms.

## Getting Started

### Prerequisites

- **Node.js ≥ 22.22.0** (CI uses Node 24)
- **Yarn** (v4, via Corepack) — `corepack enable`

### Setup

```bash
yarn install
cp .env.example .env   # then fill in the required values
```

See the [README](README.md) for the full environment variable reference.

### Development

```bash
yarn dev        # dev server with HMR on http://localhost:5700
yarn qstash     # QStash CLI in a separate terminal (workflow testing)
```

## Git Workflow

This repository uses a two-branch workflow enforced by branch protection on `main`:

1. **All changes land on the `test` branch** — never commit directly to `main`.
2. Open a pull request from `test` → `main`.
3. Wait for CI to pass (typecheck, test, e2e).
4. Merge the PR; `main` stays protected against direct/force pushes.

```bash
git checkout test
git pull origin test
git checkout -b feat/my-change
# ...make changes...
git push origin feat/my-change
# open a PR into `test`, then once merged, a second PR from `test` -> `main`
```

> If you have push access to `test`, you may push feature branches and merge them into `test` directly before opening the `test` → `main` PR.

## Commit Conventions

Use concise, imperative commit messages that describe the change, e.g.:

```
feat: add treasury expenses management
fix: update e2e title assertion
chore: re-trigger CI after flaky test
```

## Code Conventions

- **Functional components** with hooks; no class components.
- **Strict TypeScript** — every domain object gets an interface in `app/types.d.ts`.
- **Server logic** lives in `app/.server/actions/*.ts` and is called from route `action` functions.
- **Zod schemas** (in `app/lib/formSchema.ts`) for both form validation and API payloads.
- **Tailwind CSS 4** with the `cn()` utility; use `@remixicon/react` for icons.
- No comments unless they clarify non-obvious intent — prefer self-documenting code.

## Testing

Before opening a PR, run the full suite locally:

```bash
yarn typecheck      # React Router typegen + tsc
yarn test           # Vitest (in-memory MongoDB, mocked external services)
yarn test:e2e       # Playwright smoke gate
```

Mongoose mocks in Vitest must be chainable with `.lean()` if the production code uses it.

## CI / Merge Requirements

The `ci.yml` workflow runs **typecheck**, **test**, and **e2e** — all three must be green before merging. Dependabot keeps npm and GitHub Actions dependencies up to date, and a [CodeQL](.github/workflows/codeql.yml) workflow scans for security vulnerabilities.

## Reporting Issues

Found a bug or have a feature request? Open an issue using the [issue templates](.github/ISSUE_TEMPLATE/). For security-sensitive reports, follow the [Security Policy](SECURITY.md) instead of opening a public issue.