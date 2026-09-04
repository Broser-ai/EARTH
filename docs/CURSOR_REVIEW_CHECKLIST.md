# Cursor Review Checklist

Before accepting Cursor changes:

- Confirm branch/worktree isolation.
- Inspect `git diff main...HEAD`.
- Verify changed files match assigned scope.
- Run typecheck, lint, format check, tests, builds, and `npm audit`.
- Run migrations against local PostgreSQL.
- Check `/health` and `/v1/info`.
- Test intake idempotency.
- Test cross-tenant access denial.
- Check audit events are written.
- Check no secrets or `VITE_*` server secrets are added.
- Check no browser or `localStorage` persistence is used for backend sessions, approvals, audit logs, budgets, tenant context, or policies.
- Check no AI/LLM can directly mutate the database, approve claims, call authorities, sign contracts, send messages, or bypass policy.
- Check all stubs say `DEMO`, `DEVELOPMENT_ONLY`, `NOT_CONFIGURED`, `NOT_CONNECTED`, `ESTIMATED`, or `INPUT_UNVERIFIED`.
- Block unsupported claims including CSRD-ready, CSRD compliant, EU AI Act compliant, SBTi validated, KPMG audited, ISO certified, ZK-STARK, post-quantum, blockchain verified, live SAP, live Slack, DATEV connected, autonomous agents, trained RL, live recycler network, and live NanoChat.

Use the commands in `docs/VSCODE_ENGINEERING_GUARDIAN.md` before any merge. Do not auto-merge a Cursor branch.
