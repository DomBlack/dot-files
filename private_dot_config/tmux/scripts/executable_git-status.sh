#!/usr/bin/env bash
# gitmux-style status segment for the tmux status line.
# Usage: git-status.sh <directory>   Output: "⎇ main ✚2 ●1 …3 ↑1" with tmux styles.
set -u

dir="${1:-}"
[ -d "$dir" ] || exit 0

key=$(printf '%s' "$dir" | cksum | cut -d' ' -f1)
cache="${TMPDIR:-/tmp}/tmux-git-status-$key"

if [ -f "$cache" ]; then
  now=$(date +%s)
  mtime=$(stat -f %m "$cache" 2>/dev/null || stat -c %Y "$cache" 2>/dev/null || echo 0)
  if [ $(( now - mtime )) -lt 4 ]; then
    cat "$cache"
    exit 0
  fi
fi

out=$(cd "$dir" 2>/dev/null && git status --porcelain=v2 --branch 2>/dev/null | awk '
  $1 == "#" && $2 == "branch.head" { branch = $3 }
  $1 == "#" && $2 == "branch.ab"   { ahead = substr($3, 2); behind = substr($4, 2) }
  $1 == "1" || $1 == "2" {
    if (substr($2, 1, 1) != ".") staged++
    if (substr($2, 2, 1) != ".") modified++
  }
  $1 == "?" { untracked++ }
  $1 == "u" { conflicts++ }
  END {
    if (branch == "") exit
    if (branch == "(detached)") branch = "detached"
    seg = "#[fg=#56b6c2]⎇ " branch
    if (modified)  seg = seg "#[fg=#e5c07b] ✚" modified
    if (staged)    seg = seg "#[fg=#98c379] ●" staged
    if (conflicts) seg = seg "#[fg=#e06c75] ✖" conflicts
    if (untracked) seg = seg "#[fg=#5c5f70] …" untracked
    if (ahead+0)   seg = seg "#[fg=#5c5f70] ↑" ahead
    if (behind+0)  seg = seg "#[fg=#5c5f70] ↓" behind
    printf "%s#[default]  #[fg=#5c5f70]·  ", seg
  }
')

printf '%s' "$out" > "$cache.$$" && mv "$cache.$$" "$cache"
printf '%s' "$out"
