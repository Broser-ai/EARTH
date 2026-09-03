# EARTH — audit / local commands

Repo: `github.com/Broser-ai/EARTH`. Port **5180**. Owner: Michael.

This dossier branch is cut from `main` (`7490bda`). Commands below distinguish **main (this tree)** from **unmerged kernel PRs**. Unmerged ≠ shipped.

## Install

```bash
npm install
```

`node_modules/` is gitignored. There is no Docker, no lock-step CI, and no README on `main`.

## Dev server

```bash
npm run dev
# equivalent: vite --port 5180 --host
```

Vite binds as configured in `package.json` (`--host`) and `vite.config.ts` (`server.port: 5180`). Preview:

```bash
npm run preview
# equivalent: vite preview --port 5180
```

## Typecheck (required before anything is “done” — `CLAUDE.md`)

```bash
npx tsc --noEmit
# or:
npm run typecheck
```

`npm run build` already runs `tsc --noEmit` then `vite build`.

## Lint

**Not found** on `main` or the kernel PRs. No ESLint / Biome / Prettier config. Do not invent a lint score.

## Test

| Tree | Command | Reality |
|------|---------|---------|
| `main` @ `7490bda` | none | **Zero tests.** No `vitest`, no `*.test.ts`. |
| PR #1 `cursor/sovereign-agent-swarm-a2a5` | `npm test` → `vitest run` | Kernel unit tests only. |
| PR #2 `cursor/native-url-showcase-a2a5` | `npm test` | Kernel + routing tests. |
| PR #3 `cursor/langgraph-prime-rl-e058` | `npm test` | LangGraph / session-rl tests; **conflicts** with PR #1 tip. |

## Build

```bash
npm run build
```

Output: `dist/` (ephemeral, gitignored).

## Security scan

```bash
npm audit
```

Verified during the security audit: **0** known npm vulnerabilities at scan time. `npm audit` is a dependency CVE scan, not an application threat model. See `docs/SECURITY_THREAT_MODEL.md`.

## What is *not* here

- No backend process, no `docker compose`, no Kafka, no Postgres, no GraphQL, no WebSockets.
- No CI workflow (`.github/` absent).
- No production deploy scripts in this repo.

Foundation code (env validation, error boundary, structured log interface) is **intentionally not** on this docs branch. It lands **after** the kernel PR merges — see `docs/IMPLEMENTATION_ROADMAP.md` Phase 1–2.
