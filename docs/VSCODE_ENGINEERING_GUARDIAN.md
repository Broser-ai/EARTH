# EARTH VS Code Engineering Guardian

EARTH is currently a development prototype. VS Code tooling does not make EARTH production-ready and does not add production authentication, multi-tenant security, external integrations, AI providers, blockchain, or compliance conformance.

## Startup

Install both independently packaged applications, then start local PostgreSQL and migrations:

```sh
npm install
npm --prefix apps/api install
docker compose up -d
npm run db:migrate
```

In separate terminals, run the API and SPA:

```sh
npm run api:dev
npm run dev
```

The API is available on `http://localhost:3001`; the SPA is available on `http://localhost:5180`. Use the `EARTH:` VS Code tasks for the same commands. Start debug with `EARTH: Debug API + launch SPA`; browser launch requires the built-in or installed Chrome debugger support.

## Validation

Run the full quality set in sequence with the `EARTH: Full verification` task, or run:

```sh
npm run typecheck
npm run api:typecheck
npm run lint
npm run format:check
npm run test
npm run api:test
npm run build
npm run api:build
npm audit
```

Run database migrations before API-flow tests:

```sh
docker compose up -d
npm run db:migrate
```

## Cursor Branch Review

Never edit `main` directly or edit concurrently with Cursor in its worktree. Inspect the target branch in an isolated worktree; review only unless an explicit repair is requested.

```sh
git status
git branch --show-current
git worktree list
git log --oneline --decorate -10
git diff main...HEAD --stat
git diff main...HEAD
git grep -nEi "(api[_-]?key|secret|password|private[_-]?key|bearer |token=|sk-[A-Za-z0-9])" -- ':!package-lock.json' ':!node_modules' ':!dist'
git grep -nEi "(CSRD-ready|CSRD compliant|EU AI Act compliant|SBTi validated|KPMG audited|ISO 14064-1 Certified|Post-Quantum ZK-STARK|post-quantum|NIST-PQC|blockchain verified|live SAP|live Slack|DATEV connected|autonomous)" -- src apps packages
```

For a repair, create a separate branch from the reviewed base and record scope before editing:

```sh
git switch main
git pull --ff-only
git switch -c fix/vscode-<short-descriptive-name>
```

Reproduce the defect, make the smallest safe change and a regression test, rerun relevant checks, document observable changes, then commit with a clear conventional commit. Do not disable checks, weaken authorization or tenant filters, remove audit logging, add broad `any`, swallow errors, or replace a real failure with a masking mock.

## Intake Flow

Use `requests/earth-api.http` after startup. It contains only the documented DEVELOPMENT seed IDs: organization `11111111-1111-1111-1111-111111111111` and owner `22222222-2222-2222-2222-222222222222`.

1. Send `DEVELOPMENT_ONLY - Start a material opportunity intake` and copy its `sessionId` into `@sessionId`.
2. Send the session request, then run `DEVELOPMENT_ONLY - Run the next deterministic intake task` repeatedly.
3. Send the audit-events request and confirm durable intake audit events exist.
4. Repeat the original start request with the same idempotency key and verify it does not create a second intake.
5. Repeat a session request with a different valid tenant context and verify access is denied.

Development headers are not production authentication. Do not add or imply production authentication in requests, UI, or documentation.

## Local PostgreSQL

The local compose service uses `postgres:16-alpine` with database, user, and password `earth`. Inspect it with:

```sh
docker compose exec postgres psql -U earth -d earth
```

Helpful inspection queries:

```sql
\dt
SELECT id, status, created_at FROM sessions ORDER BY created_at DESC;
SELECT session_id, event_type, created_at FROM audit_events ORDER BY created_at DESC;
```

## Merge Blockers

Block a merge when branch/worktree isolation is missing, changes exceed assigned scope, any validation command fails, migrations fail, `/health` or `/v1/info` is dishonest, idempotency fails, cross-tenant access is allowed, audit events are absent, secrets or `VITE_*` server secrets appear, or unqualified forbidden product claims are introduced.

Also block browser or `localStorage` persistence for backend sessions, approvals, audit logs, budgets, tenant context, or policies; any AI/LLM path that can mutate the database or bypass policy; and stubs without an explicit `DEMO`, `DEVELOPMENT_ONLY`, `NOT_CONFIGURED`, `NOT_CONNECTED`, `NOT VERIFIED`, `ESTIMATED`, or `INPUT_UNVERIFIED` marker. Consult `docs/CURSOR_REVIEW_CHECKLIST.md` for the mandatory full list.
