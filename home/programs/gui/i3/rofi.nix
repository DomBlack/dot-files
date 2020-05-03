{ config, pkgs, ...}:
{
  programs.rofi = {
    enable = true;

    terminal = "${pkgs.alacritty}/bin/alacritty";

    font = "FuraCode Nerd Font 14";

    theme = "solarized_alternate";
  };
}