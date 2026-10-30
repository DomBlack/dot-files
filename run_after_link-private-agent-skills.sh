#!/bin/sh
# Clone my private agent skills repo and symlink each of its skills into Claude
# Code (~/.claude/skills) and Codex (~/.agents/skills; it still reads the older
# ~/.codex/skills too), so both agents share one copy that I edit in the repo.
# Runs on every apply so new skills get linked and the clone stays current.
# Machines that can't read my private repos yet (e.g. a fresh devbox before
# GitHub auth) get a warning instead of a failed apply.
set -u

REPO_URL="git@github.com:DomBlack/private-agent-skills.git"
REPO="$HOME/src/github.com/DomBlack/private-agent-skills"
LINK_DIRS="$HOME/.claude/skills $HOME/.agents/skills"

# Fail fast rather than prompting for credentials mid apply
export GIT_TERMINAL_PROMPT=0 GCM_INTERACTIVE=never
export GIT_SSH_COMMAND="ssh -o BatchMode=yes"

if [ ! -d "$REPO/.git" ]; then
  mkdir -p "$(dirname "$REPO")"
  if ! git clone --quiet "$REPO_URL" "$REPO" 2>/dev/null; then
    rm -rf "$REPO"
    echo "WARN: can't clone $REPO_URL (no access to private repos yet?); skipping private agent skills" >&2
    exit 0
  fi
else
  git -C "$REPO" pull --ff-only --quiet 2>/dev/null ||
    echo "WARN: couldn't fast forward $REPO; linking what's checked out" >&2
fi

for dir in $LINK_DIRS; do
  mkdir -p "$dir"

  for skill in "$REPO"/skills/*/; do
    [ -f "$skill/SKILL.md" ] || continue
    skill="${skill%/}"
    target="$dir/$(basename "$skill")"
    if [ -e "$target" ] && [ ! -L "$target" ]; then
      echo "WARN: $target is a real directory, not replacing it with a link to $skill" >&2
      continue
    fi
    ln -sfn "$skill" "$target"
  done

  # Drop links to skills that have since been removed from the repo
  for link in "$dir"/*; do
    [ -L "$link" ] && [ ! -e "$link" ] || continue
    case "$(readlink "$link")" in
    "$REPO"/*) rm "$link" ;;
    esac
  done
done
