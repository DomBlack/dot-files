# tmux Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A chezmoi-managed tmux config: minimal transparent status line with agent-state markers, C-Space prefix with which-key popup, pane border labels, gitmux-style git segment, and starship interop.

**Architecture:** One templated `tmux.conf.tmpl` plus four small shell scripts under `~/.config/tmux/scripts/`. No plugin manager. Claude Code hooks are merged into the live `~/.claude/settings.json` via a chezmoi `modify_` script. Starship is refactored into a shared chezmoi template rendering two configs (normal + git-less tmux variant).

**Tech Stack:** tmux 3.5, bash, chezmoi templates (Go text/template), python3 (modify script), fish, starship.

**Spec:** `docs/superpowers/specs/2026-07-07-tmux-config-design.md` — read it first; all visual/UX decisions there are locked.

## Global Constraints

- tmux ≥ 3.4 required (pane user options, `set -wF`, `display-menu`, `display-panes -b -d`, `Any` key).
- Palette (hardcode these exact hex values): purple `#b98aec` session, red `#e06c75` host/needs-input, cyan `#56b6c2` accent, amber `#e5c07b` prefix-dot/dirty/working, green `#98c379` staged/done, dim `#5c5f70` inactive text, border `#33364a`.
- Glyphs must be plain Unicode (no Nerd Font private-use codepoints): `⎇ ✳ ✓ ⛶ ● ▸ … ↑ ↓ ✚`.
- No tmux plugins / TPM. Scripts must be POSIX-ish bash, silent-fail (never block a status redraw, never break a Claude session).
- tmux format gotcha: commas inside `#{?cond,a,b}` branches must be escaped `#,`. Avoid this entirely by never writing multi-attribute style blocks inside conditionals — chain single-attribute blocks instead (`#[fg=#e06c75]#[bold]`, not `#[fg=#e06c75,bold]`).
- Repo commits go straight to `main` (matching repo history). Every commit message ends with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Testing uses throwaway tmux servers (`tmux -L cfgtest …`) and rendered configs in `/tmp` — do NOT run `chezmoi apply` until the final task.
- Render templates for testing with:
  - Local variant: `chezmoi execute-template < FILE.tmpl > /tmp/out` (uses real local data, `isRemoteDevBox=false`)
  - Devbox variant: `chezmoi execute-template --init --promptString "What is your email address=x@y.z" --promptBool "Is this a work machine=true,Is this a remote dev box=true" < FILE.tmpl > /tmp/out`

## File Structure

```
private_dot_config/tmux/tmux.conf.tmpl                      # main config (template: hostname segment, homeDir)
private_dot_config/tmux/scripts/executable_git-status.sh    # cached git segment for status-right
private_dot_config/tmux/scripts/executable_agent-state.sh   # called by Claude Code hooks; stamps @agent_state
private_dot_config/tmux/scripts/executable_keys-menu.sh     # which-key display-menu (bound to ? and Any)
private_dot_config/tmux/scripts/executable_pane-stash.sh    # stash/restore panes to hidden window
private_dot_claude/modify_settings.json                     # merges agent hooks into live ~/.claude/settings.json
.chezmoitemplates/starship.toml                             # shared starship base (param: .tmuxVariant)
private_dot_config/starship.toml.tmpl                       # replaces starship.toml; renders base
private_dot_config/starship-tmux.toml.tmpl                  # git-less variant for use inside tmux
private_dot_config/private_fish/conf.d/starship-tmux.fish   # sets STARSHIP_CONFIG inside tmux
run_onchange_before_install-packages-darwin.sh.tmpl         # + brew "tmux"
install.sh                                                  # + best-effort apt install tmux on devboxes
```

---

### Task 1: Core tmux config — terminal plumbing, defaults, prefix, keys, mouse

**Files:**
- Create: `private_dot_config/tmux/tmux.conf.tmpl`

**Interfaces:**
- Produces: the config file later tasks append to; C-Space enters the `prefix` key table via `switch-client -T prefix` (so mode detection everywhere must use `#{==:#{client_key_table},prefix}`, NOT `#{client_prefix}`); scripts dir convention `~/.config/tmux/scripts/`.

- [ ] **Step 1: Write the config**

Create `private_dot_config/tmux/tmux.conf.tmpl`:

