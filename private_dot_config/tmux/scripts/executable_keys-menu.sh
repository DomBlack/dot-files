#!/usr/bin/env bash
# Which-key style menu listing the common bindings. Bound to prefix-? and to
# any unbound key in the prefix table, so mistypes teach instead of failing.
exec tmux display-menu -T "#[fg=#56b6c2] tmux · C-Space + key " -x C -y C \
  "-#[fg=#b98aec]── Panes ──"            "" "" \
  "split right"                          "|" "split-window -h -c '#{pane_current_path}'" \
  "split down"                           "-" "split-window -v -c '#{pane_current_path}'" \
  "zoom / fullscreen toggle"             "z" "resize-pane -Z" \
  "jump to pane (then digit)"            "Space" "display-panes" \
  "stash pane away"                      "m" "run-shell '~/.config/tmux/scripts/pane-stash.sh stash'" \
  "restore stashed pane"                 "M" "run-shell '~/.config/tmux/scripts/pane-stash.sh restore'" \
  "kill pane"                            "x" "confirm-before -p 'kill pane? (y/n)' kill-pane" \
  "-#[fg=#5c5f70]h j k l — move · H J K L — resize" "" "" \
  "-#[fg=#b98aec]── Windows ──"          "" "" \
  "new window"                           "c" "new-window -c '#{pane_current_path}'" \
  "next window"                          "n" "next-window" \
  "previous window"                      "p" "previous-window" \
  "rename window"                        "," "command-prompt -I '#W' 'rename-window %%'" \
  "-#[fg=#5c5f70]1-9 — jump to window"   "" "" \
  "-#[fg=#b98aec]── Copy & Session ──"   "" "" \
  "copy mode (vi keys, v/y)"             "[" "copy-mode" \
  "paste"                                "]" "paste-buffer" \
  "sessions"                             "s" "choose-tree -s" \
  "detach"                               "d" "detach-client" \
  "reload config"                        "r" "source-file ~/.config/tmux/tmux.conf"
