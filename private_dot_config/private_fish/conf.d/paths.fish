fish_add_path "/Users/dom/Library/Application Support/JetBrains/Toolbox/scripts" # JetBrains Toolbox scripts
fish_add_path "/opt/homebrew/opt/libpq/bin" # Postgres binaries

eval $(/opt/homebrew/bin/brew shellenv) # Homebrew

# Load secrets from gitignored file
test -f ~/.config/fish/conf.d/secrets.fish && source ~/.config/fish/conf.d/secrets.fish
