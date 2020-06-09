# Stuff used for CFS's
{ config, pkgs, ... }:
{
  home.packages = with pkgs; [
    wireshark # Packet Analysis
    bless     # Hex Viewer
  ];
}