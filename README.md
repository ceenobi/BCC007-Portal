# BCC007Portal

A full-stack payment contribution management platform built with **React Router** (framework mode), **MongoDB**, and **Better Auth**. BCC007Portal manages member accounts, dues & payments, peer-to-peer transfers, events, tickets, group announcements, member analytics, and AI-powered assistance.

[![CI](https://github.com/ceenobi/BCC007-Portal/actions/workflows/ci.yml/badge.svg)](https://github.com/ceenobi/BCC007-Portal/actions/workflows/ci.yml)
[![CodeQL](https://github.com/ceenobi/BCC007-Portal/actions/workflows/codeql.yml/badge.svg)](https://github.com/ceenobi/BCC007-Portal/actions/workflows/codeql.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React Router](https://img.shields.io/badge/React_Router-v8-CA4245?logo=reactrouter&logoColor=white)](https://reactrouter.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Yarn](https://img.shields.io/badge/Yarn-4-2C8EBB?logo=yarn&logoColor=white)](https://yarnpkg.com/)

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md).

## Tech Stack

| Layer      | Technology                                                    |
| ---------- | ------------------------------------------------------------- |
| Framework  | React Router v8 (SSR, file-based routing)                     |
| Database   | MongoDB + Mongoose                                            |
| Auth       | Better Auth (email/password, RBAC)                            |
| Styling    | Tailwind CSS v4 + shadcn/ui (base-ui)                         |
| Data       | TanStack Query (server state) + TanStack Table                |
| Cache      | Upstash Redis (caching, rate limiting)                        |
| Queues     | QStash + Upstash Workflow (scheduled jobs, async tasks)       |
| Payments   | Paystack (dues, subscriptions, transfers)                     |
| Media      | Cloudinary (avatars, uploads)                                 |
| Forms      | React Hook Form + Zod validation                              |
| AI         | OpenCode Zen API (chat assistant)                             |
| Logging    | Pino                                                        |
| Monitoring | Sentry                                                        |
| Testing    | Vitest (unit/integration) + Playwright (e2e)                  |
| CI/CD      | GitHub Actions → Vercel                                       |

## Features

- **Auth & onboarding** — email/password registration & login, email verification, password reset, and a first-run onboarding flow (avatar via Cloudinary, bank details via Paystack).
- **Payments** — monthly dues, levy plans, subscriptions, and full payment history/reports with Paystack webhook handling.
- **Transfers** — peer-to-peer bank transfers with OTP verification, idempotency, and audit logging.
- **Events** — event creation/interest/RSVP with maps, plus birthdays & member analytics.
- **Tickets** — support tickets with assignment and permission-gated workflows.
- **AI Assistant** — a floating chat widget backed by an SSE-streaming tool-calling agent with permission-scoped tools.
- **Global search** — Cmd/Ctrl+K command palette with permission-scoped results.
- **System status** — public `/health` page and `/api/health` JSON endpoint.
- **RBAC** — role- and permission-based access control across every action.

## Getting Started

### Prerequisites

- **Node.js ≥ 22.22.0** (CI uses Node 24)
- **Yarn** (v4, via Corepack)

### Installation

```bash
yarn install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Required variables include `DATABASE_URL`/`DATABASE_NAME`, `BETTER_AUTH_SECRET`/`BETTER_AUTH_URL`, `CLIENT_URL`, `QSTASH_TOKEN`, `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`, `PAYSTACK_SECRET_KEY`, and Cloudinary credentials. See `.env.example` for the full list (including optional AI/Sentry keys).

### Development

Start the development server with HMR:

```bash
yarn dev
```

Your application will be available at `http://localhost:5700`.

### QStash Local Development

Run the QStash CLI (for local workflow testing) in a separate terminal:

```bash
yarn qstash
```

## Testing

The repo ships a Vitest unit + integration suite (**508 tests across 35 files**) and a Playwright e2e smoke gate. Tests run against an in-memory MongoDB and mock external services (QStash, Redis, Cloudinary, Paystack) — no real `.env` required.

```bash
# Unit + integration tests (in-memory MongoDB)
yarn test

# Watch mode
yarn test:watch

# Coverage report
yarn test:coverage

# End-to-end smoke tests (Playwright + hermetic dev server on :5701)
yarn test:e2e

# Type checking
yarn typecheck
```

## Building for Production

```bash
yarn build
```

The build output goes to `build/`:

```
├── package.json
├── yarn.lock
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

Run the production server:

```bash
yarn start
```

## Scheduled Jobs

Recurring QStash workflows keep statuses, transfers, subscriptions, and dashboards fresh:

```bash
yarn schedule:event-status
yarn schedule:transfer-sync
yarn schedule:subscription-sync
yarn schedule:birthday-reminders
yarn schedule:dashboard-refresh
```

## Project Structure

```
app/
├── .server/
│   ├── actions/        # Server actions (business logic)
│   ├── ai/             # LLM client, tool registry, agent loop
│   ├── config/         # Database, keys, logger, redis, upstash
│   ├── models/         # Mongoose models
│   ├── services/       # Audit log, auth, email, notification, paystack
│   ├── utils/          # Cache, cloudinary, health, rate-limit
│   └── workflows/      # QStash async workflows
├── components/         # UI primitives, navigation, providers
├── features/           # Feature-scoped components
├── hooks/              # Shared hooks
├── lib/                # RBAC, schemas, utils, storage
├── middleware/         # Auth middleware (session, permissions)
├── queries/            # Server query modules (React Query)
└── routes/             # File-based routes (layouts, auth, dashboard, API)
```

## Deployment

### CI/CD

The repository uses a two-branch workflow enforced by branch protection:

- All changes land on the **`test`** branch.
- A pull request is opened from `test` → `main`.
- CI (`ci.yml`) runs **typecheck**, **test**, **e2e**, and **coverage** — all must pass before merge.
- **CodeQL** scans for security vulnerabilities on every push/PR; **Dependabot** keeps npm and GitHub Actions dependencies updated.
- `main` is protected: direct pushes, force-pushes, and deletions are blocked.

### Vercel

Deploy with `--prebuilt` after running `yarn build` in CI (see the CI skill docs in this repo). The containerized/DIY app server is also production-ready:

```bash
docker build -t bc007portal .
docker run -p 3000:3000 bc007portal
```

## License

Private project — all rights reserved.