```tmux
# ============================================================================
# tmux configuration — managed by chezmoi
# Design spec: docs/superpowers/specs/2026-07-07-tmux-config-design.md
# ============================================================================

# ── Terminal plumbing (Ghostty / cmux interop) ─────────────────────────────
set -g default-terminal "tmux-256color"
set -ga terminal-features ",xterm-ghostty:RGB:usstyle:extkeys:clipboard:title"
set -ga terminal-features ",xterm-256color:RGB"
set -g set-clipboard on          # OSC 52 — copies land on the Mac clipboard over SSH
set -g allow-passthrough on      # let apps inside tmux emit OSC sequences
set -g focus-events on
set -g extended-keys on
set -g set-titles on
set -g set-titles-string "#S · #W"

# ── Quality of life ─────────────────────────────────────────────────────────
set -g base-index 1
setw -g pane-base-index 1
set -g renumber-windows on
set -g history-limit 100000
set -s escape-time 0             # no ESC lag in vim
setw -g aggressive-resize on
set -g status-interval 5
set -g mouse on
set -g monitor-bell on           # agent needs-input rings the bell → terminal notification
set -g visual-bell off
set -g bell-action any
setw -g mode-keys vi
set -g display-panes-time 800
setw -g automatic-rename on
setw -g automatic-rename-format "#{pane_current_command}"

# ── Prefix: C-Space ─────────────────────────────────────────────────────────
# prefix is None + a root-table binding so that pressing C-Space can ALSO
# flash pane number badges (display-panes -b). All default prefix-table
# bindings (0-9 select-window, etc.) still exist and work.
set -g prefix None
bind -n C-Space { display-panes -b -d 800 ; switch-client -T prefix }
bind C-Space send-keys C-Space   # nested tmux: C-Space C-Space sends the key through

# ── Keybindings ─────────────────────────────────────────────────────────────
bind | split-window -h -c "#{pane_current_path}"
bind - split-window -v -c "#{pane_current_path}"
bind c new-window -c "#{pane_current_path}"
bind h select-pane -L
bind j select-pane -D
bind k select-pane -U
bind l select-pane -R
bind -r H resize-pane -L 5
bind -r J resize-pane -D 5
bind -r K resize-pane -U 5
bind -r L resize-pane -R 5
bind z resize-pane -Z
bind Space display-panes         # blocking: press the badge digit to jump to that pane
bind x confirm-before -p "kill pane? (y/n)" kill-pane
bind r source-file ~/.config/tmux/tmux.conf \; display-message "config reloaded"
bind d detach-client
bind s choose-tree -s

# Mouse extras
bind -n DoubleClick1Border resize-pane -Z -t "{mouse}"

# ── Copy mode (vi) ──────────────────────────────────────────────────────────
bind [ copy-mode
bind -T copy-mode-vi v send -X begin-selection
bind -T copy-mode-vi y send -X copy-selection-and-cancel
bind -T copy-mode-vi Escape send -X cancel
```

- [ ] **Step 2: Render both template variants**

```bash
cd /Users/dom/.local/share/chezmoi
chezmoi execute-template < private_dot_config/tmux/tmux.conf.tmpl > /tmp/tmux-local.conf
chezmoi execute-template --init --promptString "What is your email address=x@y.z" --promptBool "Is this a work machine=true,Is this a remote dev box=true" < private_dot_config/tmux/tmux.conf.tmpl > /tmp/tmux-devbox.conf
```

Expected: both commands exit 0. (No template directives yet, so files are identical — that changes in Task 2.)

- [ ] **Step 3: Parse-test with a throwaway server**

```bash
tmux -L cfgtest -f /tmp/tmux-local.conf new-session -d -s parsetest 2>&1
tmux -L cfgtest show -g prefix
tmux -L cfgtest list-keys -T root | grep C-Space
tmux -L cfgtest kill-server
```

Expected: no error output from new-session; `prefix none`; the C-Space root binding listed. If `resize-pane -Z -t "{mouse}"` errors on load, fall back to `bind -n DoubleClick1Border resize-pane -Z` and note it.

- [ ] **Step 4: Commit**

```bash
git add private_dot_config/tmux/tmux.conf.tmpl
git commit -m "Add tmux core config: C-Space prefix, vi copy mode, mouse, QoL defaults

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Status line, window formats, pane borders, conditional hostname

**Files:**
- Modify: `private_dot_config/tmux/tmux.conf.tmpl` (append)

**Interfaces:**
- Consumes: Task 1's key-table convention (`#{==:#{client_key_table},prefix}` = prefix held).
- Produces: `status-right` placeholder that Task 3 replaces; `window-status-format` / `window-status-current-format` lines that Tasks 5 and 6 extend. The formats are composed from chezmoi template variables `$winFmt` / `$winCurFmt` defined at the TOP of the appended block — later tasks edit those variables, not the `setw` lines.

- [ ] **Step 1: Append the status section**

Append to `private_dot_config/tmux/tmux.conf.tmpl`:

```tmux
# ── Status line ─────────────────────────────────────────────────────────────
{{- /* Window entry formats are built here so later config (stash styling,
       agent glyphs) can extend one definition used by both formats. */ -}}
{{- $winFmt := `#[fg=#5c5f70]#I #W` -}}
{{- $winCurFmt := `#[fg=#56b6c2]#[bold]#I #[fg=#d8d8d8]#W#[default]#{?window_zoomed_flag, #[fg=#56b6c2]⛶,}` -}}
set -g status on
set -g status-position bottom
set -g status-style "bg=default,fg=#5c5f70"
set -g status-justify left
set -g status-left-length 60
set -g status-right-length 120

