# GrowthPilot AI

Multi-tenant AI digital marketing agency platform for local businesses in India.

**Status: Phase 1 complete** (authentication, onboarding, multi-tenant isolation, Super Admin area). Later phases are listed in `docs/master-project-prompt.md`.

## What works now

- Customer registration with mobile OTP verification, login, logout, httpOnly session cookie
- 5-step onboarding wizard (profile, brand and language, goals, locations, review) saved to the database
- Customer dashboard showing real profile data; figures that need later phases are marked unavailable
- Super Admin and Agency Team area: live stats, customer search and filters, customer detail, suspend and restore, team management, customer assignment, audit log
- Role-based access (Super Admin, Agency Staff, Customer) enforced on the server; staff only see assigned customers
- Tenant isolation enforced twice: scoped queries and PostgreSQL row-level security
- Rate limiting, input validation, bcrypt password hashing, audit logging

Not built yet: subscriptions and Razorpay (Phase 2), Claude AI content and calendar (Phase 3), social publishing, Meta and Google (Phase 4), CRM and WhatsApp (Phase 5), voice and reports (Phase 6). Google sign-in is implemented but needs `GOOGLE_CLIENT_ID`. SMS delivery has no provider yet: in development the OTP is logged and shown on the verify page; production refuses to send until a provider is added.

## Run locally

Requires Node 22, pnpm and PostgreSQL 16.

```bash
docker compose up -d postgres            # or use your own Postgres
cp .env.example apps/api/.env            # then set JWT_SECRET to a long random string
pnpm install
pnpm --filter @growthpilot/api migrate   # creates tables and row-level security policies
pnpm --filter @growthpilot/api seed      # creates the first Super Admin from SEED_ADMIN_* values
pnpm dev:api                             # http://localhost:4000/api
pnpm dev:web                             # http://localhost:3000
```

Sign in at `/login` with the seeded admin, or register a customer at `/register`.

## Tests

```bash
pnpm test        # 29 API end-to-end tests against a real Postgres database (creates growthpilot_test)
node scripts/e2e-flow.js   # optional browser flow; needs both servers running and Playwright installed
```

## Layout

```
apps/api   NestJS REST API (src/auth, src/tenants, src/admin, src/db with SQL migrations)
apps/web   Next.js App Router, Tailwind (src/app, src/lib, src/components)
design/    UI screen designs
docs/      Product brief
```

## Security notes

- Sessions are httpOnly cookies; the browser only talks to the web origin, which proxies `/api` to the API.
- `app.bypass_rls` is only set by trusted server code (authentication and admin); it is never derived from request input.
- Set a strong `JWT_SECRET`; the API refuses to start without one of at least 32 characters.
