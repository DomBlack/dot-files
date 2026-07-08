# Dotfiles 2026 Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the approved 2026 refresh: audit fixes (editor, devbox signing, gitignore consolidation, hygiene), devbox CLI provisioning via chezmoi externals, mise replacing nvm, local-only atuin, modern git defaults, managed CLAUDE.md, and persisted chezmoi sourceDir for Coder.

**Architecture:** All changes are chezmoi source-repo edits plus one `chezmoi add`. The devbox gap closes with a `.chezmoiexternal.toml.tmpl` (pinned static binaries → `~/.local/bin`, non-darwin only). fish gains two conf.d files (mise, atuin) and loses one (nvm-auto).

**Tech Stack:** chezmoi templates, fish, git config, GitHub release artifacts.

**Spec:** `docs/superpowers/specs/2026-07-08-dotfiles-2026-refresh-design.md`

## Global Constraints

- Commits to `main`; messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Do NOT run `chezmoi apply` until the final task; test with renders (`chezmoi execute-template`, temp-config technique from `docs/superpowers/plans/2026-07-08-git-signing-key-toggle.md` Step 5) and `fish -n` / scratch `GIT_CONFIG_GLOBAL` checks.
- Render tests for data variants use temp config JSON files: `mk() { printf '{"data":{"email":"x@y.z","isWorkMachine":true,%s}}' "$1" > "$2"; }` then `chezmoi --config FILE --config-format json execute-template < TEMPLATE`.
- Devbox variant = `"isRemoteDevBox":true` (no `useOnePasswordSSH` key — tests `hasKey` guards); Mac = `"isRemoteDevBox":false,"useOnePasswordSSH":false`.
- Kept as-is by explicit user decision (do NOT "fix"): global GOFLAGS debug flags in `go.fish.tmpl` (add a comment marking it deliberate), the entire `dot_vimrc`.
- The 1Password signing branch and all three allowed_signers keys must survive untouched.
- External binaries must be pinned exact versions (no `latest` URLs), linux only (`{{ if ne .chezmoi.os "darwin" }}`), installed to `~/.local/bin`, `refreshPeriod = "168h"`.

## File Structure

```
dot_gitconfig.tmpl                          # signing (devbox branch), modern defaults, drop excludesfile
private_dot_config/private_git/ignore       # consolidated global gitignore (absorbs dot_gitignore)
dot_gitignore                               # DELETED (content moved); .chezmoiremove cleans target
.chezmoiremove                              # NEW: removes orphaned ~/.gitignore
.chezmoiignore                              # + ghostty exclusion on devboxes
.chezmoi.jsonc.tmpl                         # + sourceDir persistence
install.sh                                  # + sourceDir pre-seed, + apt fish
run_once_enable-and-switch-to-fish.sh       # sudo -n probe, getent/dscl shell check
run_onchange_before_install-packages-darwin.sh.tmpl  # cursor→vscode, +atuin +mise, -nvm
.chezmoiexternal.toml.tmpl                  # NEW: devbox static binaries
private_dot_config/private_fish/conf.d/variables.fish.tmpl   # EDITOR cursor→code
private_dot_config/private_fish/conf.d/paths.fish.tmpl       # homeDir templating
private_dot_config/private_fish/conf.d/mise.fish             # NEW
private_dot_config/private_fish/conf.d/zz_atuin.fish         # NEW (zz_ = must sort after fzf.fish plugin conf)
private_dot_config/private_fish/conf.d/nvm-auto.fish         # DELETED
private_dot_config/private_fish/fish_plugins                 # -nvm.fish
private_dot_config/private_fish/conf.d/go.fish.tmpl          # comment marking GOFLAGS deliberate
private_dot_config/mise/config.toml                          # NEW
private_dot_config/atuin/config.toml                         # NEW
private_dot_config/starship-goland.toml                      # DELETED → starship-goland.toml.tmpl
private_dot_claude/CLAUDE.md                                 # NEW via chezmoi add
```

