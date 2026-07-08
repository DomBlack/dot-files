# Dotfiles 2026 refresh — design

Date: 2026-07-08
Status: approved pending user review

## Goal

Fix the audit findings the user approved, close the Linux-devbox provisioning gap
with chezmoi externals, and adopt the 2026 tooling picks: mise (replacing the nvm
stack), atuin (local-only), modern git defaults, and managed AI-agent configs.

Explicitly kept as-is by user decision: global `GOFLAGS` debug flags (deliberate —
add a comment marking the choice), the full `dot_vimrc`, no jj/tpm/SOPS.

## Scope

### 1. Editor: full swap to VS Code (A2)
- Brewfile: replace `cask "cursor"` with `cask "visual-studio-code"`.
- `conf.d/variables.fish.tmpl`: `$EDITOR` `cursor` → `code` (darwin desktop branch).
- `dot_gitconfig.tmpl`: `editor = code --wait` is now correct — unchanged.

### 2. Devbox commit signing (A3)
- Non-darwin branch of `dot_gitconfig.tmpl` currently sets `gpgsign = false`; give
  it the same SSH-signing config as the darwin filesystem-key branch:
  `[gpg] format = ssh`, `allowedSignersFile`, `signingkey = ~/.ssh/id_ed25519.pub`,
  `gpgsign = true`.
- No gh CLI needed on devboxes: the devbox public key is already registered on
  GitHub as a signing key. Caveat documented in the template: a future devbox with
  a different keypair shows "Unverified" on GitHub until its key is registered
  from an authed machine.

### 3. starship-goland from shared template (A4)
- Delete the hand-forked `private_dot_config/starship-goland.toml`; replace with
  `starship-goland.toml.tmpl` = `{{ template "starship.toml" (dict "tmuxVariant" false) }}`
  (full config, same as starship.toml). Fish's JetBrains override keeps pointing at
  the same target path, so no fish changes.

### 4. Consolidate global gitignore to XDG (A5)
- Move `dot_gitignore` content into `private_dot_config/private_git/ignore`
  (merging its existing line, deduped).
- Remove `core.excludesfile` from `dot_gitconfig.tmpl` (git reads
  `~/.config/git/ignore` by default).
- Add `.gitignore` to a new `.chezmoiremove` so the orphaned `~/.gitignore` is
  cleaned up on every machine; delete `dot_gitignore` from the source.

### 5. Small hygiene fixes (A6)
- `conf.d/paths.fish.tmpl`: replace hardcoded `/Users/dom` with `{{ .chezmoi.homeDir }}`.
- `.chezmoiignore`: exclude `.config/ghostty` on remote devboxes
  (`{{ if .isRemoteDevBox }}` block).
- `run_once_enable-and-switch-to-fish.sh`: probe `sudo -n true` before the sudo
  calls (skip with a warning when passwordless sudo is unavailable), and determine
  the current login shell via `getent passwd`/`dscl` instead of `$SHELL`.

### 6. Devbox CLI provisioning via chezmoi externals (B)
- New `.chezmoiexternal.toml.tmpl`, active only when NOT darwin: downloads pinned
  release archives into `~/.local/bin` for: eza, bat, fd, ripgrep, fzf, zoxide,
  git-delta, starship, atuin, mise. `refreshPeriod = "168h"`, exact pinned
  versions with linux-x86_64 (musl where offered) artifacts, `executable = true`,
  archive `stripComponents`/`path` per project layout.
- macOS keeps getting these from the Brewfile (add missing `brew "atuin"`,
  `brew "mise"`; remove `brew "nvm"`).
- `install.sh`: extend the best-effort apt block to also install `fish` (tmux
  pattern reused), since fish cannot ship as a single static binary.
- Rationale: no sudo needed for the CLI set, pinned + reproducible, one file
  makes every devbox match the Mac.

### 7. mise replaces the nvm stack (C1)
- Remove: `nvm.fish` from `fish_plugins`, `conf.d/nvm-auto.fish`, `brew "nvm"`.
- Add: `conf.d/mise.fish` (`mise activate fish | source`, guarded on command
  presence), managed `~/.config/mise/config.toml` with
  `idiomatic_version_file_enable_tools = ["node"]` so work `.nvmrc` files keep
  working unchanged.
