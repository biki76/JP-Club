#!/data/data/com.termux/files/usr/bin/bash
cd ~/JP-Club
node tools/gen-status.mjs
if node tools/validate-data.mjs > "$HOME/val.txt" 2>&1; then
  tail -1 "$HOME/val.txt"
  node tools/bump-sw.mjs
  git add -A && git commit -qm "${1:-Content update}" && git push origin main
else
  echo "VALIDATION FAILED:"; tail -15 "$HOME/val.txt"
fi
