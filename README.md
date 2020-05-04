# Dot Files

This repo contains my NixOS dot files

## Install

1. Add a `dom` user to the base `configuration.nix`
2. Build the system, to create the Dom user
3. Download [PragmataPro](https://www.fsd.it/my-account/downloads/)
4. Run `nix-store --add-fixed sha256 PragmataPro0.828-2.zip`
5. As `dom` run:
```bash
sudo nix-channel --add https://github.com/NixOS/nixos-hardware/archive/master.tar.gz nixos-hardware
sudo nix-channel --add https://github.com/rycee/home-manager/archive/master.tar.gz home-manager
sudo nix-channel --update

nix-shell -p git -p vim -p gnumake # To launch a shell with git and vim temporarily installed
git clone https://github.com/DomBlack/dot-files.git $HOME/dot-files
cd $HOME/dot-files
ln -s $(pwd)/home /home/dom/.config/nixpkgs
sudo mv /etc/nixos/configuration.nix /tmp/
sudo ln -s $(pwd)/machines/[COMPUTER-NAME].nix /etc/nixos/configuration.nix
make
```
