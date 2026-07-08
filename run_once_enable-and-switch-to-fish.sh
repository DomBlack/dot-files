#!/bin/sh
set -e

FISH="$(command -v fish || true)"
[ -n "$FISH" ] || exit 0

# Login shell from the user database — $SHELL lies inside subshells
case "$(uname)" in
  Darwin) CURRENT_SHELL="$(dscl . -read "/Users/$(whoami)" UserShell 2>/dev/null | awk '{print $2}')" ;;
  *)      CURRENT_SHELL="$(getent passwd "$(whoami)" | cut -d: -f7)" ;;
esac
[ "$CURRENT_SHELL" = "$FISH" ] && exit 0

# Ensure fish is listed in /etc/shells (needs sudo; skip quietly if unavailable)
if ! grep -Fxq "$FISH" /etc/shells; then
  if sudo -n true 2>/dev/null; then
    printf '%s\n' "$FISH" | sudo tee -a /etc/shells >/dev/null
  else
    echo "WARN: cannot add fish to /etc/shells (no passwordless sudo); skipping shell switch" >&2
    exit 0
  fi
fi

# Switch login shell
if [ "$(uname)" = "Linux" ] && [ "$(whoami)" = "devuser" ]; then
  sudo -n chsh -s "$FISH" devuser || echo "WARN: chsh failed" >&2
else
  chsh -s "$FISH" || echo "WARN: chsh failed (may need interactive password)" >&2
fi
