# AI_NOTES

## Tools and models
| Tool | Version / model | Used for |
|---|---|---|
| Claude Code CLI | v2.1.317, Claude Opus 5.5 (`claude-opus-5-5`), auto mode + plan mode for every stage | task analysis, guard settings, scaffold; test plan, test cases, manual runs, autotests, bug reports, release decision |
| Playwright MCP | `@playwright/mcp@0.0.83`, `--isolated`, `localhost:4200/8091` only | UI recon, locator discovery, manual execution of test cases, screenshots for evidence |
| Inline autocomplete | not used (confirmed by the author) | — |
| Web search (outside Claude Code) | Google AI answer | question which Claude Code files to gitignore (see Corrections) |

Agent instruction files (in the repo): `CLAUDE.md`, `.claude/settings.json`, `.claude/hooks/guard.mjs`, `.mcp.json`.
`.claude/settings.local.json` is gitignored: it is Claude Code's personal per-machine permission allowlist (can contain local paths),
not an instruction file. It did not exist at the time of writing; all shared agent rules are committed.
The rulebook shared by a friend (`LLM-CODEGEN-RULEBOOK.md`, rules from another project) was not given to the agent as instructions:
it was read and evaluated in session `b74ee855`, and our own `CLAUDE.md` was written instead. The file itself is not in the repo.

## Session list
| File | Tool | Task | Output |
|---|---|---|---|
| `ai_sessions/claude-code/9c021ebc-….jsonl` (+ `00-export-trial/*.txt` — same dialog via `/export`) | Claude Code | trial session to check export | `export-check.txt` |
| `ai_sessions/claude-code/b74ee855-….jsonl` | Claude Code | task and recruiter notes analysis, rulebook review, `CLAUDE.md`; guards against disqualifying mistakes; app clone; Playwright scaffold; session export; English-only rule | all commits up to `c00bf61` (`Co-Authored-By: Claude`) |
| `ai_sessions/claude-code/6e082c21-….jsonl` (+ `6e082c21-…/tool-results/`) | Claude Code + Playwright MCP | after restart (to load Playwright MCP): TEST_PLAN, TEST_CASES with 3 review rounds, manual run, findings review with the author, autotests (plan reviewed 3×), BUGS, test code review, RELEASE, AI_NOTES | commits `bca099e` … final (24+ commits) |

Done without AI (manually):
- private GitHub repository, SSH access, commit `62a5908` (GitHub quickstart commands);
- `.env` created, `.ssh` added to `.gitignore`;
- in session `6e082c21` the author checked by hand: country dropdown on registration (works with the mouse), future date of birth
  (found by the author → F-2), delete from the cart (confirmed BUG-023 in a regular browser) and suggested the quantity-0 workaround;
- review questions that changed the plans were asked by the author (critical path, AC coverage, task requirements, "senior" review,
  test pyramid, number of autotests, requirement bugs vs app bugs);
- a commit adding `.claude/settings.local.json` to `.gitignore`, then two `git reset --hard HEAD~1` (visible in reflog) that also removed
  an AI commit; both changes were re-applied by the agent at the user's request;
- Docker Desktop started.

### Export format
`/export` (txt) collapses tool results (`Read 1 file (ctrl+o to expand)`), as seen in the trial session
(`00-export-trial/`). The primary format is therefore the raw Claude Code JSONL transcripts
(`~/.claude/projects/<project>/*.jsonl`, with tool calls, tool results and subagent transcripts),
copied unabridged by `npm run sessions:export`. The export is repeated at the end of every working session; files are overwritten with the full version.

## Verifying AI output
- Agent guard hook: self-test `bash scripts/test-guard.sh` — 15 scenarios (10 blocked, 5 allowed), all as expected.
  The hook also fired for real: it blocked the agent's own test command containing `git push --force`.
- Git guard: violations were staged on purpose (spec with a public URL and `test.only`, `sprint5/API/x.php`) —
  all caught; it also found an unredacted home path in the trial export.
- The AI claim about the prebuilt-image trap was checked against the app sources:
  `sprint5-with-bugs/UI/src/environments/environment.prod.ts` → public API `apiUrl`; `environment.ts` → `localhost:8091`.
