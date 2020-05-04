# VSCode Setup
{ config, pkgs, ... }:
{
  programs.vscode = {
    enable = true;

    userSettings = {
      "[nix]"."editor.tabSize" = 2;

      # Font Settings
      "editor.fontFamily" = "PragmataPro Liga";
      "editor.fontLigatures" = true; # Enables >= != to be rendered nicely
      "editor.fontSize" = 14;

      "editor.formatOnPaste" = true;
      "editor.formatOnSave" = true;
      "editor.cursorBlinking" = "smooth";

      "workbench.editor.highlightModifiedTabs" = true;

      "files.autoSave" = "onWindowChange";
      "files.trimFinalNewLines" = true;
    };

    extensions = [
        pkgs.vscode-extensions.bbenoist.Nix
    ];
  };
}