#!/bin/bash

# Install Homebrew
/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
brew tap caskroom/cask

# Configure Machine Name

# Install Basic Stuff
# Networking
brew cask install google-chrome skype dropbox little-snitch

# Utils
brew install brew-cask-completion vim openssl mas tree
brew cask install alfred bartender iterm2 arq 1password synergy keepassx the-unarchiver fluor
brew cask install flux sequel-pro sublime-text spotify dash spotify-notifications hyperdock hyperswitch
brew cask install suspicious-package cleanmymac htop less vim nmap hammerspoon karabiner-elements
brew cask install microsoft-office

brew tap crisidev/homebrew-chunkwm
brew install chunkwm

sudo chown dom:admin -r /usr/local/bin

# Ledger SSH Agent
brew install python3
pip3 install ledger_agent

# Dev
brew install git openssh ssh-copy-id zsh ansible node
brew cask install virtualbox vagrant vagrant-manager jetbrains-toolbox
brew cask install java java-jdk-javadoc
brew install scala sbt ammonite-repl


# Git Setup
git config --global user.name "Dominic Black"
git config --global user.email "me@jdm.black"
git config --global github.user domblack
git config --global color.ui true
git config --global push.default current
git config --global core.editor "subl -n -w"

# Shell setup / dot files
mkdir ~/Workspace
cd ~/Workspace
git clone https://github.com/DomBlack/dot-files.git
cd dot-files
ansible-playbook -i inventory site.yml
sudo chsh -s /usr/local/bin/zsh dom

# Vagrant Setup
vagrant plugin install vagrant-hostsupdater
vagrant plugin install vagrant-triggers
vagrant plugin install vagrant-vbguest

# Apple Store Installs
mas install 937984704 # Amphetamine
mas install 411643860 # DaisyDisk
mas install 467939042 # Growl
mas install 475260933 # Hardware Growler
mas install 931134707 # Wire


##### Defaults ######
# Expand save panel by default
defaults write NSGlobalDomain NSNavPanelExpandedStateForSaveMode -bool true

# Save to disk (not to iCloud) by default
defaults write NSGlobalDomain NSDocumentSaveNewDocumentsToCloud -bool false

# Disable auto-correct
defaults write NSGlobalDomain NSAutomaticSpellingCorrectionEnabled -bool false

# Save screenshots to the desktop
defaults write com.apple.screencapture location -string "$HOME/Desktop"

# Save screenshots in PNG format (other options: BMP, GIF, JPG, PDF, TIFF)
defaults write com.apple.screencapture type -string "png"

# Finder: show hidden files by default
defaults write com.apple.finder AppleShowAllFiles -bool true

# Finder: show all filename extensions
defaults write NSGlobalDomain AppleShowAllExtensions -bool true

# Finder: UI stuff
defaults write com.apple.finder ShowSidebar -bool true
defaults write com.apple.finder ShowPathbar -bool false

# Display full POSIX path as Finder window title
defaults write com.apple.finder _FXShowPosixPathInTitle -bool true

# Disable the warning when changing a file extension
defaults write com.apple.finder FXEnableExtensionChangeWarning -bool false

# Use list view in all Finder windows by default
# Four-letter codes for the other view modes: `icnv`, `clmv`, `Flwv`
defaults write com.apple.finder FXPreferredViewStyle -string "Nlsv"

# Disable the warning before emptying the Trash
defaults write com.apple.finder WarnOnEmptyTrash -bool false

# Empty Trash securely by default
defaults write com.apple.finder EmptyTrashSecurely -bool true

# Enable spring loading for all Dock items
defaults write com.apple.dock enable-spring-load-actions-on-all-items -bool true

# Show indicator lights for open applications in the Dock
defaults write com.apple.dock show-process-indicators -bool true

# Don’t animate opening applications from the Dock
defaults write com.apple.dock launchanim -bool true

# Set dock tile size
defaults write com.apple.dock tilesize -int 60

# set dock tile large size
defaults write com.apple.dock largesize -int 85

# autohide dock
defaults write com.apple.dock autohide -bool true

# remove delay
defaults write com.apple.dock autohide-delay -float 0

# Speed up Mission Control animations
defaults write com.apple.dock expose-animation-duration -float 0.1

# Allow text selection in the Quick Look window
defaults write com.apple.finder QLEnableTextSelection -bool true

# Require password immediately after sleep or screen saver begins
defaults write com.apple.screensaver askForPassword -int 1
defaults write com.apple.screensaver askForPasswordDelay -int 0

# Don’t display the annoying prompt when quitting iTerm
defaults write com.googlecode.iterm2 PromptOnQuit -bool false

# Disable natural scrolling
defaults write -g com.apple.swipescrolldirection -bool false

# Disable useless dashboard
defaults write com.apple.dashboard mcx-disabled -boolean YES && killall Dock