{ config, pkgs, ... }:
{
  programs.vim = {
    enable = true;

    plugins = [
      pkgs.vimPlugins.vim-nix
      pkgs.vimPlugins.rainbow
    ];
  };
}