# mode dot: amber = prefix held, cyan = copy mode; two spaces reserved so
# nothing shifts when the dot appears
set -g status-left "#{?#{==:#{client_key_table},prefix},#[fg=#e5c07b]● ,#{?pane_in_mode,#[fg=#56b6c2]● ,  }}#[fg=#b98aec]#[bold]#S#[default]{{ if .isRemoteDevBox }}#[fg=#5c5f70] · #[fg=#e06c75]#h#[default]{{ end }}    "

setw -g window-status-separator "   "
setw -g window-status-format "{{ $winFmt }}"
setw -g window-status-current-format "{{ $winCurFmt }}"

# git segment lands here in Task 3
set -g status-right "#[fg=#5c5f70]%H:%M "

# ── Pane borders ────────────────────────────────────────────────────────────
set -g pane-border-style "fg=#33364a"
set -g pane-active-border-style "fg=#56b6c2"
set -g pane-border-lines single
set -g pane-border-status off
set -g pane-border-format " #[fg=#98c379]#[bold]#{pane_current_command}#[default] #[fg=#5c5f70]#{s|{{ .chezmoi.homeDir }}|~|:pane_current_path} "
# show border labels only when a window is actually split
set-hook -g window-layout-changed 'set -wF pane-border-status "#{?#{==:#{window_panes},1},off,top}"'
```

- [ ] **Step 2: Render both variants and check the hostname conditional**

```bash
cd /Users/dom/.local/share/chezmoi
chezmoi execute-template < private_dot_config/tmux/tmux.conf.tmpl > /tmp/tmux-local.conf
chezmoi execute-template --init --promptString "What is your email address=x@y.z" --promptBool "Is this a work machine=true,Is this a remote dev box=true" < private_dot_config/tmux/tmux.conf.tmpl > /tmp/tmux-devbox.conf
grep -c '#h' /tmp/tmux-local.conf ; grep -c '#h' /tmp/tmux-devbox.conf
```

Expected: local = `0`, devbox = `1`. Also confirm `~` substitution rendered the right home dir in each: `grep 'pane-border-format' /tmp/tmux-local.conf` shows `/Users/dom`, devbox variant shows the devbox home.

- [ ] **Step 3: Parse-test and behavior-check the border hook**

```bash
tmux -L cfgtest -f /tmp/tmux-local.conf new-session -d -s t 2>&1
tmux -L cfgtest show -gw pane-border-status        # → off (single pane)
tmux -L cfgtest split-window -t t
tmux -L cfgtest show -w -t t pane-border-status    # → top (after split)
tmux -L cfgtest kill-pane -t t
tmux -L cfgtest show -w -t t pane-border-status    # → off again
tmux -L cfgtest kill-server
```

Expected: exactly `off` / `top` / `off` and no load errors.

- [ ] **Step 4: Commit**

```bash
git add private_dot_config/tmux/tmux.conf.tmpl
git commit -m "Add tmux status line, window formats and pane border labels

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Git status segment script

**Files:**
- Create: `private_dot_config/tmux/scripts/executable_git-status.sh`
- Modify: `private_dot_config/tmux/tmux.conf.tmpl` (the `status-right` line)

**Interfaces:**
- Produces: `git-status.sh <dir>` → prints a tmux-styled segment (or nothing outside a repo). Invoked from status-right as `#(~/.config/tmux/scripts/git-status.sh "#{pane_current_path}")` — tmux re-runs it immediately when the active pane's path changes and caches it for `status-interval` otherwise.

- [ ] **Step 1: Write the script**

Create `private_dot_config/tmux/scripts/executable_git-status.sh`:

```bash
#!/usr/bin/env bash
# gitmux-style status segment for the tmux status line.
# Usage: git-status.sh <directory>   Output: "⎇ main ✚2 ●1 …3 ↑1" with tmux styles.
set -u

dir="${1:-}"
[ -d "$dir" ] || exit 0

key=$(printf '%s' "$dir" | cksum | cut -d' ' -f1)
cache="${TMPDIR:-/tmp}/tmux-git-status-$key"

if [ -f "$cache" ]; then
  now=$(date +%s)
  mtime=$(stat -f %m "$cache" 2>/dev/null || stat -c %Y "$cache" 2>/dev/null || echo 0)
  if [ $(( now - mtime )) -lt 4 ]; then
    cat "$cache"
    exit 0
  fi
fi

out=$(cd "$dir" 2>/dev/null && git status --porcelain=v2 --branch 2>/dev/null | awk '
  $1 == "#" && $2 == "branch.head" { branch = $3 }
  $1 == "#" && $2 == "branch.ab"   { ahead = substr($3, 2); behind = substr($4, 2) }
  $1 == "1" || $1 == "2" {
    if (substr($2, 1, 1) != ".") staged++
    if (substr($2, 2, 1) != ".") modified++
  }
  $1 == "?" { untracked++ }
  $1 == "u" { conflicts++ }
  END {
    if (branch == "") exit
    if (branch == "(detached)") branch = "detached"
    seg = "#[fg=#56b6c2]⎇ " branch
    if (modified)  seg = seg "#[fg=#e5c07b] ✚" modified
    if (staged)    seg = seg "#[fg=#98c379] ●" staged
    if (conflicts) seg = seg "#[fg=#e06c75] ✖" conflicts
    if (untracked) seg = seg "#[fg=#5c5f70] …" untracked
    if (ahead)     seg = seg "#[fg=#5c5f70] ↑" ahead
    if (behind)    seg = seg "#[fg=#5c5f70] ↓" behind
    printf "%s#[default]  #[fg=#5c5f70]·  ", seg
  }
')

printf '%s' "$out" > "$cache"
printf '%s' "$out"
```

