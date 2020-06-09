# Kitty Setup
{ config, pkgs, ... }:
{
  programs.kitty = {
    enable = true;

    font = {
      name = "PragmataPro Mono Liga 12";
    };

    settings = {
      shell = "zsh";
      editor = "vim";
      term = "xterm-256color";

      font_family = "PragmataPro Mono Liga";
      font_size = 12;
      disable_ligatures = "never";

      background_opacity = "0.95";

      window_padding_width = 10;

      tab_bar_edge  = "top";
      tab_bar_style = "powerline";

      foreground = "#fffbf6";
      background = "#101421";

      # Black
      color0 = "#2e2e2e";
      color8 = "#565656";

      # Red
      color1 = "#eb4129";
      color9 = "#ec5357";

      # Green
      color2 = "#abe047";
      color10 = "#c0e17d";

      # Yellow
      color3 = "#f6c744";
      color11 = "#f9da6a";

      # Blue
      color4 = "#47a0f3";
      color12 = "#49a4f8";

      # Magenta
      color5 = "#7b5cb0";
      color13 = "#a47de9";

      # Cyan
      color6 = "#64dbed";
      color14 = "#99faf2";

      # White
      color7= "#e5e9f0";
      color15 = "#ffffff";
    };
  };

  #   settings = {
  #     # env = {
  #     #   "TERM" = "xterm-256color";
  #     # };

  #     # background_opacity = 0.95;

  #     # window = {
  #     #   padding.x = 10;
  #     #   padding.y = 0;
  #     #   decorations = "full"; # or none
  #     # };

  #     font = {
  #       size = 10.0;
  #       use_thin_strokes = true;

  #       normal.family = "PragmataPro Mono Liga";
  #       # bold.family = "FiraCode Nerd Font";
  #       # italic.family = "FiraCode Nerd Font";
  #     };

  #     # iTerm 2 Colour Scheme
  #     colors = {
  #       primary = {
  #         background = "0x101421";
  #         foreground = "0xfffbf6";
  #       };

  #       normal = {
  #         black = "0x2e2e2e";
  #         red = "0xeb4129";
  #         green = "0xabe047";
  #         yellow = "0xf6c744";
  #         blue = "0x47a0f3";
  #         magenta = "0x7b5cb0";
  #         cyan = "0x64dbed";
  #         white = "0xe5e9f0";
  #       };

  #       bright = {
  #         black = "0x565656";
  #         red = "0xec5357";
  #         green = "0xc0e17d";
  #         yellow = "0xf9da6a";
  #         blue = "0x49a4f8";
  #         magenta = "0xa47de9";
  #         cyan = "0x99faf2";
  #         white = "0xffffff";
  #       };
  #     };
  #   };
  # };
}