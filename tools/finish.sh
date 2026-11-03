#!/usr/bin/env bash
set -euo pipefail

MSG="${1:-chore: update}"

# 1. Version bump
if [[ -f VERSION ]]; then
  CUR="$(cat VERSION)"
  NUM="${CUR#v}"
  if [[ "$NUM" =~ ^[0-9]+$ ]]; then
    NEXT="v$((NUM + 1))"
    echo "$NEXT" > VERSION
    echo "VERSION: $CUR -> $NEXT"
    MSG="$MSG ($NEXT)"
  fi
fi

# 2. Commit locally
git add -A
if ! git diff --cached --quiet; then
  git commit -m "$MSG"
else
  echo "No changes to commit."
fi

# 3. Sync with remote (rebase our commit(s) on top)
echo "Syncing with origin/main…"
git pull --rebase --autostash origin main || {
  echo "Rebase conflict. Resolve, then: git add <files> && git rebase --continue && git push origin main"
  exit 1
}

# 4. Push
echo "Pushing to origin/main…"
git push origin main

echo "Done: $MSG"
