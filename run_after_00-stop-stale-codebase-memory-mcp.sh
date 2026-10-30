#!/bin/sh
# When .chezmoiexternal.toml.tmpl upgrades ~/.local/bin/codebase-memory-mcp,
# agent sessions that are already open keep the old version running (its
# daemon plus one server per session). New sessions then can't start the new
# binary next to it, and configure-mcp-servers.sh fails the apply. So stop any
# codebase-memory-mcp process that started before the binary on disk was last
# replaced. Open Claude Code sessions need `/mcp` to reconnect afterwards.
# Named 00- so it sorts ahead of the other after scripts.
set -u

CBM="$HOME/.local/bin/codebase-memory-mcp"
[ -x "$CBM" ] || exit 0

# GNU stat first; BSD (macOS) stat has no -c and falls through to -f
replaced_at=$(stat -c %Y "$CBM" 2>/dev/null || stat -f %m "$CBM")
now=$(date +%s)

stale=""
for pid in $(pgrep -u "$(id -u)" -f "^$CBM" 2>/dev/null); do
  # etime is [[dd-]hh:]mm:ss on both macOS and Linux
  age=$(ps -o etime= -p "$pid" | awk '{
    n = split($1, a, "[-:]")
    s = a[n] + a[n-1] * 60
    if (n >= 3) s += a[n-2] * 3600
    if (n == 4) s += a[1] * 86400
    print s
  }')
  [ -n "$age" ] || continue
  [ $((now - age)) -lt "$replaced_at" ] && stale="$stale $pid"
done

[ -n "$stale" ] || exit 0

echo "codebase-memory-mcp was upgraded; stopping old processes:$stale (run /mcp in open Claude Code sessions to reconnect)" >&2
kill $stale 2>/dev/null
for _ in 1 2 3 4 5; do
  alive=""
  for pid in $stale; do
    kill -0 "$pid" 2>/dev/null && alive="$alive $pid"
  done
  [ -n "$alive" ] || exit 0
  sleep 1
done
kill -9 $alive 2>/dev/null
exit 0
