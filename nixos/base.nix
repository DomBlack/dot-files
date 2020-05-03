# Base Settings for all NixOS machines; should be super light
{ config, pkgs, ... }:
{
  time.timeZone = "Europe/London";

  nixpkgs.config.allowUnfree = true;
}