# I3 Setup
{ config, lib, pkgs, ... }:
{
  services.picom = {
    enable = true;

    blur = true;
    shadow = true;
  };
}