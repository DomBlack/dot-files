
-- A global variable for the Hyper Mode
k = hs.hotkey.modal.new({}, "F17")

function kwmc(s)
  hs.execute("/usr/local/bin/chunkc " .. s)
  k.triggered = true
end

hyperBindings = {'TAB','§'}

for i,key in ipairs(hyperBindings) do
  k:bind({}, key, nil, function() hs.eventtap.keyStroke({'cmd','alt','shift','ctrl'}, key)
    k.triggered = true
  end)
end

k:bind('', 'r', nil, function()
  kwmc("tiling::desktop --rotate 90")
end)

-- move focus to screen on left
k:bind('', '1', nil, function() 
  -- kwmc("window -m display 2")
  kwmc("tiling::window --send-to-monitor 2")
end)

-- move focus to screen in middle
k:bind('', '2', nil, function()
--  kwmc("window -m display 0")
  kwmc("tiling::window --send-to-monitor 0")
end)

-- move focus to screen on right
k:bind('', '3', nil, function()
--  kwmc("window -m display 1")
  kwmc("tiling::window --send-to-monitor 1")
end)

-- move focus to screen on left
k:bind('', '0', nil, function()
  kwmc("tiling::monitor -f 2")
end)

-- move focus to screen in middle
k:bind('', '-', nil, function()
  kwmc("tiling::monitor -f 0")
end)

-- move focus to screen on right
k:bind('', '=', nil, function()
  kwmc("tiling::monitor -f 1")
end)

-- move window up
k:bind('', 'w', nil, function()
  kwmc("tiling::window --swap north")
end)

-- move window left
k:bind('', 'a', nil, function()
  kwmc("tiling::window --swap west")
end)

-- move window down
k:bind('', 's', nil, function()
  kwmc("tiling::window --swap south")
end)

-- move window right
k:bind('', 'd', nil, function()
  kwmc("tiling::window --swap east")
end)

-- move focus to the next window 
k:bind('', 'return', nil, function()
  kwmc("tiling::window --focus next")
end)

-- move window to the space left
k:bind('', 'left', nil, function()
  kwmc("tiling::window --send-to-desktop prev")
  hs.eventtap.keyStroke({'ctrl'}, 'left')
end)

-- move window to the space right
k:bind('', 'right', nil, function()
  kwmc("tiling::window --send-to-desktop next")
  hs.eventtap.keyStroke({'ctrl'}, 'right')
end)

-- make all windows same size
k:bind('', 'e', nil, function()
  kwmc("tiling::desktop --equalize")
end)

-- toggle the current windows floating
k:bind('', 't', nil, function()
  kwmc("tiling::window --toggle float")
end)

k:bind('', 'space', nil, function()
  hs.osascript.applescript('tell application "iTerm2" to create window with  default profile')
  k.triggered = true
end)

-- HYPER+L: Open news.google.com in the default browser
lfun = function()
  news = "app = Application.currentApplication(); app.includeStandardAdditions = true; app.doShellScript('open http://news.google.com')"
  hs.osascript.javascript(news)
  k.triggered = true
end
k:bind('', 'l', nil, lfun)

-- Enter Hyper Mode when F18 (Hyper/Capslock) is pressed
pressedF18 = function()
  k.triggered = false
  k:enter()
end

-- Leave Hyper Mode when F18 (Hyper/Capslock) is pressed,
--   send ESCAPE if no other keys are pressed.
releasedF18 = function()
  k:exit()
  if not k.triggered then
    hs.eventtap.keyStroke({}, 'ESCAPE')
  end
end

-- Bind the Hyper key
f18 = hs.hotkey.bind({}, 'F18', pressedF18, releasedF18)
