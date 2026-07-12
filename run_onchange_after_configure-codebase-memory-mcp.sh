#!/bin/sh
# Configure codebase-memory-mcp (binary installed by .chezmoiexternal.toml):
# auto-index on MCP session start, graph visualisation UI (localhost:9749),
# and user-scope MCP registration with Claude Code.
set -e

PATH="$HOME/.local/bin:/opt/homebrew/bin:$PATH"

CBM="$HOME/.local/bin/codebase-memory-mcp"
if [ ! -x "$CBM" ]; then
  echo "WARN: $CBM not installed yet; skipping configuration" >&2
  exit 0
fi

"$CBM" config set auto_index true >/dev/null
"$CBM" config set ui true >/dev/null

# Settings live in a binary db (~/.cache/codebase-memory-mcp), so registration
# is imperative here rather than a chezmoi-managed file
if command -v claude >/dev/null 2>&1; then
  claude mcp get codebase-memory-mcp >/dev/null 2>&1 ||
    claude mcp add --scope user codebase-memory-mcp "$CBM"
else
  echo "WARN: claude CLI not found; skipping Claude Code MCP registration" >&2
fi
