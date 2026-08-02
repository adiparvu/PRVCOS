# Production Deployment Runbook

Derived from the code, not from memory: every claim below cites the file that
enforces it. Follow the order — several steps fail confusingly when run early.

Target: `app.prvrenovations.ro` (web) → unblocks the TestFlight build, whose
production profile points at that URL (`apps/mobile/eas.json`).

---

## 0. Before you start

| Service | Needed for | If absent |
|---|---|---|
| **Supabase** | database, auth, storage | nothing works |
| **Upstash Redis** | every authenticated request resolves its session here | login 500s |
| **Inngest** | 39 background functions, 27 crons | expiries/escalations silently never run |
| **Resend** | portal magic links, invites, invoice reminders | emails silently not delivered |
| **Anthropic** | AI chat / briefings | boot refuses (key is required) |
| Typesense | full-text search | **optional** — falls back to in-database ILIKE |
| Sentry | error telemetry | optional |
| OpenAI | embeddings / semantic search | optional — search reports "not configured" |

Supabase project for production: **PRV COS** (`ancnxpdhovgltasnxcha`, eu-west-1),
reachable through the project-scoped MCP server in `.mcp.json`. Its API keys use
the new format: `sb_publishable_…` for the client, `sb_secret_…` server-side.
Note the org is on the **free** plan: projects pause after ~1 week idle, which
would take production down. Upgrade before real users.

---

## 1. Environment variables

`apps/web/src/instrumentation.ts` validates the whole contract in `register()`,
which Next.js runs **before the server accepts requests** — a missing or
malformed variable aborts startup with a listed reason. That is deliberate.

### Required — the server refuses to boot without them

```
DATABASE_URL                 # pooler (6543) for the running app
DATABASE_DIRECT_URL          # direct (5432) — migrations/CLI only
SUPABASE_URL                 # server-side (PDF job)
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SUPABASE_URL     # browser + middleware + SSR clients
NEXT_PUBLIC_SUPABASE_ANON_KEY
INNGEST_SIGNING_KEY
INNGEST_EVENT_KEY
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
RESEND_API_KEY               # must start "re_"
ANTHROPIC_API_KEY            # must start "sk-ant-"
NODE_ENV=production          # see the warning below
NEXT_PUBLIC_APP_URL=https://app.prvrenovations.ro
```

**`NODE_ENV` is not cosmetic.** Nine auth routes gate the session cookie's
`Secure` flag on `NODE_ENV === "production"`, and `/api/auth/invite` returns the
raw invite token in its response body outside production. Booting an https
deployment without it is now refused outright (`instrumentation.ts`).

**`NEXT_PUBLIC_APP_URL` has a silent-failure mode.** Every consumer falls back
to `http://localhost:3000`, so omitting it produces password-reset emails,
invites and portal magic links pointing at localhost.

### Also set

```
PUBLIC_COMPANY_SLUG=prv-renovations   # scopes the public shop/leads endpoints
ALLOWED_ORIGINS=https://app.prvrenovations.ro,https://prvrenovations.ro
```

`ALLOWED_ORIGINS` drives the CSRF origin check in `middleware.ts`. **The
marketing site's origin must be in it**, or the quote form on the public site is
rejected.

### Optional (graceful degradation)

`SUPABASE_JWT_SECRET` (unread today), `OPENAI_API_KEY`, `SENTRY_DSN`,
`SENTRY_AUTH_TOKEN`, `EXPO_ACCESS_TOKEN`,
`TYPESENSE_ADMIN_API_KEY` + `TYPESENSE_SEARCH_API_KEY` + `TYPESENSE_HOST`
(set all three or none).

---

## 2. Provision the database

> `drizzle-kit push --force` is destructive — it drops columns/tables to
> reconcile with the schema. Safe on the empty database; never aim it casually
> at a populated production database.

**The trap:** the push step reads `DATABASE_URL`, but DDL through the
transaction-mode pooler (6543) is unreliable. Point `DATABASE_URL` at the
**direct 5432** connection for provisioning only, then switch it back to the
pooler for the running app.

