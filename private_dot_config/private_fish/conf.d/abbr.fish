# cspell: disable
if status is-interactive
    # Commands to run in interactive sessions can go here

    abbr -a l 'eza -la --git --icons' # better ls
    abbr -a tree 'eza --tree --icons' # better tree
    abbr -a cat 'bat'                 # better cat  
    abbr -a find 'fd'                 # better find
    abbr -a grep 'rg'                 # better grep
end