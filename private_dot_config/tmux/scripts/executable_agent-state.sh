#!/usr/bin/env bash
# Stamp AI-agent state onto the tmux window/pane this process runs in.
# Called by Claude Code hooks. Usage: agent-state.sh working|input|done|clear
# Must NEVER fail or block — Claude Code waits on hook exit.
[ -n "${TMUX:-}" ] || exit 0
state="${1:-}"

case "$state" in
  working|input|done|clear)
    [ -n "${TMUX_PANE:-}" ] || exit 0
    ;;
esac

case "$state" in
  working|input|done)
    tmux set-option -w -t "$TMUX_PANE" @agent_state "$state" 2>/dev/null
    tmux set-option -p -t "$TMUX_PANE" @agent_pane_state "$state" 2>/dev/null
    if [ "$state" = "input" ]; then
      # ring the bell in that pane so Ghostty/cmux raise a macOS notification
      tty=$(tmux display-message -p -t "$TMUX_PANE" '#{pane_tty}' 2>/dev/null)
      [ -w "$tty" ] && printf '\a' > "$tty" 2>/dev/null
    fi
    ;;
  clear)
    tmux set-option -w -t "$TMUX_PANE" -u @agent_state 2>/dev/null
    tmux set-option -p -t "$TMUX_PANE" -u @agent_pane_state 2>/dev/null
    ;;
  ack)
    # visiting a window acknowledges a finished agent: clear the window
    # marker and every pane's border marker in the current window
    tmux set-option -w -u @agent_state 2>/dev/null
    for p in $(tmux list-panes -F '#{pane_id}' 2>/dev/null); do
      tmux set-option -p -t "$p" -u @agent_pane_state 2>/dev/null
    done
    ;;
esac
exit 0