---

### Task 1: Git — devbox signing, modern defaults, gitignore consolidation

**Files:**
- Modify: `dot_gitconfig.tmpl`
- Modify: `private_dot_config/private_git/ignore`
- Delete: `dot_gitignore`
- Create: `.chezmoiremove`

**Interfaces:**
- Produces: devbox commits signed with `~/.ssh/id_ed25519.pub`; global ignore lives ONLY at `~/.config/git/ignore` (git's XDG default — no `core.excludesfile` needed).

- [ ] **Step 1: Rewrite the non-darwin branch of `dot_gitconfig.tmpl`**

Replace the current `{{ else -}}` branch (lines 23-28: `[commit] gpgsign = false` + `[user]` block) with:

```
{{ else -}}
# Linux devboxes: sign with the local key. NOTE: a devbox's public key must be
# registered on GitHub as a signing key (one-time, from an authed machine) for
# its commits to show Verified — the current devbox key already is.
[gpg]
	format = ssh
[gpg "ssh"]
	allowedSignersFile = {{ .chezmoi.homeDir }}/.config/git/allowed_signers
[commit]
	gpgsign = true
[user]
	signingkey = {{ .chezmoi.homeDir }}/.ssh/id_ed25519.pub
	name = Dominic Black
	email = {{ .email }}
{{ end -}}
```

The darwin branch is untouched.

- [ ] **Step 2: Modern defaults + drop excludesfile**

In `dot_gitconfig.tmpl`:

(a) In `[core]`, DELETE the line `excludesfile = {{ .chezmoi.homeDir }}/.gitignore`.

(b) Replace the existing `[branch]`/`[push]`/`[fetch]` singleton sections with this block (placed where `[branch]` is now, after `[github]`):

```
[column]
	ui = auto
[branch]
	autosetuprebase = always
	sort = -committerdate
[tag]
	sort = version:refname
[init]
	defaultBranch = main
[diff]
	algorithm = histogram
	colorMoved = plain
	mnemonicPrefix = true
[push]
	default = current
	autoSetupRemote = true
	followTags = true
[fetch]
	prune = true
[rerere]
	enabled = true
	autoupdate = true
[rebase]
	autoStash = true
	updateRefs = true
[commit]
	verbose = true
[help]
	autocorrect = prompt
```

(Repeated `[commit]` sections are legal git config — `gpgsign` stays in the OS
blocks; `verbose` lives here.)

- [ ] **Step 3: Consolidate the global ignore**

Replace the entire content of `private_dot_config/private_git/ignore` with the current content of `dot_gitignore`, changing the final `.claude/settings.local.json` line to `**/.claude/settings.local.json` (superset of both old entries). Then `git rm dot_gitignore`.

Create `.chezmoiremove`:

```
.gitignore
```

- [ ] **Step 4: Verify renders and effective config**

```bash
cd /Users/dom/.local/share/chezmoi
mk() { printf '{"data":{"email":"x@y.z","isWorkMachine":true,%s}}' "$1" > "$2"; }
mk '"isRemoteDevBox":false,"useOnePasswordSSH":false' /tmp/cz-mac.json
mk '"isRemoteDevBox":true' /tmp/cz-devbox.json
for v in mac devbox; do
  chezmoi --config /tmp/cz-$v.json --config-format json execute-template < dot_gitconfig.tmpl > /tmp/gc-$v.conf
  GIT_CONFIG_GLOBAL=/tmp/gc-$v.conf git config --global --list > /tmp/gc-$v.list && echo "$v parses"
done
grep -E 'gpg|signingkey|gpgsign' /tmp/gc-devbox.list
grep -cE 'rerere.enabled=true|rebase.updaterefs=true|push.autosetupremote=true|commit.verbose=true' /tmp/gc-mac.list   # → 4
grep -c excludesfile /tmp/gc-mac.list   # → 0
grep -c 'settings.local.json' private_dot_config/private_git/ignore  # → 1 (** form)
```

Expected: both variants parse; devbox list shows `commit.gpgsign=true`, `gpg.format=ssh`, `user.signingkey=<home>/.ssh/id_ed25519.pub`; counts as annotated.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "Sign devbox commits, adopt modern git defaults, consolidate global ignore

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Small fixes — editor swap, hygiene, sourceDir persistence

**Files:**
- Modify: `run_onchange_before_install-packages-darwin.sh.tmpl` (cask line only — atuin/mise land in Task 4)
- Modify: `private_dot_config/private_fish/conf.d/variables.fish.tmpl`
- Modify: `private_dot_config/private_fish/conf.d/paths.fish.tmpl`
- Modify: `private_dot_config/private_fish/conf.d/go.fish.tmpl`
- Modify: `.chezmoiignore`
- Modify: `.chezmoi.jsonc.tmpl`
- Modify: `install.sh`
- Modify: `run_once_enable-and-switch-to-fish.sh`

- [ ] **Step 1: Editor swap**

In the Brewfile template, replace `cask "cursor"                   # Cursor code editor` with `cask "visual-studio-code"      # VS Code`.
In `variables.fish.tmpl`, change the darwin branch to `set -gx EDITOR code`.

- [ ] **Step 2: homeDir templating + GOFLAGS comment**

In `paths.fish.tmpl`, replace `/Users/dom/Library/Application Support/JetBrains/Toolbox/scripts` with `{{ .chezmoi.homeDir }}/Library/Application Support/JetBrains/Toolbox/scripts`.
In `go.fish.tmpl`, directly above the `GOFLAGS` line add:
```
# NOTE: debug flags (-N -l) are DELIBERATE — Dom wants every local build
# delve-debuggable and accepts the optimisation cost. Do not "fix".
```

- [ ] **Step 3: ghostty exclusion on devboxes**

Append to `.chezmoiignore`:

```
{{ if .isRemoteDevBox }}
.config/ghostty
{{ end }}
```

- [ ] **Step 4: sourceDir persistence**

`.chezmoi.jsonc.tmpl`: add `"sourceDir": {{ .chezmoi.sourceDir | quote }},` as the first line inside the top-level `{`, before `"data"`.

`install.sh`: in the pre-seeded config heredoc, add the same top-level key before `"data"`:
```
    "sourceDir": "${SCRIPT_DIR}",
```

- [ ] **Step 5: Harden run_once_enable-and-switch-to-fish.sh**

Replace the file's content with:

```sh
#!/bin/sh
set -e

FISH="$(command -v fish || true)"
[ -n "$FISH" ] || exit 0

# Login shell from the user database — $SHELL lies inside subshells
case "$(uname)" in
  Darwin) CURRENT_SHELL="$(dscl . -read "/Users/$(whoami)" UserShell 2>/dev/null | awk '{print $2}')" ;;
  *)      CURRENT_SHELL="$(getent passwd "$(whoami)" | cut -d: -f7)" ;;
esac
[ "$CURRENT_SHELL" = "$FISH" ] && exit 0

# Ensure fish is listed in /etc/shells (needs sudo; skip quietly if unavailable)
if ! grep -Fxq "$FISH" /etc/shells; then
  if sudo -n true 2>/dev/null; then
    printf '%s\n' "$FISH" | sudo tee -a /etc/shells >/dev/null
  else
    echo "WARN: cannot add fish to /etc/shells (no passwordless sudo); skipping shell switch" >&2
    exit 0
  fi
fi

# Switch login shell
if [ "$(uname)" = "Linux" ] && [ "$(whoami)" = "devuser" ]; then
  sudo -n chsh -s "$FISH" devuser || echo "WARN: chsh failed" >&2
else
  chsh -s "$FISH" || echo "WARN: chsh failed (may need interactive password)" >&2
fi
```

- [ ] **Step 6: Verify**

```bash
cd /Users/dom/.local/share/chezmoi
sh -n run_once_enable-and-switch-to-fish.sh && bash -n install.sh && echo scripts-ok
chezmoi execute-template < private_dot_config/private_fish/conf.d/variables.fish.tmpl | grep EDITOR   # code on this Mac
chezmoi execute-template < private_dot_config/private_fish/conf.d/paths.fish.tmpl | grep JetBrains    # /Users/dom via homeDir
# fresh-config render includes sourceDir (isolated-config technique):
printf '{}' > /tmp/cz-fresh.json
chezmoi --config /tmp/cz-fresh.json --config-format json execute-template --init \
  --promptString "What is your email address=x@y.z" \
  --promptBool "Is this a work machine?=true,Is this a remote dev box?=true" \
  < .chezmoi.jsonc.tmpl | grep sourceDir
# ghostty ignored only on devboxes:
mk() { printf '{"data":{"email":"x@y.z","isWorkMachine":true,%s}}' "$1" > "$2"; }
mk '"isRemoteDevBox":true' /tmp/cz-devbox.json
chezmoi --config /tmp/cz-devbox.json --config-format json execute-template < .chezmoiignore | grep -c ghostty  # → 1
chezmoi execute-template < .chezmoiignore | grep -c ghostty || echo "0 on mac — correct"
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "Editor swap to VS Code, hygiene fixes, persist chezmoi sourceDir for Coder

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: starship-goland from the shared template

**Files:**
- Delete: `private_dot_config/starship-goland.toml`
- Create: `private_dot_config/starship-goland.toml.tmpl`

- [ ] **Step 1: Replace the fork with a render**

`git rm private_dot_config/starship-goland.toml`; create `private_dot_config/starship-goland.toml.tmpl`:

```
{{- template "starship.toml" (dict "tmuxVariant" false) -}}
```

- [ ] **Step 2: Verify + commit**

```bash
cd /Users/dom/.local/share/chezmoi
chezmoi execute-template < private_dot_config/starship-goland.toml.tmpl > /tmp/goland.toml
STARSHIP_CONFIG=/tmp/goland.toml starship print-config > /dev/null && echo parses
grep -c 'golang' /tmp/goland.toml   # ≥1 — Go module restored
diff <(chezmoi execute-template < private_dot_config/starship.toml.tmpl) /tmp/goland.toml && echo "identical to main config"
git add -A && git commit -m "Render starship-goland from the shared template (restores language modules)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Devbox externals + Brewfile/install.sh provisioning

**Files:**
- Create: `.chezmoiexternal.toml.tmpl`
- Modify: `run_onchange_before_install-packages-darwin.sh.tmpl` (+atuin +mise; nvm removal is Task 5)
- Modify: `install.sh` (+apt fish alongside tmux)

**Interfaces:**
- Produces: on non-darwin machines, `~/.local/bin/{eza,bat,fd,rg,fzf,zoxide,delta,starship,atuin,mise}` from pinned release archives.

- [ ] **Step 1: Discover current release versions (pin what you find)**

```bash
for repo in eza-community/eza sharkdp/bat sharkdp/fd BurntSushi/ripgrep junegunn/fzf ajeetdsouza/zoxide dandavison/delta starship/starship atuinsh/atuin jdx/mise; do
  printf '%-28s %s\n' "$repo" "$(gh api repos/$repo/releases/latest --jq .tag_name)"
done
```

Record each tag. These exact versions get pinned in Step 2.

- [ ] **Step 2: Write `.chezmoiexternal.toml.tmpl`**

Shape (fill `<VER>` with Step 1's tags, minus any `v` prefix where the URL pattern needs it — verify EVERY url in Step 3 before committing):

```toml
{{ if ne .chezmoi.os "darwin" -}}
{{- $arch := "x86_64" -}}
{{- $goarch := "amd64" -}}
{{- if eq .chezmoi.arch "arm64" }}{{ $arch = "aarch64" }}{{ $goarch = "arm64" }}{{ end -}}

# Pinned static binaries for devboxes (no sudo needed). Update by bumping the
# version numbers; chezmoi re-downloads when the URL changes or every 168h.

[".local/bin/eza"]
    type = "archive-file"
    url = "https://github.com/eza-community/eza/releases/download/v<VER>/eza_{{ $arch }}-unknown-linux-musl.tar.gz"
    path = "./eza"
    executable = true
    refreshPeriod = "168h"

[".local/bin/bat"]
    type = "archive-file"
    url = "https://github.com/sharkdp/bat/releases/download/v<VER>/bat-v<VER>-{{ $arch }}-unknown-linux-musl.tar.gz"
    stripComponents = 1
    path = "bat"
    executable = true
    refreshPeriod = "168h"

[".local/bin/fd"]
    type = "archive-file"
    url = "https://github.com/sharkdp/fd/releases/download/v<VER>/fd-v<VER>-{{ $arch }}-unknown-linux-musl.tar.gz"
    stripComponents = 1
    path = "fd"
    executable = true
    refreshPeriod = "168h"

[".local/bin/rg"]
    type = "archive-file"
    url = "https://github.com/BurntSushi/ripgrep/releases/download/<VER>/ripgrep-<VER>-{{ $arch }}-unknown-linux-musl.tar.gz"
    stripComponents = 1
    path = "rg"
    executable = true
    refreshPeriod = "168h"

[".local/bin/fzf"]
    type = "archive-file"
    url = "https://github.com/junegunn/fzf/releases/download/v<VER>/fzf-<VER>-linux_{{ $goarch }}.tar.gz"
    path = "fzf"
    executable = true
    refreshPeriod = "168h"

[".local/bin/zoxide"]
    type = "archive-file"
    url = "https://github.com/ajeetdsouza/zoxide/releases/download/v<VER>/zoxide-<VER>-{{ $arch }}-unknown-linux-musl.tar.gz"
    path = "zoxide"
    executable = true
    refreshPeriod = "168h"

[".local/bin/delta"]
    type = "archive-file"
    url = "https://github.com/dandavison/delta/releases/download/<VER>/delta-<VER>-{{ $arch }}-unknown-linux-musl.tar.gz"
    stripComponents = 1
    path = "delta"
    executable = true
    refreshPeriod = "168h"

[".local/bin/starship"]
    type = "archive-file"
    url = "https://github.com/starship/starship/releases/download/v<VER>/starship-{{ $arch }}-unknown-linux-musl.tar.gz"
    path = "starship"
    executable = true
    refreshPeriod = "168h"

[".local/bin/atuin"]
    type = "archive-file"
    url = "https://github.com/atuinsh/atuin/releases/download/v<VER>/atuin-{{ $arch }}-unknown-linux-musl.tar.gz"
    stripComponents = 1
    path = "atuin"
    executable = true
    refreshPeriod = "168h"

[".local/bin/mise"]
    type = "archive-file"
    url = "https://github.com/jdx/mise/releases/download/v<VER>/mise-v<VER>-linux-x64-musl.tar.gz"
    path = "mise/bin/mise"
    executable = true
    refreshPeriod = "168h"
{{ end -}}
```

(mise's arm64 artifact is `linux-arm64-musl` — use `{{ if eq .chezmoi.arch "arm64" }}` for that URL segment.)

- [ ] **Step 3: Verify every URL and archive layout — MANDATORY before commit**

For each entry, with the x86_64 URL fully substituted:

```bash
curl -fsIL "<URL>" -o /dev/null && echo "OK <tool>"
curl -fsL "<URL>" | tar tz | head -3    # confirm path/stripComponents match reality
```

Any 404 or layout mismatch: fix the URL pattern or `path`/`stripComponents` to what the archive actually contains, and note the correction in your report.

- [ ] **Step 4: Brewfile + install.sh**

Brewfile Core Shell section, after `brew "tmux"`:
```
brew "atuin"                    # Shell history (local-only config)
brew "mise"                     # Polyglot version manager (replaces nvm)
```

`install.sh`: in the tmux apt block, change `sudo apt-get install -y -qq tmux` to `sudo apt-get install -y -qq tmux fish` (both lines mentioning tmux in the surrounding echo/WARN messages become "tmux/fish").

- [ ] **Step 5: Render check + commit**

```bash
cd /Users/dom/.local/share/chezmoi
mk() { printf '{"data":{"email":"x@y.z","isWorkMachine":true,%s}}' "$1" > "$2"; }
mk '"isRemoteDevBox":true' /tmp/cz-devbox.json
chezmoi --config /tmp/cz-devbox.json --config-format json execute-template < .chezmoiexternal.toml.tmpl | python3 -c "import tomllib,sys; d=tomllib.loads(sys.stdin.read()); print(len(d), 'externals')"   # → 10 externals
chezmoi execute-template < .chezmoiexternal.toml.tmpl | wc -l    # darwin render → 0/blank
bash -n install.sh && echo install-ok
git add -A && git commit -m "Provision devbox CLI tools via chezmoi externals; brew atuin+mise

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

(If local python3 lacks tomllib, verify with `grep -c 'archive-file'` → 10 instead.)

---

### Task 5: mise replaces the nvm stack

**Files:**
- Modify: `private_dot_config/private_fish/fish_plugins` (remove `jorgebucaran/nvm.fish` line)
- Delete: `private_dot_config/private_fish/conf.d/nvm-auto.fish`
- Modify: `run_onchange_before_install-packages-darwin.sh.tmpl` (remove `brew "nvm"` line and its section comment if now empty)
- Create: `private_dot_config/private_fish/conf.d/mise.fish`
- Create: `private_dot_config/mise/config.toml`

**Interfaces:**
- Consumes: mise binary from brew (mac) / externals (devbox, Task 4).
- Produces: `.nvmrc`/`.node-version` auto-switching via mise; fisher prunes nvm.fish on next `fisher update` (triggered by the run_onchange hash change).

- [ ] **Step 1: Create `conf.d/mise.fish`**

```fish
# mise: polyglot version manager (node via .nvmrc/.node-version, go, etc.)
if command -q mise
    mise activate fish | source
end
```

- [ ] **Step 2: Create `private_dot_config/mise/config.toml`**

```toml
[settings]
# honour work repos' .nvmrc / .node-version files
idiomatic_version_file_enable_tools = ["node"]
```

- [ ] **Step 3: Remove the nvm stack**

Delete `jorgebucaran/nvm.fish` from `fish_plugins`; `git rm private_dot_config/private_fish/conf.d/nvm-auto.fish`; delete the `brew "nvm"` line (and the now-empty "Node.js and JavaScript" section header) from the Brewfile template.

- [ ] **Step 4: Verify + commit**

```bash
cd /Users/dom/.local/share/chezmoi
fish -n private_dot_config/private_fish/conf.d/mise.fish && echo fish-ok
grep -c nvm private_dot_config/private_fish/fish_plugins   # → 0
chezmoi execute-template < run_onchange_before_install-packages-darwin.sh.tmpl | grep -c '"nvm"' || echo "nvm gone"
# functional (mise may not be installed yet locally — brew install mise first if absent):
command -v mise >/dev/null || brew install mise
mkdir -p /tmp/mise-test && printf '22.14.0\n' > /tmp/mise-test/.nvmrc
cd /tmp/mise-test && MISE_GLOBAL_CONFIG_FILE=/Users/dom/.local/share/chezmoi/private_dot_config/mise/config.toml mise ls-remote node >/dev/null 2>&1; MISE_GLOBAL_CONFIG_FILE=/Users/dom/.local/share/chezmoi/private_dot_config/mise/config.toml mise current node 2>&1 | head -2
cd /Users/dom/.local/share/chezmoi
git add -A && git commit -m "Replace nvm stack with mise (.nvmrc-compatible)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

Expected: `mise current node` resolves/mentions 22.14.0 (it may say "not installed" — resolution of the version from .nvmrc is what's being tested, not installation).

---

### Task 6: atuin, local-only

**Files:**
- Create: `private_dot_config/private_fish/conf.d/zz_atuin.fish`
- Create: `private_dot_config/atuin/config.toml`

- [ ] **Step 1: Create `conf.d/zz_atuin.fish`**

```fish
# atuin: shell history with context, local-only (no sync, no account).
# File is zz_-prefixed so it loads AFTER the fzf.fish plugin's conf.d file:
# we hand Ctrl-R to atuin and keep every other fzf.fish binding.
if command -q atuin
    atuin init fish --disable-up-arrow | source
    if functions -q fzf_configure_bindings
        fzf_configure_bindings --history=
    end
end
```

- [ ] **Step 2: Create `private_dot_config/atuin/config.toml`**

```toml
# Local-only atuin: no account, no sync, no update nags.
search_mode = "fuzzy"
auto_sync = false
update_check = false
```

- [ ] **Step 3: Verify + commit**

```bash
cd /Users/dom/.local/share/chezmoi
fish -n private_dot_config/private_fish/conf.d/zz_atuin.fish && echo fish-ok
command -v atuin >/dev/null || brew install atuin
# binding order check in a scratch fish that sources fzf.fish conf then ours:
fish -c 'source ~/.config/fish/conf.d/fzf.fish 2>/dev/null; source /Users/dom/.local/share/chezmoi/private_dot_config/private_fish/conf.d/zz_atuin.fish; bind \cr' 2>&1 | tail -1
git add -A && git commit -m "Add atuin shell history, local-only, Ctrl-R only

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

Expected: the `bind \cr` output references `_atuin_search`, not fzf history.

---

### Task 7: Managed CLAUDE.md, apply, live verification

**Files:**
- Create: `private_dot_claude/CLAUDE.md` (via `chezmoi add ~/.claude/CLAUDE.md`)

- [ ] **Step 1: Add CLAUDE.md**

```bash
cd /Users/dom/.local/share/chezmoi
chezmoi add ~/.claude/CLAUDE.md
git add private_dot_claude/ && git status --short
```

- [ ] **Step 2: Preview the full apply**

```bash
chezmoi diff | head -80
chezmoi status
```

Expected targets: `.gitconfig` (signing untouched on mac, new defaults, no excludesfile), `.config/git/ignore` (grown), `~/.gitignore` REMOVED (chezmoiremove), fish conf.d changes, new mise/atuin configs, Brewfile script re-run (installs vscode/atuin/mise), goland starship regenerated. NOTHING touching `~/.ssh` or claude settings.json beyond the existing hooks block. Anything unexpected: STOP.

- [ ] **Step 3: Apply and verify live (Mac)**

```bash
chezmoi apply
git config --global push.autoSetupRemote   # → true
git config --global core.excludesfile; echo "exit=$? (1 = unset)"
ls ~/.gitignore 2>&1                        # → No such file
# XDG global ignore is live: a scratch repo must ignore .DS_Store and the claude local settings
rm -rf /tmp/ig-test && git init -q /tmp/ig-test
git -C /tmp/ig-test check-ignore .DS_Store sub/.claude/settings.local.json && echo "XDG-ignore-works"
fish -c 'echo $EDITOR'                      # → code
fish -c 'bind \cr' | tail -1               # → _atuin_search
fish -c 'command -q mise; and echo mise-active'
STARSHIP_CONFIG=~/.config/starship-goland.toml starship print-config >/dev/null && echo goland-ok
```

- [ ] **Step 4: Commit anything the verification changed, push, hand devbox checklist to user**

```bash
git status --short   # expect clean
git push
```

User checklist for the next devbox session: `chezmoi update` works bare (sourceDir); `~/.local/bin` has the ten tools; prompt renders (starship); `bat`/`rg`/`eza` abbrs work; commits sign (`git log --show-signature -1` after a commit); fish is the login shell on a NEW workspace.
