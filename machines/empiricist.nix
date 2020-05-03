# NixOS on Empiricist
{ config, pkgs, ...}:
{
  imports = [
    # Include the results of the hardware scan
    /etc/nixos/hardware-configuration.nix

    # Include OS specific shared settings
    ../nixos/audio.nix
    ../nixos/base.nix
    ../nixos/fonts.nix
    ../nixos/gpg.nix
    ../nixos/gui.nix
    ../nixos/home-manager.nix
  ];

  boot = {
    cleanTmpDir = true;
    
    # Use the systemd-boot EFI boot loader
    loader = {
      systemd-boot.enable = true;
      efi.canTouchEfiVariables = true;
    };
  };

  networking = {
    hostName = "empiricst";
    networkmanager.enable = true;

    # The global useDHCP flag is deprecated, therefore explicitly set to false here.
    # Per-interface useDHCP will be mandatory in the future, so this generated config
    # replicates the default behaviour.
    useDHCP = false;
    interfaces.enp8s0.useDHCP = true;
  };

  virtualisation.docker.enable = true;

  users.users.dom = {
    isNormalUser = true;
    extraGroups = [ "wheel" "docker" "audio" "networkmanager" ];
  };

  # This value determines the NixOS release from which the default
  # settings for stateful data, like file locations and database versions
  # on your system were taken. It‘s perfectly fine and recommended to leave
  # this value at the release version of the first install of this system.
  # Before changing this value read the documentation for this option
  # (e.g. man configuration.nix or on https://nixos.org/nixos/options.html).
  system.stateVersion = "20.03"; # Did you read the comment?
}