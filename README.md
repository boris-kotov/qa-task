# Toolshop — QA assessment (local instance only)

Release readiness assessment: catalog → cart → checkout (+ login/registration as far as needed).
Documents: [TEST_PLAN](TEST_PLAN.md) · [TEST_CASES](TEST_CASES.md) · [BUGS](BUGS.md) · [RELEASE](RELEASE.md) · [AI_NOTES](AI_NOTES.md)

## Environment
| | |
|---|---|
| OS | macOS (Darwin 25.6.0) |
| Docker / Compose | 29.4.2 / v5.1.3 |
| Node / npm | v24.22.0 / 11.19.1 |
| Playwright | 1.64.1 (Chromium) |

## Application version
- Repository: `testsmith-io/practice-software-testing` (cloned next to this repo, **not** inside it — the license forbids redistribution)
- `SPRINT=sprint5-with-bugs` (`.env` in the root of the clone)
- Commit: `ae7caecb811dd8952c09d997e69be7cb946ecd44` (Merge PR #857, 2026-10-11)
- Requirements: `docs/user-stories/v5.md`, `docs/features.md`, Swagger http://localhost:8091/api/documentation

## Running the application
Option used: **source build** (`docker compose up -d`).
Prebuilt images (`docker-compose.prod.yml`) are **not used**: their UI is built with `environment.prod.ts`,
whose `apiUrl` points to the public API, so the UI would call the public stand instead of the local one.

```bash
git clone https://github.com/testsmith-io/practice-software-testing.git toolshop-app
cd toolshop-app
git checkout ae7caecb811dd8952c09d997e69be7cb946ecd44
echo "SPRINT=sprint5-with-bugs" > .env
# the third file is our override from this repo (see "Application changes")
docker compose -f docker-compose.yml -f docker-compose.override.yml \
  -f ../qa-task/app-changes/docker-compose.sprint5-with-bugs.yml up -d
# wait until the composer container has exited (~3 min on first run) and MariaDB is up
docker compose exec laravel-api php artisan migrate:fresh --seed
# UI dev server needs another 1-3 min (npm install + ng serve) before http://localhost:4200 answers
```
UI: http://localhost:4200 · API: http://localhost:8091 · Swagger: http://localhost:8091/api/documentation

Seed check (2026-11-03): 26 products, 12 categories, 10 brands; demo customer login returns a token.

### Application changes
No application files are modified (besides `SPRINT` in `.env`, as instructed by the task).
One configuration override is required to start the UI:

| File | Reason |
|---|---|
| `app-changes/docker-compose.sprint5-with-bugs.yml` | Upstream `docker-compose.yml` starts the UI with `node set-version.js`, which exists only in `sprint5/UI`. For `sprint5-with-bugs` the container exits with `Cannot find module '/app/set-version.js'`. The override runs the same command without that step; the `sprint5-with-bugs` UI does not use the generated version file. |

## Running the tests
```bash
# this repo sits next to toolshop-app
npm ci
npx playwright install chromium
cp .env.example .env          # defaults point to localhost
npm test                      # all tests, HTML report: reports/html
npm run test:api | npm run test:ui
npm run report                # open the report
```

### Test data
- Catalog and demo accounts: `migrate:fresh --seed` (manually, or `RESET_DB=true` in `.env` → once in `globalSetup`, before workers start).
- Each test creates its own user and data via API (unique e-mail), so tests are independent and can run alone, in any order and in parallel.
- `globalSetup` checks that UI/API are reachable and the catalog is not empty.

### Protection against non-local requests
- `src/config/env.ts` accepts `BASE_URL`/`API_URL` only with host `localhost`/`127.0.0.1`; otherwise the run does not start.
- `src/fixtures.ts` auto fixture aborts every browser request to a non-local host; an outgoing XHR/fetch fails the test.

### Test data and repeated runs
- **Orders consume stock** and the app accepts orders beyond stock (BUG-019). Reset the data before a final or a
  repeated run: `RESET_DB=true npm test` (runs `migrate:fresh --seed` once in `globalSetup`).
- **Fixed data** (documented in TEST_CASES.md): TC-014 uses products 1 and 2 (cart only, no stock used); TC-023 orders
  Pliers × 2 + Slip Joint Pliers × 1 — after a reset there is stock for 5 runs of TC-023.
- **Random data** (TC-013, TC-024, TC-025, TC-026, TC-028): in-stock products are picked via the API at runtime, skipping
  the fixed-data products above and Thor Hammer (one per order, TEST_PLAN Q13).
- Why TC-023 uses fixed data: with random products it failed intermittently on real defects (BUG-021 1-cent total,
  BUG-027 search 500, BUG-029 silent rejection). They are reported; the end-to-end test stays deterministic.

### Expected failures (defects)
Tests that reproduce a defect keep strict assertions and are marked `test.fail(true, 'BUG-0XX: …')` + tag `@bug-BUG-0XX`.
In the report they appear as passed ("expected to fail"); if a defect is fixed, the test turns red and the marker must be removed.

| Test | Defect | Fails on |
|---|---|---|
| `tests/api/invoice-access.spec.ts › TC-028` | BUG-001 | other customers' invoices are returned |
| `tests/api/orders.spec.ts › TC-025` | BUG-017 | invoice stores the client's unit price 0.01 |
| `tests/api/orders.spec.ts › TC-026 … quantity 0` | BUG-018 | 201 instead of 422 |
| `tests/api/orders.spec.ts › TC-026 … out of stock` | BUG-019 | 201 instead of 422 |
| `tests/api/orders.spec.ts › TC-026 … unknown payment method` | BUG-004 | 201 instead of 422 |
| `tests/ui/cart.spec.ts › TC-013` | BUG-005 | quantity stays 1 after adding the product again |
| `tests/ui/cart.spec.ts › TC-014` | BUG-022 | no "Product quantity updated." message (totals are asserted before and pass) |
| `tests/ui/catalog.spec.ts › TC-001` | BUG-020 | "Price (Low - High)" shows prices high → low |

Passing tests: TC-002/TC-005 (API catalog filters), TC-023 (UI end-to-end order), TC-024 (API order → invoice).

## Borrowed code
_None so far / to be filled in: source → what was taken → what was changed._

## Tooling (submission safety)
- `npm run guard` — repository check: no `.env`, no application code, no public stand URLs in code, no `.only`, no SSH keys,
  no unredacted personal data in `ai_sessions/`, no files > 50 MB, English only outside `ai_sessions/`.
  Runs in git hooks pre-commit/pre-push (`core.hooksPath=.githooks`).
- `.claude/settings.json` + `.claude/hooks/guard.mjs` — restrictions for the AI agent (see AI_NOTES.md). Self-test: `bash scripts/test-guard.sh`.
- `npm run sessions:export` — exports full Claude Code transcripts into `ai_sessions/` with redaction.

## Time log
| Block | Start | End | Duration | Done |
|---|---|---|---|---|
| Deployment (not part of the 4 h) | 2026-11-03 18:40 | 20:25 | 1:45 | repository setup, guard settings, app clone |
| Block 1 — test plan | 2026-11-03 20:27 | 20:40 | 0:13 | TEST_PLAN.md: sources review, UI recon via Playwright MCP, risks, questions |
| Block 2 — test cases | 2026-11-03 20:43 | 21:16 | 0:33 | TEST_CASES.md (29 cases, AC traceability, 3 review rounds of the plan), manual run of 22 cases with evidence |
| Block 2b — findings review | 2026-11-03 21:16 | 21:59 | 0:43 | registration findings with the author (duplicate e-mail, future DOB, postcode), requirement questions Q8–Q10, automation selection |
| Block 3 — autotests | 2026-11-03 21:59 | 22:46 | 0:47 | plan (3 review rounds), TC-027 determinism spike, API + UI tests (11), page objects, expected failures, full run with DB reset |
| Block 4 — bugs | 2026-11-03 22:46 | 23:36 | 0:50 | BUG-023 manual confirmation and workaround check, session export, BUGS.md (25 defects, requirement issues), re-check of single-seen defects after DB reset |

Times after the deployment start are taken from git commit timestamps and the session log (start of block 1 = first command of the Claude Code session) and confirmed by the author.
