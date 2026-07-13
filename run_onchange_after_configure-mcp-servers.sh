#!/bin/sh
# Configure user-scope MCP servers for Claude Code.
# codebase-memory-mcp: binary installed by .chezmoiexternal.toml; auto-index on
# MCP session start, graph visualisation UI (localhost:9749). Its settings live
# in a binary db (~/.cache/codebase-memory-mcp), hence imperative config here
# rather than a chezmoi-managed file.
# context7: hosted server for version-accurate library docs (anonymous rate
# limits; set CONTEXT7_API_KEY via `claude mcp add --header` if they bite).
set -e

PATH="$HOME/.local/bin:/opt/homebrew/bin:$PATH"

if ! command -v claude >/dev/null 2>&1; then
  echo "WARN: claude CLI not found; skipping Claude Code MCP registration" >&2
fi

CBM="$HOME/.local/bin/codebase-memory-mcp"
if [ -x "$CBM" ]; then
  "$CBM" config set auto_index true >/dev/null
  "$CBM" config set ui true >/dev/null
  if command -v claude >/dev/null 2>&1; then
    claude mcp get codebase-memory-mcp >/dev/null 2>&1 ||
      claude mcp add --scope user codebase-memory-mcp "$CBM"
  fi
else
  echo "WARN: $CBM not installed yet; skipping its configuration" >&2
fi

if command -v claude >/dev/null 2>&1; then
  claude mcp get context7 >/dev/null 2>&1 ||
    claude mcp add --transport http --scope user context7 https://mcp.context7.com/mcp
fi
