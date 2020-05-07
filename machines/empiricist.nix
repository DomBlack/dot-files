# NixOS on Empiricist
{ config, lib, pkgs, ...}:
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
  programs.zsh.enable = true;

  users.users.dom = {
    isNormalUser = true;
    home         = "/home/dom";
    description  = "Dominic Black";
    shell        = pkgs.zsh;

    extraGroups = [ "wheel" "docker" "audio" "networkmanager" ];

    openssh.authorizedKeys.keys = [
      "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDxmyu2MDZ+TRnL60EAti//9UZWNLYvQxbXYRvRcn3XHK8/4ZW1EFqM5SuXY6tT4sf9opsOpypCYp44EgGJ0s/wpWuI4FIlUYrfqnUg2Du9gKIdShPEqv+CotllCqfNePt4GQQ1Nf7E4wdZLZ2S5KwmS7kURbE2awCPYEAubbiOgFq0hxjQrHco4yCc5AfclVNlVK0xkHQaRBD6qxBTWQUDEA29PbJiV6jp5md+BQzmUTv0Ep7TsQ9ZYlA+a7Ipym5mXzuhpSbfMlPUIeyfMDHtPYDhZdsg4aDlUoNA3p8uQc+EitBcSln7S7Xn0XDq/pY8OdmVQi4u/AyYLYJRyw3rAgEVOzMdLj8ELqeQ1/UvMgvXzxljNVTXW2t/kiUzcwkPjOKcBNzU+JHZDOWlZHDmDrMr3AJJBU3hXpuCXmlIT/mJrPp9A2TVL+4gFzaZRPSbFVt+OQTD5CPy/Bd0XqVxI+HZ2rycwrwfqyJGqbOxkoywlYaDkAGjyIpJ4cY+oHobUsXW8tx93Ot+JgP7CypBOD49cTkR+fIBKGFr0EJNkLiGZcpcUsLLQ2hOAR8MTpqcWe1LQY0/cgMx+RpU1qxKZ9T/i9+d8C7Jvnsr+JPS1m+//ng1xkDHZdlwNyvO+qzyQTIPWJBWgH+5ffk6MWPiKvTrJKfLSDJJP30VumfZRw== openpgp:0xEE96304F"
    ];
  };

  # Allow sudo of poweroff / halt / reboot commands for polybar
  security.sudo.extraRules = lib.mkAfter [ # use mkAfter so the generic "%wheel" rule comes first
     {
      users = [ "dom" ];
      commands = [
        { command = "${pkgs.systemd}/bin/poweroff"; options = [ "NOPASSWD" "SETENV" ]; }
        { command = "${pkgs.systemd}/bin/reboot"; options = [ "NOPASSWD" "SETENV" ]; }
        { command = "${pkgs.systemd}/bin/halt"; options = [ "NOPASSWD" "SETENV" ]; }
      ];
    }
  ];

  # This value determines the NixOS release from which the default
  # settings for stateful data, like file locations and database versions
  # on your system were taken. It‘s perfectly fine and recommended to leave
  # this value at the release version of the first install of this system.
  # Before changing this value read the documentation for this option
  # (e.g. man configuration.nix or on https://nixos.org/nixos/options.html).
  system.stateVersion = "20.03"; # Did you read the comment?
}