- Node versions previously installed by nvm remain on disk but unmanaged; mise
  installs its own on first `.nvmrc` encounter.

### 8. atuin, local-only (C2)
- `conf.d/atuin.fish`: `atuin init fish --disable-up-arrow | source` (Ctrl-R only;
  arrow keys unchanged), guarded on command presence.
- Managed `~/.config/atuin/config.toml`: `search_mode = "fuzzy"`,
  `auto_sync = false`, `update_check = false`, `sync_address = ""` left unset —
  no account, no sync, no AI features.
- fzf.fish conflict: add `fzf_configure_bindings --history=` (in `conf.d/fzf.fish`
  or the atuin conf.d file) so fzf.fish releases Ctrl-R to atuin; all other
  fzf.fish bindings (Ctrl-T files, etc.) unchanged.

### 9. Modern git defaults (C3)
Add to `dot_gitconfig.tmpl` (all platforms):
`column.ui=auto`, `branch.sort=-committerdate`, `tag.sort=version:refname`,
`init.defaultBranch=main`, `diff.algorithm=histogram`, `diff.colorMoved=plain`,
`diff.mnemonicPrefix=true`, `push.autoSetupRemote=true`, `push.followTags=true`,
`rerere.enabled=true`, `rerere.autoupdate=true`, `rebase.autoStash=true`,
`rebase.updateRefs=true`, `commit.verbose=true`, `help.autocorrect=prompt`.
Existing `push.default=current`, `fetch.prune=true`, `merge.conflictStyle=zdiff3`,
delta config stay.

### 10. Managed AI-agent configs (C4)
- `chezmoi add ~/.claude/CLAUDE.md` → managed global Claude instructions.
- `~/.codex/config.toml` → managed as a template; the macOS-specific `notify`
  line (computer-use app path) wrapped in `{{ if eq .chezmoi.os "darwin" }}`.
- `~/.claude/settings.json` stays on the existing modify-script merge; runtime
  dirs (projects/, history, sessions) remain unmanaged.

### 11. Persist chezmoi sourceDir on Coder workspaces
Coder clones the repo to `~/.config/coderv2/dotfiles` and `install.sh` runs
`chezmoi init --apply --source=<that dir>`, but `--source` is never persisted —
a later bare `chezmoi update` looks in the default `~/.local/share/chezmoi`,
which doesn't exist, and fails.
- `install.sh`: add top-level `"sourceDir": "${SCRIPT_DIR}"` to the pre-seeded
  `chezmoi.jsonc` (sibling of `"data"`).
- `.chezmoi.jsonc.tmpl`: add `"sourceDir": {{ .chezmoi.sourceDir | quote }}`
  so a config regenerated by `chezmoi init` (e.g. after the "config file
  template has changed" warning) keeps pointing at the right clone.
- Verification: fresh-config render shows sourceDir; on the Mac the value is
  `~/.local/share/chezmoi` (harmless no-op); simulated Coder flow in /tmp shows
  bare `chezmoi update`/`apply` resolving the non-default source.

## Verification

- Render every changed template for all three data variants (Mac, Mac+1P, devbox)
  — parse checks (`git config` via scratch GIT_CONFIG_GLOBAL, `starship
  print-config`, `fish -n`, tmux unaffected).
- `.chezmoiexternal` validated by running `chezmoi apply` in a Linux container or,
  minimally, `chezmoi execute-template` + URL HEAD checks for every pinned asset.
- mise: in a scratch dir with `.nvmrc`, `mise` resolves the node version.
- atuin: Ctrl-R binding present in fish, fzf Ctrl-T still bound, no sync configured.
- Live `chezmoi apply` on the Mac + spot checks; devbox verification deferred to
  the user's next devbox session.

## Out of scope

- age-encrypted secrets (revisit after this lands — user deferred C5).
- `~/.ssh/config`, Karabiner, macOS defaults-write, zsh fallback, tmux-resurrect.
- vimrc and GOFLAGS (kept as-is by explicit user decision).