- [ ] **Step 2: Test against fixture repos**

```bash
SRC=/Users/dom/.local/share/chezmoi/private_dot_config/tmux/scripts/executable_git-status.sh
chmod +x "$SRC"
# non-repo → empty
rm -rf /tmp/gs-none && mkdir -p /tmp/gs-none
"$SRC" /tmp/gs-none ; echo "exit=$? len=$("$SRC" /tmp/gs-none | wc -c | tr -d ' ')"
# clean repo → branch only
rm -rf /tmp/gs-repo && mkdir -p /tmp/gs-repo && cd /tmp/gs-repo
git init -q -b main && git commit -q --allow-empty -m init
"$SRC" /tmp/gs-repo ; echo
# dirty: 1 modified + 1 staged + 1 untracked (bypass 4s cache by clearing it)
echo a > tracked && git add tracked && git commit -q -m t
echo b >> tracked ; echo c > staged && git add staged ; echo d > untracked
rm -f /tmp/tmux-git-status-*
"$SRC" /tmp/gs-repo ; echo
```

Expected: non-repo prints nothing (`len=0`); clean repo prints `#[fg=#56b6c2]⎇ main#[default]  #[fg=#5c5f70]·  `; dirty repo includes ` ✚1`, ` ●1`, ` …1`.

- [ ] **Step 3: Wire into status-right**

In `private_dot_config/tmux/tmux.conf.tmpl`, replace:

```tmux
set -g status-right "#[fg=#5c5f70]%H:%M "
```

with:

```tmux
set -g status-right "#(~/.config/tmux/scripts/git-status.sh '#{pane_current_path}')#[fg=#5c5f70]%H:%M "
```

(The script emits its own trailing `  ·  ` separator only when it prints a segment, so non-repo panes show just the clock.)

- [ ] **Step 4: Re-render, parse-test, commit**

```bash
cd /Users/dom/.local/share/chezmoi
chezmoi execute-template < private_dot_config/tmux/tmux.conf.tmpl > /tmp/tmux-local.conf
tmux -L cfgtest -f /tmp/tmux-local.conf new-session -d -s t 2>&1 && tmux -L cfgtest kill-server
git add private_dot_config/tmux/scripts/executable_git-status.sh private_dot_config/tmux/tmux.conf.tmpl
git commit -m "Add cached gitmux-style git segment to tmux status line

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Which-key popup menu

**Files:**
- Create: `private_dot_config/tmux/scripts/executable_keys-menu.sh`
- Modify: `private_dot_config/tmux/tmux.conf.tmpl` (two bindings)

**Interfaces:**
- Consumes: Task 1 bindings (menu entries run the same commands).
- Produces: `keys-menu.sh` runnable via `tmux run-shell`; bound at `prefix ?` and `prefix Any` (any unbound key after C-Space opens the menu).
- Note: the two stash menu entries reference `~/.config/tmux/scripts/pane-stash.sh`, created in Task 5. Selecting them before Task 5 lands shows a run-shell error — expected mid-implementation, no action needed.

- [ ] **Step 1: Write the menu script**

Create `private_dot_config/tmux/scripts/executable_keys-menu.sh`:

```bash
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
```

- [ ] **Step 2: Add the bindings**

Append to `private_dot_config/tmux/tmux.conf.tmpl` (after the keybindings section):

```tmux
# ── Which-key menu: prefix-? or any unbound key after the prefix ───────────
bind ? run-shell "~/.config/tmux/scripts/keys-menu.sh"
bind -T prefix Any run-shell "~/.config/tmux/scripts/keys-menu.sh"
```

- [ ] **Step 3: Test**

```bash
chmod +x /Users/dom/.local/share/chezmoi/private_dot_config/tmux/scripts/executable_keys-menu.sh
cd /Users/dom/.local/share/chezmoi
chezmoi execute-template < private_dot_config/tmux/tmux.conf.tmpl > /tmp/tmux-local.conf
tmux -L cfgtest -f /tmp/tmux-local.conf new-session -d -s t 2>&1
tmux -L cfgtest list-keys -T prefix | grep -E '(Any|\?)'
# menu itself needs an attached client to render; verify the script at least
# produces a valid display-menu invocation against the detached server:
tmux -L cfgtest run-shell "/Users/dom/.local/share/chezmoi/private_dot_config/tmux/scripts/executable_keys-menu.sh" 2>&1 | head -2
tmux -L cfgtest kill-server
```

Expected: both bindings listed. The run-shell may print `no current client` on a detached server — that's fine; anything about invalid menu syntax is NOT fine. Full visual check happens in Task 9.

- [ ] **Step 4: Commit**

```bash
git add private_dot_config/tmux/scripts/executable_keys-menu.sh private_dot_config/tmux/tmux.conf.tmpl
git commit -m "Add which-key popup menu on prefix-? and unbound prefix keys

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Pane stash / restore

