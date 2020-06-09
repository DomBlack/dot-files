# Platform Independent Setup
{ config, pkgs, ... }:
{
  imports = [
    ./programs/editors/vscode.nix
    ./programs/editors/vim.nix
    ./programs/terminal/alacritty.nix
    ./programs/terminal/kitty.nix
    ./programs/terminal/zsh.nix
    ./roles/dev/golang.nix
    ./roles/dev/javascript.nix
    ./roles/dev/ctf.nix
    ./roles/dev/k8s.nix
    ./hardware/yubikey.nix
  ];

  home.packages = with pkgs; [
    # Common CLI tools
    htop
    git
    gnupg

    # Utils
    gnumake
    unzip
    p7zip
    libnotify # Allow desktop notifications
    scrot     # Screenshot Util

    #
    discord
    spotify
  ];

  xsession.numlock.enable = true;

  programs.git = {
    enable = true;
    userEmail = "me@jdm.black";
    userName = "Dominic Black";
    signing.key = "69E25756E8610BB1";
    signing.signByDefault = true;

    extraConfig = {
      url = {
        "git@github.com:" = {
          insteadOf = "https://github.com/";
        };
      };
    };
  };

  home.sessionVariables = {
    EDITOR = "vim";
    BROWSER = "firefox";
    TERMINAL = "kitty";
  };
}
