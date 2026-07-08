function with_progress --description "Run a command with a native terminal progress indicator (Ghostty, OSC 9;4)"
    # 9;4;3 = indeterminate progress in the window chrome; 9;4;0 clears it.
    # Harmless no-op escape on terminals that don't support ConEmu OSC 9;4.
    printf '\e]9;4;3;0\a'
    $argv
    set -l st $status
    printf '\e]9;4;0;0\a'
    return $st
end
