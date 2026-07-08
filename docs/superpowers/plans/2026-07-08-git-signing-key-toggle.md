# Git SSH Signing Key Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sign git commits on this Mac with the filesystem `~/.ssh/id_ed25519` instead of 1Password, behind a per-machine `useOnePasswordSSH` chezmoi flag.

**Architecture:** A new bool in chezmoi data (prompted only on non-remote machines, pre-seeded `false` on devboxes) drives the darwin signing branches in `dot_gitconfig.tmpl`. The Mac's public key joins `allowed_signers` and gets registered on GitHub as a signing key. 1Password entries stay everywhere they're needed to verify historical commits.

**Tech Stack:** chezmoi Go templates, git SSH signing, gh CLI.

**Spec:** `docs/superpowers/specs/2026-07-08-git-signing-key-toggle-design.md`

## Global Constraints

- The 1Password public key (`ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPhcqTkGR7DbXnRvnKpmFn5MLZ1iQ+NHbp0Ak0hpR4Sd`) must remain in `allowed_signers.tmpl` and in the flag-true gitconfig branch — historical commits must keep verifying.
- The Mac filesystem key is exactly: `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICHqypSrOCug75hC++n8qS375Pqybofv23o2ME/Awqpu`
- Existing devboxes have chezmoi data WITHOUT `useOnePasswordSSH` (pre-seeded by the old install.sh), and chezmoi renders templates with `missingkey=error` — every template read of the flag must be guarded with `hasKey`.
- `commit.gpgsign = true` stays on for darwin; non-darwin branch of gitconfig is untouched.
- Do not modify `~/.ssh/config` or remove any key from GitHub.
- Commits to `main`; commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Templates — flag plumbing, gitconfig branches, allowed_signers

**Files:**
- Modify: `.chezmoi.jsonc.tmpl`
- Modify: `install.sh` (pre-seed heredoc, section 2)
- Modify: `dot_gitconfig.tmpl:1-21` (darwin signing block only)
- Modify: `private_dot_config/private_git/allowed_signers.tmpl`

**Interfaces:**
- Produces: chezmoi data key `useOnePasswordSSH` (bool; always present in NEW configs, may be absent in old devbox configs — hence `hasKey` guards).

- [x] **Step 1: Add the flag to `.chezmoi.jsonc.tmpl`**

Replace the whole file with:

```
{{ $email := promptStringOnce . "email" "What is your email address" }}
{{ $isWorkMachine := promptBoolOnce . "isWorkMachine" "Is this a work machine?" }}
{{ $isRemoteDevBox := promptBoolOnce . "isRemoteDevBox" "Is this a remote dev box?" }}
{{ $useOnePasswordSSH := false }}
{{ if not $isRemoteDevBox }}{{ $useOnePasswordSSH = promptBoolOnce . "useOnePasswordSSH" "Use 1Password for git SSH signing?" }}{{ end }}

{
    "data": {
        "email": "{{ $email }}",
        "isWorkMachine": {{ $isWorkMachine }},
        "isRemoteDevBox": {{ $isRemoteDevBox }},
        "useOnePasswordSSH": {{ $useOnePasswordSSH }},
    }
}
```

- [x] **Step 2: Add the flag to the install.sh pre-seed**

In `install.sh`, in the heredoc that writes `$CHEZMOI_CONFIG_FILE`, after the `"isRemoteDevBox"` line add:

```
        "useOnePasswordSSH": false,
```

- [x] **Step 3: Rewrite the darwin signing block in `dot_gitconfig.tmpl`**

Replace lines 1–21 (from `{{ if eq .chezmoi.os "darwin" -}}` through the second `{{- end }}` after `email`) with:

```
{{ if eq .chezmoi.os "darwin" -}}
{{- $useOnePassword := and (hasKey . "useOnePasswordSSH") .useOnePasswordSSH -}}
[gpg]
	format = ssh
[gpg "ssh"]
{{- if $useOnePassword }}
	program = /Applications/1Password.app/Contents/MacOS/op-ssh-sign
{{- else }}
	# Sign with the local ~/.ssh/id_ed25519 file via system ssh-keygen.
{{- end }}
	allowedSignersFile = {{ .chezmoi.homeDir }}/.config/git/allowed_signers
[commit]
	gpgsign = true
[user]
{{- if $useOnePassword }}
	signingkey = ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPhcqTkGR7DbXnRvnKpmFn5MLZ1iQ+NHbp0Ak0hpR4Sd
{{- else }}
	signingkey = {{ .chezmoi.homeDir }}/.ssh/id_ed25519.pub
{{- end }}
	name = Dominic Black
	email = {{ .email }}
{{ else -}}
```

(The old `isRemoteDevBox` conditionals inside this block disappear; devboxes hit the else branches naturally because their flag is false/absent. Nothing after `{{ else -}}` changes.)

- [x] **Step 4: Add the Mac key to `allowed_signers.tmpl`**

Append to `private_dot_config/private_git/allowed_signers.tmpl`:

```
# Local ~/.ssh/id_ed25519 on the Mac (filesystem signing key)
{{ .email }} ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICHqypSrOCug75hC++n8qS375Pqybofv23o2ME/Awqpu
```

- [x] **Step 5: Render all three variants and assert**

