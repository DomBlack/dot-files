# Javascript Development Stuff
{ config, pkgs, ... }:
{
  home.packages = with pkgs; [
    nodejs
    pkgs.jetbrains.webstorm
  ];
}