{ config, pkgs, ... }:
# let
#   nur = import ../../nur { inherit pkgs; };
# in {
{
  imports = [ ./yubikey-touch-detector.nix ];

  home.packages = with pkgs; [
    yubikey-manager
    # nur.yubikey-touch-detector
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

  # config = {
  #   systemd.services.yubikey-touch-detector = {
  #   enable = true;
  #   description = "Detects when your YubiKey is waiting for a touch";
  #   wantedBy    = [ "default.target" ];

  #   serviceConfig = {
  #     ExecStart = "${nur.yubikey-touch-detector}/bin/yubikey-touch-detector";
  #     EnvironmentFile = "-%E/yubikey-touch-detector/service.conf";
  #   };
  # };
  # };
}