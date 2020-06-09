# GoLang Development Stuff
{ config, pkgs, ... }:
{
  programs.go = {
    enable = true;
    goPath = "go";
  };

  home.packages = with pkgs; [
    protobuf              # Protobuf Compiler
    pkgs.jetbrains.goland # IDE
  ];

  home.sessionVariables = {
    GOROOT = [ "${pkgs.go.out}/share/go" ];
    PATH = "$PATH:$HOME/go/bin";
  };
}