# Git SSH signing: 1Password toggle + filesystem key on this Mac — design

Date: 2026-07-08
Status: approved pending user review

## Goal

Stop using 1Password for git commit signing on this Mac, signing instead with the
existing filesystem key `~/.ssh/id_ed25519`. Keep 1Password signing available as a
per-machine opt-in for other non-remote machines (remote devboxes never have
1Password and always sign with their local key).

## Current state

- `dot_gitconfig.tmpl` (darwin, non-devbox): signs via
  `/Applications/1Password.app/Contents/MacOS/op-ssh-sign` with a hardcoded
  1Password-held public key (`…R4Sd`).
- Devboxes: sign with `~/.ssh/id_ed25519.pub`, no program override.
- This Mac's `~/.ssh/id_ed25519.pub` is `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICHqypSrOCug75hC++n8qS375Pqybofv23o2ME/Awqpu dom@avianlabs.net`
  — used for SSH auth already, but not yet in `allowed_signers` nor registered on
  GitHub as a signing key.
- `~/.ssh/config` is NOT chezmoi-managed; its single-host 1Password IdentityAgent
  entry is explicitly out of scope.

## Design

1. **New chezmoi data flag `useOnePasswordSSH`** (bool).
   - `.chezmoi.jsonc.tmpl`: prompt via `promptBoolOnce` ONLY when the machine is
     not a remote devbox; devboxes get `false` without a prompt.
   - `install.sh` (devbox pre-seed): add `"useOnePasswordSSH": false` to the
     generated config so the data key always exists.
   - This Mac's live `~/.config/chezmoi/chezmoi.jsonc`: set `false`.
2. **`dot_gitconfig.tmpl`**: the darwin signing branches switch from
   `isRemoteDevBox` to the combined condition — 1Password program line and
   hardcoded signingkey only when `(not .isRemoteDevBox) and .useOnePasswordSSH`;
   otherwise `signingkey = {{ .chezmoi.homeDir }}/.ssh/id_ed25519.pub` with no
   program override (git uses ssh-keygen). `commit.gpgsign = true` unchanged.
3. **`allowed_signers.tmpl`**: add this Mac's key (`…Awqpu`) as a third entry.
   The 1Password key entry stays so historical commits still verify.
4. **GitHub**: register `~/.ssh/id_ed25519.pub` as a signing key via
   `gh ssh-key add ~/.ssh/id_ed25519.pub --type signing --title "Mac id_ed25519 (signing)"`.
   The 1Password key stays registered so old commits remain Verified on GitHub.

## Verification

- Render `dot_gitconfig.tmpl` for: Mac with flag false (expect file-key signing, no
  op-ssh-sign), hypothetical machine with flag true (expect current 1Password
  config), devbox (unchanged).
- `chezmoi apply`, then in a scratch repo: make a commit, `git verify-commit HEAD`,
  and `git log --show-signature -1` shows a Good signature from the file key.
- A real signed commit in the dotfiles repo succeeds without 1Password prompting.

## Out of scope

- `~/.ssh/config` IdentityAgent entry for host 49.12.213.60 (not chezmoi-managed).
- Removing the 1Password key from GitHub or allowed_signers.
- SSH auth changes (already filesystem-key based).
