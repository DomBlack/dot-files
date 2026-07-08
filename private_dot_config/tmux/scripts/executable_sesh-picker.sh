#!/bin/sh
# fzf popup for sesh (zoxide-frecency tmux session jumping). Bound to prefix-s.
PATH="$HOME/.local/bin:/opt/homebrew/bin:$PATH"
selected="$(sesh list --icons | fzf --no-border --ansi --prompt '⚡ sessions > ')" || exit 0
[ -n "$selected" ] && exec sesh connect "$selected"
