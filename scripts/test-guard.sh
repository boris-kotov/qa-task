#!/usr/bin/env bash
# Self-test for .claude/hooks/guard.mjs (PreToolUse hook). Run: bash scripts/test-guard.sh
cd "$(dirname "$0")/.."
D="practicesoftwaretesting"; H=.claude/hooks/guard.mjs; fails=0
t() {
  printf '%s' "$2" | node "$H" >/dev/null 2>&1; code=$?
  if [[ $code -eq $1 ]]; then echo "ok   ($code) $3"; else echo "FAIL (got $code, want $1) $3"; fails=1; fi
}
j() { printf '{"tool_name":"%s","tool_input":%s}' "$1" "$2"; }

t 2 "$(j Bash "{\"command\":\"curl https://api.$D.com/products\"}")" "curl to public API is blocked"
t 2 "$(j Bash "{\"command\":\"docker compose -f docker-compose.prod.yml up -d\"}")" "prebuilt (prod) images are blocked"
t 2 "$(j Bash '{"command":"cp -r ../toolshop-app/sprint5/UI ./ui"}')" "copying app sources is blocked"
t 2 "$(j Bash '{"command":"git push --force origin main"}')" "force push is blocked"
t 2 "$(j Bash '{"command":"git add -f .env"}')" "force-adding ignored files is blocked"
t 2 "$(j WebFetch "{\"url\":\"https://www.$D.com\"}")" "WebFetch to public stand is blocked"
t 2 "$(j mcp__playwright__browser_navigate '{"url":"https://example.org"}')" "MCP browser to non-localhost is blocked"
t 2 "$(j mcp__playwright__browser_navigate "{\"url\":\"https://$D.com\"}")" "MCP browser to public stand is blocked"
t 2 "$(j Write "{\"file_path\":\"/r/playwright.config.ts\",\"content\":\"baseURL: 'https://$D.com'\"}")" "public URL in code is blocked"
t 2 "$(j Write '{"file_path":"/r/.env","content":"A=1"}')" "writing .env is blocked"
t 0 "$(j mcp__playwright__browser_navigate '{"url":"http://localhost:4200/#/checkout"}')" "MCP browser to localhost is allowed"
t 0 "$(j Write "{\"file_path\":\"/r/src/data.ts\",\"content\":\"email: 'customer@$D.com'\"}")" "demo e-mail in code is allowed"
t 0 "$(j Write "{\"file_path\":\"/r/TEST_PLAN.md\",\"content\":\"https://$D.com is NOT used\"}")" "mentioning the domain in docs is allowed"
t 0 "$(j Bash '{"command":"docker compose up -d"}')" "source build is allowed"
t 0 "$(j Bash '{"command":"cd ../toolshop-app && git diff > ../qa-task/app-changes/fix.patch"}')" "saving a patch is allowed"
exit $fails