```bash
cd prv
export DATABASE_DIRECT_URL='postgresql://…:5432/postgres'
export DATABASE_URL="$DATABASE_DIRECT_URL"      # provisioning only

pnpm --filter @prv/db db:extensions   # pgcrypto + pgvector
pnpm --filter @prv/db exec drizzle-kit push --force   # 179 tables
pnpm --filter @prv/db db:rls          # RLS on every table + company_isolation
```

`db:rls` is self-verifying: it raises if any public table lacks RLS.
**Re-run it after every schema change** — newly pushed tables start with RLS
off, which would expose them through PostgREST to the anon key.

```bash
# Seed refuses to run with NODE_ENV=production (src/seed.ts), and must run
# BEFORE the demo user, which requires an existing company.
NODE_ENV=development pnpm --filter @prv/db db:seed

# Demo/review account — seeded users have no auth account and cannot log in.
SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
  pnpm --filter @prv/db db:provision:user <email> '<password>' --create-app-row
```

Give the demo account a **non-privileged role**. Do not hand an App Store
reviewer an owner account — it would expose real payroll and personal data.

---

## 3. Storage buckets

Already created on **PRV COS** (`ancnxpdhovgltasnxcha`) with the visibility and
limits below. Mirrors `packages/db/src/storage.ts`; recreate the same way on any
new project (Storage → New bucket).

| Bucket | Public | Limit | MIME |
|---|---|---|---|
| `images` | **yes** | 50 MB | jpeg, png, webp, gif |
| `avatars` | **yes** | 5 MB | jpeg, png, webp |
| `documents` | no | 50 MB | pdf, doc(x), xls(x), text/plain |
| `exports` | no | 50 MB | pdf, csv, zip |
| `temp` | no | 50 MB | any |

`images` **must be public** — site-report photos are served by public URL to the
portal and the mobile gallery.

**50 MB is the free plan's per-file ceiling.** Creating `documents` at 500 MB or
`exports` at 100 MB fails with HTTP 413 "Payload too large". Raise both when the
project is upgraded; nothing in the code assumes the current value.

**`documents` must stay private, and private means signed URLs.** It holds
client contracts and identity paperwork — public visibility would make every one
of them readable by anyone holding the URL, with no authentication. The
consequence is that `uploadFile`'s return value (`getPublicUrl`,
`storage.ts:105`) is a **dead link** for this bucket. Every client-facing read
path therefore goes through `resolveDocumentUrl` (`apps/web/src/lib/document-url.ts`),
which signs `metadata.storagePath` for 15 minutes and passes legacy rows —
staff-entered external URLs with no storage provenance — through unchanged.
Wired at: the portal documents list and detail APIs, the mobile client-portal
documents API, the portal document page, and the external share resolver
(`/api/share/[token]`). **A new read path that renders `documents.fileUrl`
directly is a broken download** — select `metadata` alongside it and resolve.

---

## 4. Deploy the web app

Vercel, root `prv/`, build `pnpm --filter @prv/web build`. Set every variable
from §1 in the project settings, add the domain, deploy.

---

## 5. Sync Inngest — the step everyone forgets

**Deploying does not register the crons.** Inngest learns the 27 schedules only
when it syncs against `https://app.prvrenovations.ro/api/inngest`. There is no
`vercel.json` and no deploy job in CI, so nothing does this for you.

Install the Vercel↔Inngest integration, or sync manually in the Inngest
dashboard. Without it: invoices never go overdue, certifications never expire,
the audit chain is never verified — all silently.

---

## 6. Verify the Resend domain

`packages/email/src/client.ts` sends from `@prv.ro`. If that domain is not
verified in Resend, `/api/portal/auth/request` still answers `{ok:true}`
(anti-enumeration by design) and delivers nothing — client login appears broken
with no error anywhere. Send one real magic link to a live inbox before
declaring the portal working.

---

## 7. Smoke test, in this order

1. `GET /api/health` → expects `database: ok`, `redis: ok`
2. `POST /api/auth/login` (staff) — a 500 here means Redis, not auth
3. an authenticated mobile route — `401 "Session expired or invalid"` also means Redis
4. client magic link end-to-end to a real inbox (proves Resend + portal)
5. a write that fans out: log a site report with a photo (proves storage + notifications)

Only once 1–5 pass is the TestFlight build worth making
(`APP_STORE_SUBMISSION.md` §7).
