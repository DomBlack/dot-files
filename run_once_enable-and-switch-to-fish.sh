#!/bin/sh
set -e

FISH="$(command -v fish || true)"
[ -n "$FISH" ] || exit 0

# Ensure fish is listed in /etc/shells
if ! grep -Fxq "$FISH" /etc/shells; then
  printf '%s\n' "$FISH" | sudo tee -a /etc/shells >/dev/null
fi

# Switch login shell if not already fish
[ "$SHELL" = "$FISH" ] || chsh -s "$FISH"
