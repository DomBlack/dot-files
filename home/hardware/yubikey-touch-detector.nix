{ config, lib, pkgs, ... }:
with lib;
let
  # cfg = config.services.yubikeyTouchDetector;
  nur = import ../../nur { inherit pkgs; };
in {
  # options = {
  #   service.yubikeyTouchDetector = {
  #     enable = mkEnableOption "Yubikey Touch Detector";
  #   };
  # };

  # config = mkIf cfg.enable {
  #   # home.pacakges = [ nur.yubikey-touch-detector ];

    config = {
      systemd.user.services."yubikey-touch-detector" = {
      Unit = {
        Description = "Detects when your YubiKey is waiting for a touch";
        After = [ "graphical-session-pre.target" ];
        Before = [ "polybar.target" ];
        PartOf = [ "graphical-session.target" ];
      };

      Service = {
        Type = "simple";
        ExecStart = "${nur.yubikey-touch-detector}/bin/yubikey-touch-detector";
        Environment = "PATH=${config.home.profileDirectory}/bin";
        Restart = "on-failure";
      };

      Install = {
        WantedBy = [ "graphical-session.target" "polybar.target" ];
      };
    };
  };
}