**Files:**
- Create: `private_dot_config/tmux/scripts/executable_pane-stash.sh`
- Modify: `private_dot_config/tmux/tmux.conf.tmpl` (bindings + `$winFmt` stash styling)

**Interfaces:**
- Consumes: `$winFmt` template variable from Task 2.
- Produces: `pane-stash.sh stash|restore`; hidden window is named exactly `stash` (window-format styling and the script must agree on that name).

- [ ] **Step 1: Write the script**

Create `private_dot_config/tmux/scripts/executable_pane-stash.sh`:

```bash
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
    tmux join-pane -h -s "$last"
    ;;
  *)
    echo "usage: pane-stash.sh stash|restore" >&2
    exit 1
    ;;
esac
```

- [ ] **Step 2: Add bindings and stash window styling**

Append to `private_dot_config/tmux/tmux.conf.tmpl` keybindings section:

```tmux
bind m run-shell "~/.config/tmux/scripts/pane-stash.sh stash"
bind M run-shell "~/.config/tmux/scripts/pane-stash.sh restore"
```

In the status section, change the `$winFmt` definition (leave `$winCurFmt` untouched) to dim and summarize the stash window:

```tmux
{{- $winFmt := `#{?#{==:#{window_name},stash},#[fg=#5c5f70]▸ stash (#{window_panes}),#[fg=#5c5f70]#I #W}` -}}
```

- [ ] **Step 3: Test the full round-trip**

```bash
chmod +x /Users/dom/.local/share/chezmoi/private_dot_config/tmux/scripts/executable_pane-stash.sh
S=/Users/dom/.local/share/chezmoi/private_dot_config/tmux/scripts/executable_pane-stash.sh
cd /Users/dom/.local/share/chezmoi
chezmoi execute-template < private_dot_config/tmux/tmux.conf.tmpl > /tmp/tmux-local.conf
tmux -L cfgtest -f /tmp/tmux-local.conf new-session -d -s t
tmux -L cfgtest split-window -t t                       # 2 panes
tmux -L cfgtest run-shell -t t "$S stash"
tmux -L cfgtest list-windows -t t -F '#{window_name}:#{window_panes}'
# expect: fish:1 (or shell name) + stash:1
tmux -L cfgtest run-shell -t t "$S stash"
tmux -L cfgtest list-windows -t t -F '#{window_name}:#{window_panes}'
# expect: stash:2 — stashing the last pane of a window is allowed when another
# window exists (the guard only blocks the sole pane of the sole window); the
# now-empty source window closes
tmux -L cfgtest run-shell -t t "$S restore"
tmux -L cfgtest list-windows -t t -F '#{window_name}:#{window_panes}'
# expect: two windows again; stash:1
tmux -L cfgtest run-shell -t t "$S restore"
tmux -L cfgtest list-windows -t t -F '#{window_name}:#{window_panes}'
# expect: stash window gone (auto-closed when its last pane left)
tmux -L cfgtest kill-server
```

Expected outputs as annotated. If `join-pane -d -t ':stash'` errors with an ambiguous target, use `-t ':stash.'` (trailing dot = its active pane) and re-run.

- [ ] **Step 4: Commit**

```bash
git add private_dot_config/tmux/scripts/executable_pane-stash.sh private_dot_config/tmux/tmux.conf.tmpl
git commit -m "Add pane stash/restore on prefix m/M with dim stash window entry

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Agent state — script, Claude Code hooks, status glyphs

**Files:**
- Create: `private_dot_config/tmux/scripts/executable_agent-state.sh`
- Create: `private_dot_claude/modify_settings.json`
- Modify: `private_dot_config/tmux/tmux.conf.tmpl` (`$winFmt`/`$winCurFmt` glyphs, border label state, done-clear hook)

**Interfaces:**
- Consumes: `$winFmt`/`$winCurFmt` from Tasks 2/5.
- Produces: `agent-state.sh working|input|done|clear` — sets window option `@agent_state` (drives window-list glyph) and pane option `@agent_pane_state` (drives border label) on the window/pane containing `$TMUX_PANE`. Claude Code hook events map: UserPromptSubmit/PreToolUse→working, Notification→input, Stop→done, SessionEnd→clear.

- [ ] **Step 1: Write agent-state.sh**

Create `private_dot_config/tmux/scripts/executable_agent-state.sh`:

```bash
#!/usr/bin/env bash
# Stamp AI-agent state onto the tmux window/pane this process runs in.
# Called by Claude Code hooks. Usage: agent-state.sh working|input|done|clear
# Must NEVER fail or block — Claude Code waits on hook exit.
[ -n "${TMUX:-}" ] || exit 0
[ -n "${TMUX_PANE:-}" ] || exit 0
state="${1:-}"

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
esac
exit 0
```

- [ ] **Step 2: Write the settings.json modify script**

