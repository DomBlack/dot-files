# What points to install
{ config, lib, pkgs, ... }:
{
   fonts = {
    enableFontDir = true;

    fonts = with pkgs; [
      dejavu_fonts
      fira-code
      font-awesome-ttf
      google-fonts
      hack-font
      nerdfonts
      iosevka
      powerline-fonts
      material-icons
      source-code-pro
    ];
  };
}