- Scaffold: `tsc --noEmit`, `eslint` clean; `npm run guard` before every commit.
- After redaction: search for e-mails, personal names, paths and tokens in `ai_sessions/` — only public Toolshop demo addresses and service addresses remain.
- **Test cases:** AC traceability table (every in-scope AC of v5.md → TC, excluded ACs with reasons) checked against `docs/user-stories/v5.md`,
  `features.md` and `task.pdf` (field list and status values). Plans were challenged by the author three times; each round added or removed cases.
- **Manual results:** every Fail has evidence in `reports/evidence/` (screenshot, API response, network log). Defects seen once were
  re-checked after a DB reset; one was withdrawn (BUG-009 → requirement issue Q12) because the re-check showed an explicit message.
- **Autotests:**
  - `tsc` and `eslint` are clean;
  - every expected failure is checked after each `npm test` run by `scripts/check-expected-failures.mjs` (error must match the annotation);
  - every spec was run alone and under `--repeat-each=3..8 --workers=4`;
  - the final run used `RESET_DB=true`, which was verified via a stock value.
- **Expected failures:** for each `test.fail` test, the JSON reporter was used to confirm that it fails on the defect
  assertion, not earlier (e.g. 201 instead of 422, stored price 0.01).
- **Intermittent failures** were not retried away. They were analysed through the error context and the Playwright trace
  (`*.network`, request/response bodies) and led to real defects: BUG-021 (invoice total), BUG-027, BUG-028 (search),
  BUG-029 (silent rejection), Q13.
- **Documents:** BUG-IDs cross-checked between BUGS, TEST_CASES, README, RELEASE and the specs with `grep`/`comm`; the blocker
  list in RELEASE equals the "yes" rows in BUGS; every evidence path exists.
- **App sources:** read only to learn field names and storage keys: the checkout template, `token-storage.service.ts`,
  `cart.service.ts`, Swagger JSON. Never used as evidence of a defect. The built-in bug list and the "Bug Hunting Guide"
  were never opened.

