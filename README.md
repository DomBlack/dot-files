## Dot Files

This repo contains my ansible scripts for setitng up machines with my common dot files.

Modify the inventory file as required (by default it only runs against your local machine) and then run the playbook using:

```bash
ansible-playbook -i inventory site.yml
```


### Mac OS Setup

Once the basic MacOS setup is complete, drop into a shell and run `initialMacOSInstall.sh`

Hyperkey: After running the script, open `Karabiner-Elements` and configure CapsLock to `F18`, start Hammerspoon

#### Alfred iTerm2 Setup
```
on alfred_script(q)  
  tell application "System Events"
    -- some versions might identify as "iTerm2" instead of "iTerm"
    set isRunning to (exists (processes where name is "iTerm")) or (exists (processes where name is "iTerm2"))
  end tell
  
  tell application "iTerm"
    activate
    set hasNoWindows to ((count of windows) is 0)
    if isRunning and hasNoWindows then
      create window with default profile
    end if
    select first window
    
    tell the first window
      if isRunning and hasNoWindows is false then
        create tab with default profile
      end if
      tell current session to write text q
    end tell
  end tell

end alfred_script
```
