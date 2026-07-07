# Inside tmux the status line owns git status — use the git-less starship
# config so the prompt stays short and fast. Never clobber an explicit choice
# (e.g. the GoLand config).
if set -q TMUX; and not set -q STARSHIP_CONFIG
    set -gx STARSHIP_CONFIG ~/.config/starship-tmux.toml
end
