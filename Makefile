all:	nix-switch
	 	@echo

nix-switch:
		sudo nixos-rebuild switch

nix-upgrade:
		sudo nix-channel --update
		sudo nixos-rebuild switch --upgrade