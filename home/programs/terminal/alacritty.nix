# Alacritty Setup
{ config, pkgs, ... }:
{
  programs.alacritty = {
    enable = true;

    settings = {
      env = {
        "TERM" = "xterm-256color";
      };

      background_opacity = 0.95;

      window = {
        padding.x = 10;
        padding.y = 0;
        decorations = "full"; # or none
      };

      font = {
        size = 10.0;
        use_thin_strokes = true;

        normal.family = "PragmataPro Mono Liga";
        # bold.family = "FiraCode Nerd Font";
        # italic.family = "FiraCode Nerd Font";
      };

      # iTerm 2 Colour Scheme
      colors = {
        primary = {
          background = "0x101421";
          foreground = "0xfffbf6";
        };

        normal = {
          black = "0x2e2e2e";
          red = "0xeb4129";
          green = "0xabe047";
          yellow = "0xf6c744";
          blue = "0x47a0f3";
          magenta = "0x7b5cb0";
          cyan = "0x64dbed";
          white = "0xe5e9f0";
        };

        bright = {
          black = "0x565656";
          red = "0xec5357";
          green = "0xc0e17d";
          yellow = "0xf9da6a";
          blue = "0x49a4f8";
          magenta = "0xa47de9";
          cyan = "0x99faf2";
          white = "0xffffff";
        };
      };
    };
  };

#     settings = ''
# # Colors (Molokai Dark)
# colors:
#   # Default colors
#   primary:
#     background: '#1B1D1E'
#     foreground: '#F8F8F2'
#   # Normal colors
#   normal:
#     black:   '#333333'
#     red:     '#C4265E'
#     green:   '#86B42B'
#     yellow:  '#B3B42B'
#     blue:    '#6A7EC8'
#     magenta: '#8C6BC8'
#     cyan:    '#56ADBC'
#     white:   '#E3E3DD'
#   # Bright colors
#   bright:
#     black:   '#666666'
#     red:     '#F92672'
#     green:   '#A6E22E'
#     yellow:  '#E2E22E'
#     blue:    '#819AFF'
#     magenta: '#AE81FF'
#     cyan:    '#66D9EF'
#     white:   '#F8F8F2'
#     '';
#   };
}