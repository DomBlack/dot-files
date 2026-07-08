#!/usr/bin/env bash
# Stash the current pane into a hidden 'stash' window; restore the most recent.
# Usage: pane-stash.sh stash|restore
set -eu

cmd="${1:-stash}"

case "$cmd" in
  stash)
    win_name=$(tmux display-message -p '#{window_name}')
    if [ "$win_name" = "stash" ]; then
      tmux display-message "already in the stash window"
      exit 0
    fi
    panes=$(tmux display-message -p '#{window_panes}')
    windows=$(tmux display-message -p '#{session_windows}')
    if [ "$panes" = "1" ] && [ "$windows" = "1" ]; then
      tmux display-message "cannot stash the only pane"
      exit 0
    fi
    if tmux list-windows -F '#{window_name}' | grep -qx 'stash'; then
      tmux join-pane -d -t ':stash'
    else
      tmux break-pane -d -n stash
    fi
    ;;
  restore)
    last=$(tmux list-panes -t ':stash' -F '#{pane_id}' 2>/dev/null | tail -1 || true)
    if [ -z "$last" ]; then
      tmux display-message "no stashed panes"
      exit 0
    fi
    win_name=$(tmux display-message -p '#{window_name}')
    if [ "$win_name" = "stash" ]; then
      # If we're in the stash window, break the pane into a new window.
      # break-pane -n pins the name and disables automatic-rename; turn it
      # back on so the new window renames itself to its command.
      tmux select-pane -t "$last"
      new_win=$(tmux break-pane -d -n restored -P -F '#{window_id}')
      tmux set-option -w -t "$new_win" automatic-rename on 2>/dev/null || true
    else
      # Otherwise, join to the current window
      tmux join-pane -h -s "$last"
    fi
    ;;
  *)
    echo "usage: pane-stash.sh stash|restore" >&2
    exit 1
    ;;
esac
