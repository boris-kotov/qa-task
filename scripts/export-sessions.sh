#!/usr/bin/env bash
# Copies FULL Claude Code transcripts (JSONL, incl. subagents and tool results) into ai_sessions/
# and redacts personal values. /export (txt) collapses tool outputs, so JSONL is the complete source.
#
# Usage: npm run sessions:export        (copy + redact)
#        npm run sessions:redact        (redact only, e.g. after adding a manual /export file)
#
# Extra values to redact: .redact.local (gitignored), one per line: "<value>|<label>".
set -euo pipefail
cd "$(dirname "$0")/.."
REPO_DIR="$(pwd)"
OUT="ai_sessions/claude-code"
REPORT="ai_sessions/REDACTIONS.md"

if [[ "${1:-}" != "--redact-only" ]]; then
  SLUG="$(printf '%s' "$REPO_DIR" | sed 's#[/.]#-#g')"
  SRC="$HOME/.claude/projects/$SLUG"
  [[ -d "$SRC" ]] || { echo "No transcripts at $SRC"; exit 1; }
  mkdir -p "$OUT"
  # -a keeps timestamps; subagent transcripts live in nested folders
  rsync -a --include='*/' --include='*.jsonl' --include='*.json' --include='*.txt' --exclude='*' "$SRC/" "$OUT/"
  echo "Copied transcripts from Claude project folder -> $OUT"
fi

# Build redaction list: longest values first so substrings don't break longer matches.
RULES="$(mktemp)"
{
  printf '%s|%s\n' "$HOME" "home path"
  printf '%s|%s\n' "$(id -un)" "OS username"
  email="$(git config user.email || true)"; [[ -n "$email" ]] && printf '%s|%s\n' "$email" "email"
  [[ -f .redact.local ]] && grep -v '^\s*#' .redact.local | grep -v '^\s*$' || true
} | awk -F'|' '{ print length($1) "\t" $0 }' | sort -rn | cut -f2- | awk -F'|' '!seen[$1]++' > "$RULES"

echo "# Redactions in ai_sessions/" > "$REPORT"
echo "" >> "$REPORT"
echo "Values replaced with \`<REDACTED: label>\` (value itself not listed). Messages and tool calls were not deleted." >> "$REPORT"
echo "" >> "$REPORT"
echo "| Label | Occurrences replaced |" >> "$REPORT"
echo "|---|---|" >> "$REPORT"

while IFS='|' read -r value label; do
  [[ -z "$value" ]] && continue
  count=$(grep -rFoi -- "$value" ai_sessions --include='*.jsonl' --include='*.json' --include='*.txt' --include='*.md' --include='*.html' 2>/dev/null | grep -v "^$REPORT" | wc -l | tr -d ' ' || true)
  if [[ "$count" -gt 0 ]]; then
    find ai_sessions -type f \( -name '*.jsonl' -o -name '*.json' -o -name '*.txt' -o -name '*.md' -o -name '*.html' \) ! -path "$REPORT" -print0 |
      V="$value" L="$label" xargs -0 perl -pi -e 's/\Q$ENV{V}\E/<REDACTED: $ENV{L}>/gi'
  fi
  echo "| $label | $count |" >> "$REPORT"
done < "$RULES"
rm -f "$RULES"

# Aggregate rows by label
{ head -6 "$REPORT"; tail -n +7 "$REPORT" | perl -ne 'if (/^\| (.+?) \| (\d+) \|$/) { $s{$1} += $2 } END { printf "| %s | %d |\n", $_, $s{$_} for sort keys %s }'; } > "$REPORT.tmp" && mv "$REPORT.tmp" "$REPORT"

# JSONL must stay valid after redaction
bad=0
while IFS= read -r -d '' f; do
  if ! jq -c . "$f" >/dev/null 2>&1; then echo "Invalid JSON after redaction: $f"; bad=1; fi
done < <(find "$OUT" -name '*.jsonl' -print0 2>/dev/null)
[[ $bad -eq 0 ]] || exit 1

echo "Redaction done, summary in $REPORT. Now run: npm run guard"