`~/.claude/settings.json` is live-mutated by Claude Code (permission allowlist etc.), so chezmoi must MERGE, not own. Create `private_dot_claude/modify_settings.json`:

```python
#!/usr/bin/env python3
"""chezmoi modify script: merge tmux agent-state hooks into ~/.claude/settings.json.

Receives current file contents on stdin, writes merged contents to stdout.
Idempotent: skips any hook command already present.
"""
import json
import sys

SCRIPT = "$HOME/.config/tmux/scripts/agent-state.sh"
WANTED = {
    "UserPromptSubmit": f"{SCRIPT} working",
    "PreToolUse": f"{SCRIPT} working",
    "Notification": f"{SCRIPT} input",
    "Stop": f"{SCRIPT} done",
    "SessionEnd": f"{SCRIPT} clear",
}

raw = sys.stdin.read()
data = json.loads(raw) if raw.strip() else {}

hooks = data.setdefault("hooks", {})
for event, command in WANTED.items():
    groups = hooks.setdefault(event, [])
    existing = [
        h.get("command")
        for g in groups
        for h in g.get("hooks", [])
        if h.get("type") == "command"
    ]
    if command not in existing:
        groups.append({"hooks": [{"type": "command", "command": command}]})

json.dump(data, sys.stdout, indent=2)
sys.stdout.write("\n")
```

- [ ] **Step 3: Add glyphs and hooks to tmux config**

In `private_dot_config/tmux/tmux.conf.tmpl`, add an agent-glyph template variable ABOVE the `$winFmt` definition, and extend both window formats. The glyph: amber ✳ working, red bold ✳ input, green ✓ done; fallback dim ✳ when a pane runs claude/codex without hook data:

```tmux
{{- $agentGlyph := `#{?#{==:#{@agent_state},working}, #[fg=#e5a86b]✳,#{?#{==:#{@agent_state},input}, #[fg=#e06c75]#[bold]✳#[nobold],#{?#{==:#{@agent_state},done}, #[fg=#98c379]✓,#{?#{m:claude*,#{pane_current_command}}, #[fg=#5c5f70]✳,#{?#{m:codex*,#{pane_current_command}}, #[fg=#5c5f70]✳,}}}}}` -}}
{{- $winFmt := printf `#{?#{==:#{window_name},stash},#[fg=#5c5f70]▸ stash (#{window_panes}),#[fg=#5c5f70]#I #W%s}` $agentGlyph -}}
{{- $winCurFmt := printf `#[fg=#56b6c2]#[bold]#I #[fg=#d8d8d8]#W#[default]#{?window_zoomed_flag, #[fg=#56b6c2]⛶,}%s` $agentGlyph -}}
```

Replace the existing `$winFmt`/`$winCurFmt` definitions with the above (the `setw` lines using them stay unchanged).

Extend `pane-border-format` to show the state as a word:

```tmux
set -g pane-border-format " #[fg=#98c379]#[bold]#{pane_current_command}#[default] #[fg=#5c5f70]#{s|{{ .chezmoi.homeDir }}|~|:pane_current_path}#{?#{==:#{@agent_pane_state},working}, #[fg=#e5a86b]✳ working,#{?#{==:#{@agent_pane_state},input}, #[fg=#e06c75]✳ needs input,#{?#{==:#{@agent_pane_state},done}, #[fg=#98c379]✓ done,}}} "
```

Append the done-clear hook (visiting a window acknowledges its ✓):

```tmux
# clear a finished agent's ✓ when you visit its window
set-hook -g after-select-window 'if -F "#{==:#{@agent_state},done}" "set -w -u @agent_state"'
```

- [ ] **Step 4: Test agent-state.sh in a real pane**

```bash
chmod +x /Users/dom/.local/share/chezmoi/private_dot_config/tmux/scripts/executable_agent-state.sh
S=/Users/dom/.local/share/chezmoi/private_dot_config/tmux/scripts/executable_agent-state.sh
cd /Users/dom/.local/share/chezmoi
chezmoi execute-template < private_dot_config/tmux/tmux.conf.tmpl > /tmp/tmux-local.conf
tmux -L cfgtest -f /tmp/tmux-local.conf new-session -d -s t
tmux -L cfgtest send-keys -t t "$S working" Enter && sleep 1
tmux -L cfgtest show-options -w -t t @agent_state     # → @agent_state working
tmux -L cfgtest send-keys -t t "$S done" Enter && sleep 1
tmux -L cfgtest show-options -w -t t @agent_state     # → @agent_state done
# visiting the window clears done: create+select another window, then re-select
tmux -L cfgtest new-window -t t && tmux -L cfgtest select-window -t t:1 && sleep 1
tmux -L cfgtest show-options -w -t t:1 @agent_state   # → (empty — cleared)
tmux -L cfgtest send-keys -t t:1 "$S clear" Enter
tmux -L cfgtest kill-server
```

Expected as annotated. (send-keys runs the script inside the pane, which is exactly the environment Claude Code hooks get: `$TMUX` and `$TMUX_PANE` set.)

- [ ] **Step 5: Test the modify script standalone**

```bash
M=/Users/dom/.local/share/chezmoi/private_dot_claude/modify_settings.json
echo '{}' | python3 "$M" | python3 -c "import json,sys; d=json.load(sys.stdin); print(sorted(d['hooks'].keys()))"
# → ['Notification', 'PreToolUse', 'SessionEnd', 'Stop', 'UserPromptSubmit']
echo '{}' | python3 "$M" | python3 "$M" | grep -c "agent-state.sh working"
# → 2 (once for UserPromptSubmit, once for PreToolUse — idempotent, not duplicated)
cat ~/.claude/settings.json | python3 "$M" | python3 -c "import json,sys; d=json.load(sys.stdin); print('model' in d, 'permissions' in d)"
# → True True (existing settings preserved)
```

Then check what chezmoi would do (do NOT apply yet):

```bash
cd /Users/dom/.local/share/chezmoi && chezmoi diff --include files ~/.claude/settings.json
```

Expected: a diff adding only the `hooks` block to the real settings file.

- [ ] **Step 6: Commit**

```bash
git add private_dot_config/tmux/scripts/executable_agent-state.sh private_dot_claude/modify_settings.json private_dot_config/tmux/tmux.conf.tmpl
git commit -m "Add Claude Code agent-state markers to tmux windows and pane labels

