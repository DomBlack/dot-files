{ config, pkgs, ... }:
{
  home.packages = with pkgs; [
    yubikey-manager
  ];

  programs.gpg = {
    enable = true;
  };

  services.gpg-agent = {
    enable = true;
    enableSshSupport = true;
    enableScDaemon = true;

    defaultCacheTtl = 60;
    maxCacheTtl = 120;

    defaultCacheTtlSsh = 60;
    maxCacheTtlSsh = 120;
  };
}