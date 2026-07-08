# Terminal frontier adoptions — design

Date: 2026-07-08
Status: approved (user selected items from verified deep-research report)

## Scope (user-selected)

1. **tmux OSC 133 prompt jumping** — copy-mode-vi binds `M-.`/`M-,` for
   next/previous-prompt, `M-o` for next-prompt -o (jump to output); which-key
   menu hint updated. Requires the shell to emit OSC 133;A — verify empirically
   on Mac (fish 4.8) and devbox (fish 3.7); if 3.7 doesn't emit, the binds are
   harmless no-ops there until devboxes get fish 4.
2. **fish transient prompt** — enable starship's native fish 4.1+ transience
   (`enable_transience` after `starship init`), guarded on fish major version
   ≥ 4 rather than OS: today that means macOS only (devbox apt fish is 3.7),
   and it lights up automatically if devboxes ever get fish 4.
3. **Ghostty OSC 9;4 progress** — new fish function `with_progress <cmd…>`:
   emits indeterminate progress (`OSC 9;4;3`) while the command runs, clears
   after, preserves exit status. Command palette (cmd+shift+p) needs no config.
4. **sesh** — zoxide-frecency tmux session manager. brew (mac) + pinned
   external (devbox). Starter `~/.config/sesh/sesh.toml`. tmux `prefix s`
   becomes the sesh fzf popup; `prefix S` keeps the old choose-tree; which-key
   menu updated.
5. **agenttrace** — agent-session observability TUI. Installed via mise's ubi
   backend pinned in the global mise config (`ubi:luoyuctl/agenttrace`) so ONE
   pin covers mac + devboxes. Frontier tool (96⭐) — accepted knowingly.
6. **claude --worktree ergonomics** — fish abbr `cw` → `claude --worktree`
   (isolated-worktree session; pairs with /batch fan-out).

## Rejected (deliberate)

- **workmux**: its add/merge lifecycle owns branches and merges — incompatible
  with the user's Graphite (gt) stacked-PR workflow. Do not adopt; revisit only
  if workmux gains a "no git mutations" mode.
- gwm-cli, citypaul skill-discovery, presenterm: see research report triage.

## Verification

Per item: render/parse checks, live tmux/fish behavior on the Mac, and an
OSC 133 emission test inside tmux (capture-pane -e). sesh popup opened and a
session switch performed. agenttrace binary runs `--version` on mac; devbox
covered on next chezmoi update + mise install. Commits per logical chunk,
pushed at the end.