Hook-driven (UserPromptSubmit/PreToolUse/Notification/Stop/SessionEnd via a
chezmoi modify script on ~/.claude/settings.json); codex panes get fallback
command-name detection since its notify slot is already in use.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Starship interop — shared template + git-less tmux variant

**Files:**
- Create: `.chezmoitemplates/starship.toml` (content moved from `private_dot_config/starship.toml`)
- Delete: `private_dot_config/starship.toml`
- Create: `private_dot_config/starship.toml.tmpl`
- Create: `private_dot_config/starship-tmux.toml.tmpl`
- Create: `private_dot_config/private_fish/conf.d/starship-tmux.fish`

**Interfaces:**
- Produces: `~/.config/starship-tmux.toml` on apply; fish exports `STARSHIP_CONFIG` pointing at it when inside tmux.

- [ ] **Step 1: Move starship.toml into a parameterized shared template**

`git mv private_dot_config/starship.toml .chezmoitemplates/starship.toml`, then make exactly these edits in `.chezmoitemplates/starship.toml` (everything else stays byte-identical):

Edit 1 — the `format` assignment (top of file): wrap the git fragment:

```toml
format = """
$username at $hostname in $directory\
{{ if not .tmuxVariant }}( \\($git_branch($git_status)$git_state\\)){{ end }}
$cmd_duration$jobs$sudo$character"""
```

Edit 2 — add a `disabled` line inside each git module table (belt and braces alongside the format edit). In `[git_branch]`, `[git_status]`, and `[git_metrics]` add as the first line of each table:

```toml
disabled = {{ .tmuxVariant }}
```

(`[git_metrics]` already has `disabled = false` — replace that line rather than adding a second one.)

- [ ] **Step 2: Create the two rendering targets**

`private_dot_config/starship.toml.tmpl`:

```
{{- template "starship.toml" (dict "tmuxVariant" false) -}}
```

`private_dot_config/starship-tmux.toml.tmpl`:

```
{{- template "starship.toml" (dict "tmuxVariant" true) -}}
```

- [ ] **Step 3: Create the fish hook**

`private_dot_config/private_fish/conf.d/starship-tmux.fish`:

```fish
# Inside tmux the status line owns git status — use the git-less starship
# config so the prompt stays short and fast. Never clobber an explicit choice
# (e.g. the GoLand config).
if set -q TMUX; and not set -q STARSHIP_CONFIG
    set -gx STARSHIP_CONFIG ~/.config/starship-tmux.toml
end
```

- [ ] **Step 4: Verify rendering**

```bash
cd /Users/dom/.local/share/chezmoi
chezmoi execute-template < private_dot_config/starship.toml.tmpl > /tmp/starship-normal.toml
chezmoi execute-template < private_dot_config/starship-tmux.toml.tmpl > /tmp/starship-tmux.toml
diff <(git show HEAD:private_dot_config/starship.toml) /tmp/starship-normal.toml
grep -n 'git_branch' /tmp/starship-tmux.toml | head -3
STARSHIP_CONFIG=/tmp/starship-normal.toml starship print-config > /dev/null && echo "normal parses"
STARSHIP_CONFIG=/tmp/starship-tmux.toml starship print-config > /dev/null && echo "tmux variant parses"
```

Expected: `diff` shows ONLY the `disabled = false` line added to `[git_branch]`/`[git_status]` tables (and the unchanged-value `git_metrics` line) — no other drift from the original; tmux variant has `$git_branch` absent from `format` and `disabled = true` in the three git tables; both parse.

- [ ] **Step 5: Commit**

