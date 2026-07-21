function tmux --wraps tmux --description 'tmux, with a sesh/fzf picker for bare `tmux` and targetless attach'
    # Only intercept interactive use outside tmux, and only when the picker
    # tooling is available — everything else behaves exactly like real tmux.
    if set -q TMUX; or not status is-interactive; or not type -q sesh; or not type -q fzf
        command tmux $argv
        return
    end

    set -l fzf_opts --ansi --reverse --height 40% --prompt '⚡ tmux > '

    # Bare `tmux`: create a session if none exist, otherwise offer the picker
    # with an explicit create option instead of silently making session "1".
    if test (count $argv) -eq 0
        if not command tmux list-sessions &>/dev/null
            command tmux
            return
        end
        set -l new_label '+ new session (here)'
        set -l choice (begin
                echo $new_label
                sesh list --icons
            end | fzf $fzf_opts)
        if test "$choice" = "$new_label"
            command tmux new-session
        else if test -n "$choice"
            sesh connect $choice
        end
        return
    end

    # `tmux a` / `tmux attach` with no target: pick the session to attach to.
    # Any extra arguments (e.g. `-t name`) fall through to real tmux below.
    if test (count $argv) -eq 1; and contains -- $argv[1] a at att attach attach-session
        set -l choice (sesh list --icons | fzf $fzf_opts --prompt '⚡ attach > ')
        test -n "$choice"; and sesh connect $choice
        return
    end

    command tmux $argv
end
