# Mirror the pbcopy / pbpaste MacOS commands
{ config, pkgs, ... }:
{
  home.packages = with pkgs; [
    xclip
  ];

  programs.zsh.shellAliases.pbcopy  = "xclip -selection clipboard";
  programs.zsh.shellAliases.pbpaste = "xclip -selection clipboard -o";
}