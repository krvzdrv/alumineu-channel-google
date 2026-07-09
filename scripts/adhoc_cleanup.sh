#!/usr/bin/env bash
# Remove expired docs/adhoc notes (expires: YYYY-MM-DD in frontmatter).
# Canon: alumineu-os/docs/EPHEMERAL_WORK_CANON.md
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/docs/adhoc"
TODAY=$(date +%Y-%m-%d)
removed=0
if [[ ! -d "$DIR" ]]; then
  echo "no docs/adhoc/ — nothing to clean"
  exit 0
fi
shopt -s nullglob
for f in "$DIR"/*; do
  [[ -f "$f" ]] || continue
  base="$(basename "$f")"
  [[ "$base" == "README.md" ]] && continue
  # Prefer frontmatter in .md; for sidecar .csv/.json use matching .md expires
  exp=""
  if [[ "$f" == *.md ]]; then
    exp=$(grep -E '^expires:' "$f" 2>/dev/null | head -1 | sed 's/expires: *//;s/ *$//' || true)
  else
    stem="${base%.*}"
    md="$DIR/${stem}.md"
    if [[ -f "$md" ]]; then
      exp=$(grep -E '^expires:' "$md" 2>/dev/null | head -1 | sed 's/expires: *//;s/ *$//' || true)
    fi
  fi
  if [[ -n "$exp" && "$exp" < "$TODAY" ]]; then
    rm -f "$f"
    echo "removed expired: $base"
    removed=$((removed + 1))
  fi
done
echo "done: $removed file(s) removed (today=$TODAY)"