## Corrections (what AI proposed or did wrong, and what changed)
| What | Correction |
|---|---|
| The task allows prebuilt images `docker-compose.prod.yml` | Rejected: their UI calls the public API → disqualification. Source build only; the command is blocked by the hook. |
| The hook treated the demo e-mail `customer@<stand domain>` as a violation | Regex fixed: an e-mail is not a network call. `.env.example` first got an invented address `…@….local`; replaced with the real one from the app README. |
| `export-sessions.sh` failed under `set -o pipefail` when a value was not found | Added `|| true` to the counter. |
| Redaction summary had duplicate rows; `awk` aggregation broke | Rewritten in `perl`, summed per label. |
| Redaction was case-sensitive: lowercase name fragments (from check commands) stayed in the transcript | Replacement and counting made case-insensitive, name parts added to the list; rescan clean. |
| Testing the hook in a single bash command was blocked by the hook itself | Tests moved to `scripts/test-guard.sh`. |
| `npx @playwright/mcp --help` was denied by the auto mode classifier | Flags taken from the package README (`npm view … readme`). |
| Latest `@playwright/mcp@0.0.84` was 3 days old | Pinned `0.0.83` (caution with fresh releases). |
| TypeScript 7 / ESLint 10 are the latest majors | Chose TS 5.9.3 and ESLint 9 for compatibility with typescript-eslint and eslint-plugin-playwright (conservative choice, incompatibility not verified). |
| The user deleted `.env.example` while creating `.env` | Restored: the task requires `.env.example` in the repo. |
| GitHub quickstart appended `# qa-task` to the end of README | Line removed (again after the reset). |
| Web search suggested gitignoring `.claude/settings.local.json`; the user doubted it (everything should be open for review) | Kept ignored: it is a personal permission allowlist, not an instruction file; shared rules are committed. Reasoning recorded here. |
| Personal file names leaked into the `~/Documents` listing | Added to the local redaction list `.redact.local` (not in the repo). |
| TEST_CASES draft: 26 → 30 cases; then "credit card / gift card validation" cases for fields that do not exist; one case covering two scenarios to stay ≤ 30 | Author's review rounds: added negative/edge cases and registration (task scope), AC traceability; removed cases for non-existent fields (TC-021 checks the fields instead); one objective per case (29 cases) |
| Autotest plan: ~22 report entries (5 payment methods, 7 invalid payloads) and 5 UI / 5 API | Author asked about the task volume and the test pyramid: trimmed to 11 meaningful tests (7 API, 4 UI); TC-027 dropped after a determinism spike (duplicates in 18/20 pairs) instead of a flickering `test.fail` |
| Undocumented behaviour classified as "assumption, not a defect" | Author: requirements can be wrong too → explicit requirement questions Q8–Q13 and a separate "Requirement issues" section in BUGS; app defect only where the AC is reasonable |
| Country dropdown failure on registration suspected as an app defect | Author checked by hand: works; Playwright `selectOption` does not update the Angular form, keyboard selection does → closed as automation note |
| BUG-023 (delete from cart) proposed as Major | Author pointed out the quantity-0 workaround; verified it (line stays and is sent with quantity 0 → BUG-018) → Minor |
| Duplicate e-mail "password hint" message proposed as Major (security) | Author: a UI text defect (no hint is ever entered) → Minor / Medium |
| BUG-009 "quantity capped at 99" reported as a defect | Re-check showed "You can order at most 99 of this product." — an explicit rule; moved to requirement issue Q12 |
| Reproducibility counts written higher than observed (BUG-012 3/3, BUG-007 4/4) | Corrected to 2/2 and 3/3 before the commit |
| TC-027 spike script: no `user_id` in the body (all 422) and `undefined === undefined` counted as a duplicate | Both fixed, spike re-run; mistakes recorded in the evidence file |
| zod schema expected string postcodes | Seeded invoices return numbers → schema accepts both; not a defect (no leading zero lost) |
| `addToCart` helper waited for "cart changed" (would time out on BUG-005); Add to cart clicked before product data loaded | Helper waits for the product in the cart; page readiness = product name and price shown |
| faker last names with an apostrophe broke registration (flaky setup) | Reproduced as finding F-5 / Q11; factory uses letters-only names |
| TC-023 with random products failed intermittently | Analysed via traces → BUG-021 (invoice total), BUG-027/028, BUG-029, Q13; test switched to the documented fixed data |
| Mental arithmetic "3 × 14.15 + 12.01 = 54.45 in JS" | Checked with `node`: 54.46 exactly; the rounding defect needed other prices |
| False positives during manual exploration: pagination click via JS, product image "broken", phone "loses a leading zero" | Each re-checked and withdrawn before reporting (BUGS → "Not reproduced / closed") |
| MCP turned an element ref into `.btn` + `first()` near the "Bug Hunting Guide" button | Checked that no modal/guide opened (the first `.btn` was the cart delete button) |
| `test.fail` accepted any failure: a setup error or a new regression in a test marked as a known defect would be reported as "expected"; TC-014 combined a passing check (totals) with a known defect (message) | Found when the author asked about false positives: TC-014 split into two tests; `knownDefect(bug, expectedError)` + `scripts/check-expected-failures.mjs` (posttest) verifies the reason of every expected failure; script self-tested with a tampered report. RELEASE also had a wrong count ("4 pass, 7 expected failures" for 11 tests — really 3 + 8), corrected |
| Variable names in specs (`l`, `p`, `first`, `row`, …) | Renamed and commented at the author's request; behaviour unchanged, suite re-run |
| Project docs were written in Russian | Rewritten in English at the user's request; `CLAUDE.md` now requires English for all project files (enforced by `guard-repo`). |

## Gaps and redaction
- Redaction: `scripts/export-sessions.sh`, summary in [`ai_sessions/REDACTIONS.md`](ai_sessions/REDACTIONS.md).
  Only values were replaced with `<REDACTED: label>`: home path, OS username, e-mail, first/last name,
  personal and third-party file names from a directory listing. No messages or tool calls were removed.
- Toolshop credentials are public and not redacted.
- Transcript `b74ee855` embeds task materials (`task.pdf`, a screenshot of the recruiter's message with a link to the task document).
  Images are not redacted: they are the company's own materials.
- Session `b74ee855` started with `/clear` after the trial session; no task work happened before it.
- Conversation with the agent is in Russian; all project files are in English.
- Session `6e082c21` started after a Claude Code restart (needed to load the Playwright MCP server); no task work happened in between.
- No subagents were used in session `6e082c21`.
- Playwright MCP snapshots/logs (`.playwright-mcp/`) and raw test results (`reports/test-results/`) are gitignored; the relevant
  screenshots, API responses and network excerpts were copied into `reports/evidence/`.
- The last messages of the final session (after the final export) are not in the repository, by construction.
- Recording gaps: none.