```bash
git add .chezmoitemplates/starship.toml private_dot_config/starship.toml.tmpl private_dot_config/starship-tmux.toml.tmpl private_dot_config/private_fish/conf.d/starship-tmux.fish
git rm private_dot_config/starship.toml 2>/dev/null; true
git commit -m "Render starship from shared template with git-less tmux variant

Inside tmux the status line owns git status; fish points STARSHIP_CONFIG at
the tmux variant so the prompt drops its git segment there.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Package installation — brew + devbox apt

**Files:**
- Modify: `run_onchange_before_install-packages-darwin.sh.tmpl`
- Modify: `install.sh`

- [ ] **Step 1: Add tmux to the Brewfile**

In `run_onchange_before_install-packages-darwin.sh.tmpl`, in the `# Core Shell` section after the `brew "fisher"` line, add:

```
brew "tmux"                     # Terminal multiplexer
```

- [ ] **Step 2: Add best-effort apt install to install.sh**

In `install.sh`, insert before section `# 3. Run chezmoi init + apply`:

```bash
# ---------------------------------------------------------------------------
# 2b. Install tmux (best effort — Coder images usually have apt + sudo)
# ---------------------------------------------------------------------------
if ! command -v tmux &>/dev/null; then
  if command -v apt-get &>/dev/null && sudo -n true 2>/dev/null; then
    echo "==> Installing tmux..."
    sudo apt-get update -qq && sudo apt-get install -y -qq tmux
  else
    echo "WARN: tmux not found and cannot be installed automatically" >&2
  fi
fi
```

- [ ] **Step 3: Syntax-check and commit**

```bash
bash -n /Users/dom/.local/share/chezmoi/install.sh && echo "install.sh OK"
cd /Users/dom/.local/share/chezmoi
chezmoi execute-template < run_onchange_before_install-packages-darwin.sh.tmpl | grep 'brew "tmux"'
git add run_onchange_before_install-packages-darwin.sh.tmpl install.sh
git commit -m "Install tmux via brew on macOS and apt on devboxes

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Apply and end-to-end verification

**Files:** none new — applies everything and verifies live.

- [ ] **Step 1: Preview then apply**

```bash
cd /Users/dom/.local/share/chezmoi
chezmoi diff
chezmoi apply -v
```

Expected diff: new `~/.config/tmux/**`, new `~/.config/starship-tmux.toml`, `~/.config/starship.toml` (only `disabled = false` lines added), new fish conf.d file, `~/.claude/settings.json` gains only the `hooks` block. Anything unexpected in the diff: STOP and investigate before applying.

- [ ] **Step 2: Live smoke test (needs the user or an attached terminal)**

Run `tmux` in Ghostty and walk this checklist with the user:

1. Bar renders: purple session, no hostname (Mac), dim windows, clock right
2. `C-Space` → amber dot + pane badges flash; digits switch windows
3. `C-Space ?` and a mistyped `C-Space g` → which-key menu opens; menu items execute
4. `C-Space |` then `C-Space -` → splits open in same dir; border labels appear with command + `~/`-abbreviated path; single-pane windows show no label
5. `C-Space z` → zoom + `⛶` in bar; double-click border also zooms
6. `C-Space m` → pane vanishes, dim `▸ stash (1)` appears; `C-Space M` restores
7. `C-Space [` → cyan dot; `v` + `y` copies; paste on the Mac works (OSC 52)
8. Mouse: click panes/windows, drag border, wheel scrollback
9. cd into a dirty repo → `⎇ branch ✚n` appears; clean repo → plain cyan; non-repo → clock only
10. Run `claude` in a pane → dim ✳ immediately (fallback); submit a prompt → amber ✳ (hook); let it finish → green ✓; switch away and back → ✓ clears; trigger a permission prompt → red ✳ + bell notification
11. Prompt inside tmux has no git segment; outside tmux unchanged
12. `chezmoi execute-template --init --promptString "What is your email address=x@y.z" --promptBool "Is this a work machine=true,Is this a remote dev box=true" < private_dot_config/tmux/tmux.conf.tmpl | grep '#h'` → hostname present for devbox variant

- [ ] **Step 3: Fix anything the checklist surfaces, then final commit of tweaks**

```bash
cd /Users/dom/.local/share/chezmoi
git add -A && git status
git commit -m "Tweak tmux config from live verification

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

(Skip the commit if the checklist passed with no changes.)

---

## Known risks & fallbacks

- `bind -n DoubleClick1Border resize-pane -Z -t "{mouse}"` — if the mouse target is rejected at load, drop `-t "{mouse}"`.
- `join-pane -d -t ':stash'` ambiguity — use `-t ':stash.'` if needed (Task 5 Step 3 notes this).
- `display-menu` invoked via `run-shell` needs a client; if the `Any`-key binding misbehaves on some key classes (e.g. mouse events reaching the prefix table), scope it back to just `bind ?` and add a `display-message "unknown key — press ? for help"` fallback on Any.
- If `#{==:#{client_key_table},prefix}` doesn't flip the mode dot (older key-table semantics), switch the conditional to `#{client_prefix}` — one of the two always reflects `switch-client -T prefix` on 3.5.
- Codex state markers are fallback-only (dim ✳ by process name): its single `notify` slot is already used by the computer-use client. Future: a wrapper script chaining both.
