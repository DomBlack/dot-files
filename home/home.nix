# https://nixos.wiki/wiki/Home_Manager
#
# Stuff on this file, and ./home/*.nix, should work across all of my computing
# devices.
{ config, pkgs, ... }:
{
  # This value determines the Home Manager release that your
  # configuration is compatible with. This helps avoid breakage
  # when a new Home Manager release introduces backwards
  # incompatible changes.
  #
  # You can update Home Manager without changing this value. See
  # the Home Manager release notes for a list of state version
  # changes in each release.
  home.stateVersion = "20.03";

  # Allow Home Manager to manage itself
  nixpkgs.config.allowUnfree = true;
  programs.home-manager.enable = true;

  imports = [
    ./user.nix
    ./programs/gui/i3/i3.nix
    ./services/gpg.nix
  ];

  home.packages = with pkgs; [
    slack
  ];

  programs.google-chrome = {
    enable = true;
  };
  
  programs.firefox = {
    enable = true;
  };
}
