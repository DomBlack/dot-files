# atuin: shell history with context, local-only (no sync, no account).
# File is zz_-prefixed so it loads AFTER the fzf.fish plugin's conf.d file.
# ORDER MATTERS: fzf_configure_bindings must release Ctrl-R BEFORE atuin binds
# it — run the other way round, fzf's uninstall cycle erases atuin's binding
# and leaves Ctrl-R dead (only reproducible in interactive shells).
if command -q atuin
    if functions -q fzf_configure_bindings
        fzf_configure_bindings --history=
    end
    atuin init fish --disable-up-arrow | source
end