(Corrected during execution, twice: `--promptBool` keys must be the FULL prompt
string including any trailing `?` — the email prompt has none, so its key is
bare. `promptXOnce` prefers EXISTING config data over `--prompt*` flags, so the
render must use an isolated empty config to be machine-independent. And prompt
flags only affect prompt calls inside the template being rendered — so the
config template is tested with `--init` flags, and `dot_gitconfig.tmpl` is
tested against explicit data via temp config files.)

```bash
cd /Users/dom/.local/share/chezmoi
# Part A — config template prompt logic (Mac+1P / Mac+file / devbox never prompts)
printf '{}' > /tmp/cz-fresh.json
chezmoi --config /tmp/cz-fresh.json --config-format json execute-template --init \
  --promptString "What is your email address=x@y.z" \
  --promptBool "Is this a work machine?=true,Is this a remote dev box?=false,Use 1Password for git SSH signing?=true" \
  < .chezmoi.jsonc.tmpl | grep OnePassword     # → true
chezmoi --config /tmp/cz-fresh.json --config-format json execute-template --init \
  --promptString "What is your email address=x@y.z" \
  --promptBool "Is this a work machine?=true,Is this a remote dev box?=false,Use 1Password for git SSH signing?=false" \
  < .chezmoi.jsonc.tmpl | grep OnePassword     # → false
chezmoi --config /tmp/cz-fresh.json --config-format json execute-template --init \
  --promptString "What is your email address=x@y.z" \
  --promptBool "Is this a work machine?=true,Is this a remote dev box?=true" \
  < .chezmoi.jsonc.tmpl | grep OnePassword     # → false (prompt skipped)

# Part B — gitconfig branches against explicit data (incl. old devbox data lacking the flag)
mk() { printf '{"data":{"email":"x@y.z","isWorkMachine":true,%s}}' "$1" > "$2"; }
mk '"isRemoteDevBox":false,"useOnePasswordSSH":false' /tmp/cz-mac-file.json
mk '"isRemoteDevBox":false,"useOnePasswordSSH":true'  /tmp/cz-mac-1p.json
mk '"isRemoteDevBox":true'                            /tmp/cz-devbox-old.json
for c in mac-file mac-1p devbox-old; do
  echo "=== $c ==="
  chezmoi --config /tmp/cz-$c.json --config-format json execute-template < dot_gitconfig.tmpl | grep -E 'op-ssh-sign|signingkey'
done

chezmoi execute-template < private_dot_config/private_git/allowed_signers.tmpl | grep -c 'ssh-ed25519'
bash -n install.sh && echo install-ok
```

Expected: Part A `true` / `false` / `false`; Part B mac-file and devbox-old show only `signingkey = /Users/dom/.ssh/id_ed25519.pub` (no op-ssh-sign; devbox-old also proves the `hasKey` guard against old pre-seeded data), mac-1p shows op-ssh-sign + the `…R4Sd` literal; allowed_signers has `3` keys; install-ok.

- [x] **Step 6: Commit**

```bash
git add .chezmoi.jsonc.tmpl install.sh dot_gitconfig.tmpl private_dot_config/private_git/allowed_signers.tmpl
git commit -m "Add useOnePasswordSSH toggle for git signing; default to filesystem key

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

(This commit is still signed via 1Password — the machine flag flips in Task 2.)

---

### Task 2: Switch this Mac over and verify end-to-end

**Files:**
- Modify: `~/.config/chezmoi/chezmoi.jsonc` (machine-local, not in repo)
- No repo changes.

**Interfaces:**
- Consumes: Task 1's `useOnePasswordSSH` data key and template branches.

- [x] **Step 1: Set the machine flag**

Edit `~/.config/chezmoi/chezmoi.jsonc`, adding inside `"data"` after the `isRemoteDevBox` line:

```
        "useOnePasswordSSH": false,
```

- [x] **Step 2: Apply and check the rendered config**

```bash
chezmoi apply -v
git config --global gpg.ssh.program ; echo "program-exit=$?"
git config --global user.signingkey
grep -c 'ssh-ed25519' ~/.config/git/allowed_signers
```

Expected: apply updates `.gitconfig` and `.config/git/allowed_signers`; `program-exit=1` (unset); signingkey `/Users/dom/.ssh/id_ed25519.pub`; `3` signer keys.

- [x] **Step 3: Register the key on GitHub as a signing key**

```bash
gh ssh-key add ~/.ssh/id_ed25519.pub --type signing --title "Mac id_ed25519 (signing)"
gh ssh-key list | grep -i signing
```

Expected: key added (or a "key is already in use" error if previously registered — then confirm it appears in the list). The 1Password key is NOT removed.

- [x] **Step 4: End-to-end signing test in a scratch repo**

```bash
rm -rf /tmp/signtest && git init -q /tmp/signtest && cd /tmp/signtest
git commit --allow-empty -m "signing test"
git verify-commit HEAD && echo "verify-ok"
git log --show-signature -1 | head -8
```

Expected: commit succeeds with NO 1Password prompt; `verify-ok`; log shows `Good "git" signature ... ED25519` matching the `…Awqpu` key.

- [x] **Step 5: Real-repo confirmation**

The next commit in the dotfiles repo (e.g. marking the plan executed, or any pending change) is made normally and checked with `git log --show-signature -1` — Good signature from the filesystem key.
