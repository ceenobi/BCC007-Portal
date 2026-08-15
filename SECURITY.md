# Security Policy

## Supported Versions

Security updates are applied to the `main` branch and shipped through the regular `test` → `main` workflow. There are no long-lived release branches; the latest deployed version on Vercel is always the supported one.

| Version          | Supported          |
| ---------------- | ------------------ |
| `main` (latest)  | :white_check_mark: |
| Older branches   | :x:                 |

## Reporting a Vulnerability

Please **do not open a public issue** for security vulnerabilities. Instead, report privately:

- **Email:** <charlesmutob@gmail.com>
- Include as much detail as possible:
  - The affected endpoint/route, action, or component
  - Steps to reproduce
  - Impact and any suggested remediation
  - Whether it is publicly exploitable

You will receive a response within **72 hours** with the next steps. We ask that you keep details confidential until a fix is deployed and confirmed.

## Security Best Practices in This Project

- All secrets live in `.env` / Vercel environment variables and are **never** committed (`.env*` is gitignored except `.env.example`).
- Authentication is handled by Better Auth (email/password, RBAC); middleware enforces session + permission checks on every action.
- Mutations are validated with **Zod** on both client and server.
- Rate limiting is applied via Upstash Redis to sensitive actions.
- Idempotency keys prevent duplicate side effects for payment/transfer operations.
- **CodeQL** runs on every PR to catch vulnerabilities in the codebase.
- **Dependabot** keeps npm and GitHub Actions dependencies patched; merge security updates promptly.

## Reporting Dependencies

Dependabot opens PRs for vulnerable or outdated dependencies on the `test` branch. Keep them current — do not leave security bumps open indefinitely.