# tmux session picker — design

## Problem

`tmux a` silently attaches to the most recently used session even when several
exist, and bare `tmux` silently creates a numbered session instead of asking
whether to attach to an existing one.

## Design

A single fish wrapper function, `private_dot_config/private_fish/functions/tmux.fish`,
named `tmux` (`--wraps tmux` keeps completions) around the real binary:

1. **Pass through untouched** when already inside tmux (`$TMUX` set), the shell
   is non-interactive, sesh/fzf are missing, or any arguments beyond a bare
   attach are given (`tmux kill-server`, `tmux a -t foo`, …). Explicit commands
   are never reinterpreted.
2. **`tmux a` / `at` / `att` / `attach` / `attach-session` with no target** →
   fzf picker over `sesh list --icons` (live sessions listed first, then zoxide
   directories and sesh configs — same source as the `prefix-s` popup), then
   `sesh connect` the choice. Esc cancels quietly.
3. **Bare `tmux`** → if no sessions exist, create one as normal. Otherwise show
   the same picker with a `+ new session (here)` entry at the top, so one
   keystroke either attaches/jumps or creates a fresh session in the current
   directory.

## Decisions

- Picker source is sesh (chosen over plain `tmux ls` because it also offers
  zoxide-frecency directories, and it does list every live tmux session).
- Bare `tmux` uses a picker-with-create-entry rather than an `[a]ttach or
  [n]ew?` text prompt.
- No changes to `tmux.conf` or `sesh.toml`.

## Testing

`fish -n` syntax check; non-interactive and arg'd invocations verified to pass
through to the real binary. Picker paths mirror the already-proven
`tmux/scripts/executable_sesh-picker.sh` (`sesh list --icons | fzf` →
`sesh connect`), which accepts icon-prefixed names.
