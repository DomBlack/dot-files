# GoLang Development Stuff
{ config, pkgs, ... }:
{
  home.packages = with pkgs; [
    go                    # GoLang itself
    protobuf              # Protobuf Compiler
    pkgs.jetbrains.goland # IDE
  ];
}