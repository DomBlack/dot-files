# Dom's Dotfiles

Personal dotfiles managed with [chezmoi](https://www.chezmoi.io/).

## Setting Up a New Machine

### 1. Install Homebrew

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Install chezmoi

```bash
brew install chezmoi
```

### 3. Initialize chezmoi with these dotfiles

```bash
chezmoi init --apply DomBlack/dot-files
```

This will clone the repo and apply all dotfiles. The install script will automatically run `brew bundle` to install all packages.

---

## Chezmoi Cheat Sheet

### Daily Commands

- `chezmoi apply`; applies changes from source to home
- `chezmoi diff`; shows what would change
- `chezmoi update`; pulls latest from repo and applies

### Editing Files

- `chezmoi edit ~/.config/fish/config.fish`; edits a managed file
- `chezmoi edit --apply ~/.gitconfig`; edits and immediately applies
- `chezmoi cd`; cd into the source directory

### Adding New Files

- `chezmoi add ~/.newfile`; adds a file to be managed
- `chezmoi add --template ~/.somefile`; adds as a template
- `chezmoi forget ~/.oldfile`; stops managing a file

### Syncing Changes

- `chezmoi git status`; checks git status of source
- `chezmoi git add .`; stages all changes
- `chezmoi git commit -m "msg"`; commits changes
- `chezmoi git push`; pushes to remote

### Troubleshooting

- `chezmoi status`; shows files that differ
- `chezmoi verify`; checks if destination matches source
- `chezmoi data`; shows template data
- `chezmoi doctor`; checks for potential problems

---

## What's Included

- **Shell**: Fish shell with Starship prompt
- **Terminal**: Ghostty configuration
- **Git**: Global gitconfig and gitignore
- **CLI Tools**: Modern replacements (eza, bat, fd, ripgrep, fzf, zoxide, etc.)
