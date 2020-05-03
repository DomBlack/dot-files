# ZSH Setup
{ config, pkgs, ... }:
{
  programs.zsh = {
    enable = true;
    enableAutosuggestions = true;
    enableCompletion = true;

    dotDir = ".config/zsh";

    plugins = [
      {
        name = "zsh-syntax-highlighting";
        src = pkgs.fetchFromGitHub {
          owner = "zsh-users";
          repo = "zsh-syntax-highlighting";
          rev = "0.7.1";
          sha256 = "sha256:03r6hpb5fy4yaakqm3lbf4xcvd408r44jgpv4lnzl9asp4sb9qc0";
        };
      }
    ];

    oh-my-zsh = {
      enable = true;

      plugins = [
        "git"
        "sudo"
      ];

      theme = "steeef";
    };
  };

  programs.alacritty.settings.shell.program = "/home/dom/.nix-profile/bin/zsh";
}