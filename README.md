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

### Expected failures (defects)
_Filled in during the work: test → BUG-ID._

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
| Deployment (not part of the 4 h) | 2026-11-03 18:40 | | | repository setup, guard settings, app clone |
