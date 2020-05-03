# System level GPG Settings
{ config, lib, pkgs, ... }:
{
   programs.ssh.startAgent = false;
   programs.gnupg.agent = {
     enable = true;
     enableSSHSupport = true;
     enableExtraSocket = true;
     enableBrowserSocket = true;
   };


  # Enable Yubikey support (https://nixos.wiki/wiki/Yubikey)
  services.udev.packages = [ pkgs.yubikey-personalization pkgs.libu2f-host ];
  services.pcscd.enable = true;
  hardware.u2f.enable = true;
}

