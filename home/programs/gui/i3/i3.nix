# I3 Setup
{ config, lib, pkgs, ... }:
let
  mod = "Mod4"; # Windows Key
in {
  imports = [
    ./polybar.nix
    ./feh.nix
    ./picom.nix
    ./rofi.nix
  ];

  xsession.enable = true;
  xsession.scriptPath = ".hm-xsession"; # Ref: https://discourse.nixos.org/t/opening-i3-from-home-manager-automatically/4849/8

  xsession.windowManager.i3 = {
    enable = true;

    package = pkgs.i3-gaps;

    config = {
      modifier = mod;

      window.border = 0;
      
      gaps = {
        inner = 15;
        outer = 5;
      };

      keybindings = lib.mkOptionDefault {
        "${mod}+d" = "exec ${pkgs.rofi}/bin/rofi -show drun -show-icons -drun-icon-theme";
      };

      bars = [];

      startup = [
        # Polybar Service
        {
          command = "systemctl --user restart polybar.service";
          always = true;
          notification = false;
        }

        # Set desktop wallpaper
        {
          command = "${pkgs.feh}/bin/feh --bg-scale ~/dot-files/files/wallpaper.jpg";
          always = true;
          notification = false;
        }
      ];
    };

    extraConfig = ''
      for_window [class="floating"] floating enable;
    '';
  };
}