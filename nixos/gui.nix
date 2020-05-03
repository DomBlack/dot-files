#Base GUI Settings
{ config, pkgs, ... }:
{
  services.xserver = {
    enable = true;

    layout = "gb";

    videoDrivers = [ "nvidia" ];

    displayManager = {
      defaultSession = "home-manager";

      lightdm = {
        enable = true;
      };
    };

    windowManager = {
      i3 = {
        enable = true;
        
        extraPackages = with pkgs; [
          dmenu    # application launcher
          # i3status # default i3 status bar
          i3lock   # default i3 screen locker
        ];
      };
    };

    desktopManager = {
      xfce.enable = true;
      xterm.enable = false;

      # To make home-manager's i3 available in system X session
      # https://discourse.nixos.org/t/opening-i3-from-home-manager-automatically/4849/8
      session = [
        { 
          name = "home-manager";
          start = ''
            ${pkgs.runtimeShell} $HOME/.hm-xsession &
            waitPID=$!
          '';
        }
      ];
    };
  };

  # i3: If your settings aren't being saved for some applications (gtk3 applications, firefox), like the size of file selection windows, or the size of the save dialog, you will need to enable dconf
  programs.dconf.enable = true;
}