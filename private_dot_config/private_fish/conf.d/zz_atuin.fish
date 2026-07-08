# atuin: shell history with context, local-only (no sync, no account).
# File is zz_-prefixed so it loads AFTER the fzf.fish plugin's conf.d file:
# we hand Ctrl-R to atuin and keep every other fzf.fish binding.
if command -q atuin
    atuin init fish --disable-up-arrow | source
    if functions -q fzf_configure_bindings
        fzf_configure_bindings --history=
    end
end
