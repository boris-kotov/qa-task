#!/usr/bin/env node
// Repository guard: protects against the disqualifying mistakes from the task.
// Usage:
//   node scripts/guard-repo.mjs --staged   (git pre-commit hook)
//   node scripts/guard-repo.mjs --all      (npm run guard, before submission)
import { execSync } from 'node:child_process';
import { readFileSync, statSync, existsSync } from 'node:fs';
import { homedir, userInfo } from 'node:os';

const mode = process.argv.includes('--all') ? 'all' : 'staged';
// Host references only; demo e-mails (user@<domain>) are fine.
const DOMAIN_RE = new RegExp(`(^|[^a-z0-9@.-])([a-z0-9-]+\\.)*${['practicesoftwaretesting', 'com'].join('\\.')}`, 'i');
const MAX_BYTES = 50 * 1024 * 1024;

const git = (cmd) => execSync(`git ${cmd}`, { encoding: 'utf8' }).split('\n').filter(Boolean);
const files = mode === 'all'
  ? git('ls-files')
  : git('diff --cached --name-only --diff-filter=ACMR');

const errors = [];
const fail = (file, msg) => errors.push(`  ✗ ${file}: ${msg}`);

// Values that must never land in ai_sessions/ unredacted.
const personal = [homedir(), userInfo().username].filter((v) => v && v.length > 2);
try { personal.push(execSync('git config user.email', { encoding: 'utf8' }).trim()); } catch { /* not set */ }
if (existsSync('.redact.local')) {
  for (const line of readFileSync('.redact.local', 'utf8').split('\n')) {
    const value = line.split('|')[0].trim();
    if (value && !value.startsWith('#')) personal.push(value);
  }
}

const read = (file) => {
  if (mode === 'staged') {
    try { return execSync(`git show :"${file}"`, { encoding: 'utf8', maxBuffer: 200 * 1024 * 1024 }); } catch { return ''; }
  }
  return existsSync(file) ? readFileSync(file, 'utf8') : '';
};

for (const file of files) {
  const base = file.split('/').pop();

  // Secrets
  if (/^\.env(\..+)?$/.test(base) && base !== '.env.example') fail(file, '.env files must not be committed (only .env.example).');

  // Private/source materials of the assignment
  if (['task.pdf', 'hr-task.png', 'LLM-CODEGEN-RULEBOOK.md', '.redact.local'].includes(base)) fail(file, 'private material, keep it out of the repo.');
  if (/(^|\/)\.ssh\//.test(file) || /^id_(rsa|ed25519|ecdsa)(\.pub)?$/.test(base) || /\.(pem|key|p12)$/.test(base)) fail(file, 'SSH key / certificate must not be committed.');

  // Application sources (license forbids redistribution)
  if (/^(sprint\d[^/]*|_docker|_user-stories|API|UI)\//.test(file) || /\.php$/.test(file) || ['artisan', 'angular.json', 'composer.json', 'docker-compose.prod.yml'].includes(base)) {
    fail(file, 'looks like Toolshop application source. Do not copy app code; use app-changes/*.patch.');
  }

  if (existsSync(file) && statSync(file).size > MAX_BYTES) fail(file, 'file > 50 MB: attach as a link (see task).');

  const isText = /\.(ts|js|mjs|cjs|json|ya?ml|sh|md|txt|html|jsonl|example)$/i.test(file) || base === '.env.example';
  if (!isText) continue;
  const content = read(file);

  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(content)) fail(file, 'contains a private key.');

  const inSessions = file.startsWith('ai_sessions/');

  // Project language is English (CLAUDE.md §0). Original transcripts in ai_sessions/ are exempt.
  if (!inSessions && /\p{Script=Cyrillic}/u.test(content)) fail(file, 'contains Cyrillic text: project files must be in English (use \\u escapes for test data).');
  const isDoc = /\.md$/i.test(file) || inSessions || file.startsWith('reports/') || file.startsWith('.claude/') || file === 'scripts/guard-repo.mjs';

  // Public stand in code/config
  if (!isDoc && DOMAIN_RE.test(content)) fail(file, 'references the PUBLIC Toolshop stand. Only localhost is allowed.');

  // Copied app files carry Testsmith copyright header
  if (!inSessions && !file.startsWith('app-changes/') && !/\.md$/i.test(file) && /Copyright \(c\) \d{4}(-\d{4})? Testsmith/.test(content)) {
    fail(file, 'contains Testsmith copyright header: application code must not be copied.');
  }

  // Focused tests
  if (/^(tests|src)\//.test(file) && /\b(test|it|describe)\.only\s*\(/.test(content)) fail(file, '.only() left in tests.');

  // Unredacted personal data in session exports
  if (inSessions) {
    for (const value of personal) {
      if (content.includes(value)) { fail(file, `unredacted personal value (${value.slice(0, 3)}…). Run npm run sessions:redact.`); break; }
    }
    if (/sk-ant-[A-Za-z0-9_-]{10,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}/.test(content)) fail(file, 'looks like an API token.');
  }
}

if (errors.length) {
  console.error(`\nguard-repo (${mode}): ${errors.length} problem(s)\n${errors.join('\n')}\n`);
  process.exit(1);
}
console.log(`guard-repo (${mode}): OK, ${files.length} file(s) checked.`);
