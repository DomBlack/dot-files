# Stuff used for Kubernetes
{ config, pkgs, ... }:
{
  home.packages = with pkgs; [
    kubectl
  ];
}