# Platform Independent Setup
{ config, pkgs, ... }:
{
  imports = [
    ./programs/editors/vscode.nix
    ./programs/editors/vim.nix
    ./programs/terminal/alacritty.nix
    ./programs/terminal/kitty.nix
    ./programs/terminal/zsh.nix
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
  ];

  xsession.numlock.enable = true;

  programs.git = {
    enable = true;
    userEmail = "me@jdm.black";
    userName = "Dominic Black";
    signing.key = "3559716616AA57E6";
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
