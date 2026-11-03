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
npm test                      # all tests, HTML report: reports/html; then checks expected failures (posttest)
npm run test:api | npm run test:ui
npm run test:report           # final report run: DB reset + trace and screenshot for every test (incl. expected failures)
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
Tests that reproduce a defect keep strict assertions and call `knownDefect('BUG-0XX: …', /expected error/)` (`src/fixtures.ts`):
`test.fail` + tag `@bug-BUG-0XX` + the error the test must fail with. In the report they appear as passed ("expected to fail");
if a defect is fixed, the test turns red and the marker must be removed.

`test.fail` alone accepts **any** failure as expected — a setup error or a new regression would be hidden. Therefore
`npm test` runs `scripts/check-expected-failures.mjs` afterwards (`posttest`, also `npm run test:check-failures`): it reads
`reports/results.json` and fails if an expected failure failed with a different error or has no expected-error annotation.
(`npx playwright test` skips this step — use `npm test`.)
The committed report in `reports/html` was produced by `npm run test:report`: with plain `retain-on-failure` Playwright drops the
traces of expected failures, but the task asks for traces/screenshots of failing autotests. The script was self-tested with a tampered report: both cases are caught.

| Test | Defect | Fails on |
|---|---|---|
| `tests/api/invoice-access.spec.ts › TC-028` | BUG-001 | other customers' invoices are returned |
| `tests/api/orders.spec.ts › TC-025` | BUG-017 | invoice stores the client's unit price 0.01 |
| `tests/api/orders.spec.ts › TC-026 … quantity 0` | BUG-018 | 201 instead of 422 |
| `tests/api/orders.spec.ts › TC-026 … out of stock` | BUG-019 | 201 instead of 422 |
| `tests/api/orders.spec.ts › TC-026 … unknown payment method` | BUG-004 | 201 instead of 422 |
| `tests/ui/cart.spec.ts › TC-013` | BUG-005 | quantity stays 1 after adding the product again |
| `tests/ui/cart.spec.ts › TC-014 … shows "Product quantity updated."` | BUG-022 | no "Product quantity updated." message |
| `tests/ui/catalog.spec.ts › TC-001` | BUG-020 | "Price (Low - High)" shows prices high → low |

Passing tests: TC-002/TC-005 (API catalog filters), TC-014 cart recalculation (UI), TC-023 (UI end-to-end order), TC-024 (API order → invoice).
Total: 12 tests — 4 pass, 8 expected failures.

## Borrowed code
None. All test code was written in the Claude Code sessions in `ai_sessions/`; no public Toolshop suites or tests from the app repository were used. The app's user stories, `features.md` and Swagger were used only as requirements.

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
| Block 5 — test code review, release | 2026-11-03 23:36 | 23:58 | 0:22 | readable names/comments in tests, flaky TC-023 analysed via traces (BUG-021 raised, BUG-027..029, Q13), fixed data, RELEASE.md (No-Go) |
| Block 6 — final checks, AI notes | 2026-11-03 23:58 | 2026-11-04 00:12 | 0:14 | `user_id` check (BUG-030), name sort (BUG-020 extended), AI_NOTES, final run, export |
| Block 7 — false positives | 2026-11-04 00:12 | 00:17 | 0:05 | TC-014 split, `knownDefect` + expected-failure check script (self-tested), count fix in RELEASE, final run |
| Block 8 — submission check | 2026-11-04 00:20 | 00:26 | 0:06 | requirement check against task.pdf: traces/screenshots of failing tests added to the report (`npm run test:report`) |
| **Total (without deployment)** | | | **3:53** | |

Times after the deployment start are taken from git commit timestamps and the session log (start of block 1 = first command of the Claude Code session) and confirmed by the author.
