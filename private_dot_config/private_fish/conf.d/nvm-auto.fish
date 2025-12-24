# Auto-activate .nvmrc / .node-version when changing directories
# This is separate from the Fisher-managed nvm.fish
function _nvm_auto_use --on-variable PWD
    if test -f .nvmrc
        set -l requested (string trim < .nvmrc)
        # Only switch if different from current version
        if not string match -q "$requested*" "$nvm_current_version"
            nvm use --silent $requested
        end
    else if test -f .node-version
        set -l requested (string trim < .node-version)
        if not string match -q "$requested*" "$nvm_current_version"
            nvm use --silent $requested
        end
    end
end

