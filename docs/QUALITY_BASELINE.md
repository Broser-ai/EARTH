# EARTH quality baseline

Lint, format, and unit-test tooling for the React / Vite SPA. This is a **development baseline**, not a production gate and not an ESG assurance claim.

## Commands

From the repository root:

```bash
npm install

npm test              # Vitest (jsdom) — SPA smoke tests
npm run test:watch    # Vitest watch mode

npm run lint          # ESLint (configs + tests; fail-gated)
npm run lint:fix      # ESLint auto-fix
npm run lint:src      # ESLint against src/ (advisory; existing pages are out of scope)

npm run format        # Prettier write (ESLint/Prettier/Vitest configs, tests, this doc)
npm run format:check  # Prettier check (same scope; does not reformat src/)

npm run typecheck     # tsc --noEmit (existing SPA script)
```

Do **not** start the product API, database, or Vite dev server to run this baseline.

## What was added

| Area                 | Files                                   |
| -------------------- | --------------------------------------- |
| ESLint (flat config) | `eslint.config.js`                      |
| Prettier             | `prettier.config.js`, `.prettierignore` |
| Vitest               | `vitest.config.ts`                      |
| Root test setup      | `test/setup.ts`                         |
| Smoke tests          | `test/spa.smoke.test.tsx`               |
| Ignore rules         | `.gitignore`                            |
| This doc             | `docs/QUALITY_BASELINE.md`              |

## `package.json` scripts (scope exception)

Root `package.json` (and `package-lock.json`) **are not listed in the specialist file allow-list**, but the baseline cannot run without scripts and devDependencies. These scripts were added anyway:

- `test` / `test:watch` — Vitest
- `lint` / `lint:fix` / `lint:src` — ESLint
- `format` / `format:check` — Prettier

DevDependencies added: `eslint`, `typescript-eslint`, `@eslint/js`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `eslint-config-prettier`, `prettier`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/dom`, `jsdom`, `globals`.

## Scope rules

- **Do not** mass-reformat or mass-lint-fix `src/` pages and components. Prettier ignores `src/`. `npm run lint` only targets quality configs and `test/`.
- Lint/format fixes in this baseline apply to **test files and quality configs only**.
- `npx eslint src` / `npm run lint:src` is available to inspect existing SPA debt; it is **not** required to be green yet.
- Vitest uses `jsdom` and `@vitejs/plugin-react`. It does not boot Postgres, Fastify, or the Vite preview server.

## Smoke coverage

`test/spa.smoke.test.tsx` mounts the existing SPA `App` and checks that the command bar brand (`EARTH`), tenant label, and overview navigation render. It also mounts `CommandBar` and `StatusBadge` in isolation.

## Out of scope

- Product API (`apps/api`), database, Docker Compose
- Rewriting pages or visual identity
- Committing secrets (`.env` is gitignored)
- Merging to `main` or `integration/earth-foundation-v0`
