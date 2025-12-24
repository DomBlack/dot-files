cli completion fish | source # Avian labs CLI

if test "$TERMINAL_EMULATOR" = "JetBrains-JediTerm"
    set -x STARSHIP_CONFIG ~/.config/starship-goland.toml
end
starship init fish | source # Starship prompt

# Added by OrbStack: command-line tools and integration
# This won't be added again if you remove it.
source ~/.orbstack/shell/init2.fish 2>/dev/null || :

fish_add_path $HOME/.local/bin
