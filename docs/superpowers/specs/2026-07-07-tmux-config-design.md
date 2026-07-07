# tmux configuration — design

Date: 2026-07-07
Status: approved pending user review

## Goal

A pretty, easy-to-learn tmux setup managed by chezmoi, deployed identically to the
Mac and to remote dev boxes (the primary use: tmux runs on the devboxes for session
persistence; Ghostty/cmux on the Mac is the window onto it). Design was iterated
visually with mockups; all choices below are user-approved.

## Design decisions (locked)

| Area | Decision |
|---|---|
| Visual direction | Minimal/transparent bar (option B), no background color, matches translucent Ghostty + starship aesthetic |
| Accent color | Cyan (active window index, active pane border, git branch, popup border) |
| Mode indicator | Subtle dot before session name: amber ● prefix held, cyan ● copy mode |
| Prefix | C-Space |
| Digits after prefix | Windows (classic tmux); pane jump is `prefix Space` + badge digit |
| Key learning | Which-key style popup via native `display-menu`; opens on `prefix ?` **and** on any unbound key after prefix |
| Pane info | Border labels only when window is split: command · directory · agent state |
| Git status | gitmux-style counts for the active pane's repo: `⎇ main ✚2 ●1 …3 ↑1`, symbols hidden when zero, branch cyan when clean |
| Agent interop | 3 states on window entries: amber ✳ working, red ✳ needs input, green ✓ done (clears on window focus). Hook-driven, no polling |
| Hostname | Red, next to purple session name, rendered only on remote boxes (chezmoi `isRemoteDevBox` template var) |
| Spacing | Roomy: gap after session/host cluster, wide inter-window gaps, space between index and name |
| Mouse | On: click to focus/switch, drag borders to resize, wheel scrollback, double-click border = zoom |
| Zoom / minimise | `prefix z` zoom (⛶ marker in bar); `prefix m` stash pane to hidden "stash" window (dim `▸ stash (n)` entry), `prefix M` restore most recent |
| Plugins | None — no TPM. Everything native tmux 3.5 + two small shell scripts |

## Status line layout

```
● api · devbox-1     1 vim   2 claude ✳   3 codex ✓        ⎇ main ✚2 ●1 …3 ↑1  ·  14:32
└┬┘ └┬┘   └──┬───┘   └──────────┬──────────────┘           └────────┬────────┘     └┬┘
mode session hostname       window list                     git (active pane)     clock
dot  purple  red(remote     cmd name, cyan index when                cyan/amber    dim
             only)          active, agent glyphs
```

Colors (chosen to sit on any dark bg): purple #b98aec session, red #e06c75 host,
cyan #56b6c2 accent, amber #e5c07b dirty/prefix, green #98c379 staged/done,
dim #5c5f70 inactive.

## Components

### 1. `private_dot_config/tmux/tmux.conf.tmpl`

Single templated config. Sections: terminal features, general defaults, prefix +
keybindings, mouse, copy mode, status line formats, pane borders, hooks, popup menu
binding. Chezmoi templating used only for: hostname segment (`isRemoteDevBox`) and
any machine-specific paths.

Terminal plumbing (Ghostty + cmux interop):

- `default-terminal "tmux-256color"`; `terminal-features` RGB, undercurl, extended keys
- `set -g set-clipboard on` (OSC 52 — copies land on the Mac clipboard over SSH)
- `focus-events on`, `extended-keys on`
- `set-titles on` with `#S · #W` so cmux/Ghostty tabs are identifiable
- bell: `visual-activity off`, `monitor-bell on` — agent needs-input rings the bell,
  which Ghostty/cmux surface as a macOS notification

Quality-of-life defaults: `base-index 1`, `pane-base-index 1`, `renumber-windows on`,
`history-limit 100000`, `escape-time 0`, `aggressive-resize on`, `status-interval 5`,
vi copy mode (`v` select, `y` yank), splits `|`/`-` open in current pane's path,
`hjkl` pane navigation, `r` reloads config with a confirmation message.

Prefix behavior: pressing C-Space also flashes pane number badges
(`display-panes -b`, short duration) so the `prefix Space` pane jump always has a
visible target. Implementation approach: root-table binding that runs
`display-panes -b -d 800` then `switch-client -T prefix` (verify `client_prefix`
still drives the mode dot; if not, key off `#{==:#{client_key_table},prefix}`).

### 2. `private_dot_config/tmux/scripts/git-status.sh`

Prints the gitmux-style segment for a directory passed as `$1`
(invoked as `#(.../git-status.sh "#{pane_current_path}")`).

