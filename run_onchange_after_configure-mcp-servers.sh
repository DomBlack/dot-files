#!/bin/sh
# Configure user-scope MCP servers for Claude Code and Codex CLI.
# codebase-memory-mcp: binary installed by .chezmoiexternal.toml; auto-index on
# MCP session start, graph visualisation UI (localhost:9749). Its settings live
# in a binary db (~/.cache/codebase-memory-mcp), hence imperative config here
# rather than a chezmoi-managed file.
# context7: hosted server for version-accurate library docs (anonymous rate
# limits; add an API key header via `claude mcp add --header` /
# `codex mcp add --bearer-token-env-var` if they bite).
set -e

PATH="$HOME/.local/bin:/opt/homebrew/bin:$PATH"

CBM="$HOME/.local/bin/codebase-memory-mcp"
CTX7_URL="https://mcp.context7.com/mcp"

if [ -x "$CBM" ]; then
  "$CBM" config set auto_index true >/dev/null
  "$CBM" config set ui true >/dev/null
else
  echo "WARN: $CBM not installed yet; skipping its configuration" >&2
fi

if command -v claude >/dev/null 2>&1; then
  if [ -x "$CBM" ]; then
    claude mcp get codebase-memory-mcp >/dev/null 2>&1 ||
      claude mcp add --scope user codebase-memory-mcp "$CBM"
  fi
  claude mcp get context7 >/dev/null 2>&1 ||
    claude mcp add --transport http --scope user context7 "$CTX7_URL"
else
  echo "WARN: claude CLI not found; skipping Claude Code MCP registration" >&2
fi

if command -v codex >/dev/null 2>&1; then
  if [ -x "$CBM" ]; then
    codex mcp get codebase-memory-mcp >/dev/null 2>&1 ||
      codex mcp add codebase-memory-mcp -- "$CBM"
  fi
  # `codex mcp add --url` blocks on an interactive OAuth flow on headless
  # machines, so append the TOML entry directly; context7 works anonymously
  # (`codex mcp login context7` to authenticate later if desired)
  if ! grep -q '^\[mcp_servers\.context7\]' "$HOME/.codex/config.toml" 2>/dev/null; then
    printf '\n[mcp_servers.context7]\nurl = "%s"\n' "$CTX7_URL" >>"$HOME/.codex/config.toml"
  fi
else
  echo "WARN: codex CLI not found; skipping Codex MCP registration" >&2
fi
