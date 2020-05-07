{ config, lib, pkgs, ... }:
with lib;
let
  cfg = config.services.yubikey-touch-detector;
  nur = import ../../nur { inherit pkgs; };
in {
  options = {
    service.yubikey-touch-detector = {
      enable = mkEnableOption "Yubikey Touch Detector";
    };
  };

  config = mkIf cfg.enable {
    home.pacakges = [ nur.yubikey-touch-detector ];

    systemd.services.yubikey-touch-detector = {
      description = "Detects when your YubiKey is waiting for a touch";
      wantedBy    = [ "default.target" ];

      Service = {
        Type = "forking";
        ExecStart = "${nur.yubikey-touch-detector}/bin/yubikey-touch-detector";
        Restart = "on-failure";
        # EnvironmentFile = "-%E/yubikey-touch-detector/service.conf";
      };
    };
  };
}