- Uses a single `git status --porcelain=v2 --branch` call
- Caches output per-repo in `$XDG_RUNTIME_DIR`/`/tmp` with a ~4s TTL so status
  redraws never fork git repeatedly; tmux re-runs it immediately when the active
  pane's path changes (command string changes), giving instant updates on
  window/pane switch
- Output: `⎇ <branch>` cyan when clean; when dirty: amber `✚n` modified, green `●n`
  staged, dim `…n` untracked, dim `↑n ↓n` ahead/behind — each omitted when zero
- Empty output outside a git repo

### 3. Agent state: hooks + `private_dot_config/tmux/scripts/agent-state.sh`

- Claude Code hooks (added to chezmoi-managed `~/.claude/settings.json`):
  `UserPromptSubmit`/`PreToolUse` → working; `Notification` (permission/idle) →
  needs-input; `Stop` → done. Each hook stamps the state onto the tmux window the
  agent runs in: `tmux set -w @agent_state <state>` (no-op when `$TMUX` unset)
- Codex: same states via its `notify` hook if configured; otherwise falls back to
  command-name detection (`pane_current_command` in {claude,codex,node…} shows a
  neutral ✳)
- Window format renders `@agent_state`: amber ✳ working, red ✳ + bell needs-input,
  green ✓ done; a `window-pane-changed`/`client-session-changed` hook clears `done`
  when the window gains focus
- Pane border label shows the same state with a word (`✳ working`) when split

### 4. Which-key popup

Native `display-menu` (tmux ≥3.4), no plugin. Categories: Panes (split, zoom,
stash/restore, jump, hjkl), Windows (new, jump, next/prev, kill), Copy & Session
(copy mode, detach, session chooser, reload). Bound at `prefix ?`; additionally
`bind -T prefix Any` opens the menu so mistyped prefix keys teach instead of
failing silently. Menu entries execute the real command when selected.

### 5. Minimise / restore

- `prefix m`: `break-pane -d` into a window named `stash` at index 99 (created on
  demand, reused for subsequent stashes — panes accumulate there)
- `prefix M`: `join-pane` the most recent stash pane back into the current window
- `stash` window entry styled dim as `▸ stash (n)` (pane count); agent glyphs still
  render on it; window disappears when empty
- Window format for zoomed panes appends dim `⛶`

### 6. Starship interop

- Refactor `private_dot_config/starship.toml` into a chezmoi template include
  (`.chezmoitemplates/starship-base`) rendering two targets from one source:
  `starship.toml` (unchanged content) and `starship-tmux.toml` (identical, with
  `git_branch`, `git_status`, `git_state`, `git_metrics` disabled and removed from
  `format`)
- Fish (`conf.d/starship-tmux.fish`): if `$TMUX` is set, `set -gx STARSHIP_CONFIG
  ~/.config/starship-tmux.toml`
- Existing `starship-goland.toml` untouched

### 7. Repo housekeeping

- `.chezmoiignore`: add `docs` (spec directory must not be applied to `$HOME`)
- Repo `.gitignore`: add `.superpowers/` (visual-companion artifacts)
- Homebrew Brewfile template: add `brew "tmux"` for the Mac. Neither provisioning
  path installs tmux today: `install.sh` (Coder devboxes) gains a best-effort
  `apt-get install -y tmux` when missing (warn and continue if no sudo)

## Error handling

- git-status.sh: exits silently (empty segment) on any git error, timeout guard via
  cache; never blocks the status redraw
- Agent hooks: guarded by `[ -n "$TMUX" ]`; failures are silent no-ops so Claude
  Code is never disrupted
- Config must degrade gracefully on stock terminals (no PragmataPro): glyphs used
  (⎇ ✳ ✓ ⛶ ● ▸ …) are plain Unicode, not Nerd-Font private-use codepoints

## Testing

- `tmux -f <rendered conf> -L test new -d` on both a chezmoi-rendered Mac config and
  a devbox-rendered one (`chezmoi execute-template` with `isRemoteDevBox=true`)
  to confirm both variants parse
- Manual checklist: prefix dot, copy dot, pane badges on prefix, popup on `?` and on
  unbound key, split labels, zoom marker, stash/restore round-trip, mouse actions,
  OSC 52 copy over SSH, git segment on clean/dirty repo and non-repo, agent states
  by running a real Claude Code session, done-clears-on-focus
- Starship: prompt inside tmux shows no git; outside tmux unchanged

## Out of scope

- tmux plugin manager, session persistence (resurrect/continuum) — revisit later if wanted
- cmux-side config changes (its config surface is just shortcuts today)
- Status bar CPU/RAM/battery/date segments — researched, deliberately excluded
