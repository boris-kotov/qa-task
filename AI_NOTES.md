# AI_NOTES

## Tools and models
| Tool | Version / model | Used for |
|---|---|---|
| Claude Code CLI | v2.1.317, Claude Opus 5.5 (`claude-opus-5-5`), auto mode | task analysis, guard settings, scaffold; later test plan, test cases, autotests |
| Playwright MCP | `@playwright/mcp@0.0.83`, `--isolated`, `localhost:4200/8091` only | UI exploration and locator discovery |
| Inline autocomplete | _not used / specify_ | |
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
| `ai_sessions/claude-code/b74ee855-….jsonl` | Claude Code | task and recruiter notes analysis, rulebook review, `CLAUDE.md`; guards against disqualifying mistakes; app clone; Playwright scaffold; session export; English-only rule | all commits authored with `Co-Authored-By: Claude` |

Done without AI (manually):
- private GitHub repository, SSH access, commit `62a5908` (GitHub quickstart commands);
- `.env` created, `.ssh` added to `.gitignore`;
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
- _Next: how test cases, autotests and defects were verified (runs, manual reproduction, Swagger/user stories cross-check)._

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
- Recording gaps: none.
