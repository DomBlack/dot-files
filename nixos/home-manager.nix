# Enable Home Manager
{ config, pkgs, ... }:
{
  imports = [
    <home-manager/nixos>
  ];

  home-manager.users.dom = (import ../home/home.nix);
}
