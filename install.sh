#!/usr/bin/env bash
# Bootstrap script for Coder (Linux cloud dev environments).
# Non-interactive and idempotent — safe to re-run.
#
# Required env vars:
#   CHEZMOI_EMAIL          — git commit email (no default, keeps work email out of repo)
#
# Optional env vars:
#   CHEZMOI_IS_WORK_MACHINE — default: true

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ---------------------------------------------------------------------------
# Validate required env vars
# ---------------------------------------------------------------------------
if [ -z "${CHEZMOI_EMAIL:-}" ]; then
  echo "ERROR: CHEZMOI_EMAIL must be set (e.g. export CHEZMOI_EMAIL=you@example.com)"
  exit 1
fi

CHEZMOI_IS_WORK_MACHINE="${CHEZMOI_IS_WORK_MACHINE:-true}"

# ---------------------------------------------------------------------------
# 1. Install chezmoi
# ---------------------------------------------------------------------------
if ! command -v chezmoi &>/dev/null; then
  echo "==> Installing chezmoi..."
  sh -c "$(curl -fsSL get.chezmoi.io)" -- -b ~/.local/bin
  export PATH="$HOME/.local/bin:$PATH"
fi

# ---------------------------------------------------------------------------
# 2. Pre-seed chezmoi config (avoids interactive prompts)
# ---------------------------------------------------------------------------
CHEZMOI_CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/chezmoi"
CHEZMOI_CONFIG_FILE="${CHEZMOI_CONFIG_DIR}/chezmoi.jsonc"

if [ ! -f "$CHEZMOI_CONFIG_FILE" ]; then
  echo "==> Pre-seeding chezmoi config..."
  mkdir -p "$CHEZMOI_CONFIG_DIR"
  cat > "$CHEZMOI_CONFIG_FILE" <<EOF
{
    "data": {
        "email": "${CHEZMOI_EMAIL}",
        "isWorkMachine": ${CHEZMOI_IS_WORK_MACHINE},
    }
}
EOF
fi

# ---------------------------------------------------------------------------
# 3. Run chezmoi init + apply from this local source directory
# ---------------------------------------------------------------------------
echo "==> Running chezmoi init --apply..."
chezmoi init --apply --source="$SCRIPT_DIR"

# ---------------------------------------------------------------------------
# 4. Install fisher + fish plugins
# ---------------------------------------------------------------------------
echo "==> Installing fisher and fish plugins..."
fish -c '
  # Install fisher if not already present
  if not functions -q fisher
    curl -sL https://raw.githubusercontent.com/jorgebucaran/fisher/main/functions/fisher.fish | source
    fisher install jorgebucaran/fisher
  end

  # Install plugins from fish_plugins
  fisher update
'

echo "==> Done! Start a new shell with: exec fish"
