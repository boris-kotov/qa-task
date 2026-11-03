#!/usr/bin/env node
// PreToolUse guard for Claude Code.
// Blocks (exit 2) any tool call that would:
//   1) reach the public Toolshop stand instead of the local instance;
//   2) navigate an MCP browser anywhere except localhost;
//   3) write the public stand URL into code/config files;
//   4) copy application sources into this repository;
//   5) commit/push secrets or force-push.
// The domain is assembled from parts so this file never contains it literally.
import { readFileSync } from 'node:fs';

const DOMAIN = ['practicesoftwaretesting', 'com'].join('\\.');
// Host reference (URL, curl target, etc.). Demo e-mails like user@<domain> are allowed: not a network call.
const PUBLIC_RE = new RegExp(`(^|[^a-z0-9@.-])([a-z0-9-]+\\.)*${DOMAIN}`, 'i');
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
const CODE_EXT = /\.(ts|tsx|js|mjs|cjs|json|ya?ml|sh|env(\..*)?)$|(^|\/)\.env(\.[^/]*)?$/i;

function block(reason) {
  process.stderr.write(`BLOCKED by .claude/hooks/guard.mjs: ${reason}\n`);
  process.exit(2);
}

let payload;
try {
  payload = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0); // nothing to inspect
}
const tool = payload.tool_name ?? '';
const input = payload.tool_input ?? {};
const asText = JSON.stringify(input);

// 1. Bash
if (tool === 'Bash') {
  const cmd = String(input.command ?? '');
  if (PUBLIC_RE.test(cmd)) block('command references the public Toolshop stand. Use http://localhost:4200 / http://localhost:8091 only.');
  if (/git\s+push\b[^|;&]*\s(-f|--force|--force-with-lease)\b/.test(cmd)) block('force push is not allowed.');
  if (/git\s+add\b[^|;&]*(\s|\/)\.env(\s|$)/.test(cmd) || /git\s+add\s+-f\b/.test(cmd)) block('do not stage .env or force-add ignored files.');
  if (/\b(cp|rsync|ditto|mv)\b[^|;&]*toolshop-app/.test(cmd) && !/app-changes/.test(cmd)) {
    block('copying application sources into the repo is forbidden by the app license. Put changes as a patch in app-changes/.');
  }
  if (/docker\s+compose\b[^|;&]*docker-compose\.prod\.yml/.test(cmd)) {
    block('prebuilt images are built with environment.prod.ts which points the UI to the PUBLIC API. Use `docker compose up -d` (source build).');
  }
  process.exit(0);
}

// 2. Web fetch
if (tool === 'WebFetch') {
  if (PUBLIC_RE.test(String(input.url ?? ''))) block('fetching the public Toolshop stand is forbidden.');
  process.exit(0);
}

// 3. Browser MCP tools (Playwright MCP, Chrome, etc.)
if (tool.startsWith('mcp__')) {
  if (PUBLIC_RE.test(asText)) block('MCP call references the public Toolshop stand.');
  const url = input.url ?? input.href;
  if (typeof url === 'string' && /navigate|open|goto|tabs_create/i.test(tool) && /^https?:/i.test(url)) {
    let host = '';
    try { host = new URL(url).hostname; } catch { block(`unparsable URL: ${url}`); }
    if (!LOCAL_HOSTS.has(host)) block(`browser navigation allowed only to localhost, got: ${host}`);
  }
  process.exit(0);
}

// 4. File writes
if (['Write', 'Edit', 'MultiEdit', 'NotebookEdit'].includes(tool)) {
  const file = String(input.file_path ?? input.notebook_path ?? '');
  if (/(^|\/)\.env$/.test(file)) block('.env is local-only; edit .env.example instead (user fills .env manually).');
  if (CODE_EXT.test(file) && !/\/\.claude\/(hooks\/|settings\.json$)|\/scripts\/guard-repo\.mjs$/.test(file) && PUBLIC_RE.test(asText)) {
    block(`writing the public Toolshop URL into ${file} is forbidden. Config must point to localhost.`);
  }
  process.exit(0);
}

process.exit(0);
