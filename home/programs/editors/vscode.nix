# VSCode Setup
{ config, pkgs, ... }:
{
  programs.vscode = {
    enable = true;

    userSettings = {
      "[nix]"."editor.tabSize" = 2;
    };

    extensions = [
        pkgs.vscode-extensions.bbenoist.Nix
    ];
  };
}