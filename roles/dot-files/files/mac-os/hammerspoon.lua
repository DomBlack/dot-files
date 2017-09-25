
-- A global variable for the Hyper Mode
k = hs.hotkey.modal.new({}, "F17")

function kwmc(s)
  hs.execute("/usr/local/bin/kwmc " .. s)
  k.triggered = true
end

hyperBindings = {'TAB','§'}

for i,key in ipairs(hyperBindings) do
  k:bind({}, key, nil, function() hs.eventtap.keyStroke({'cmd','alt','shift','ctrl'}, key)
    k.triggered = true
  end)
end

k:bind('', 'r', nil, function()
  kwmc("tree rotate 90")
end)

-- move focus to screen on left
k:bind('', '1', nil, function()
  -- kwmc("window -m display 2")
  kwmc("display -f 2")
end)

-- move focus to screen in middle
k:bind('', '2', nil, function()
--  kwmc("window -m display 0")
  kwmc("display -f 0")
end)

-- move focus to screen on right
k:bind('', '3', nil, function()
--  kwmc("window -m display 1")
  kwmc("display -f 1")
end)

-- move focus to screen on left
k:bind('', '0', nil, function()
  kwmc("window -m display 2")
end)

-- move focus to screen in middle
k:bind('', '-', nil, function()
  kwmc("window -m display 0")
end)

-- move focus to screen on right
k:bind('', '=', nil, function()
  kwmc("window -m display 1")
end)

-- attempt to change window size 
k:bind('', 'q', nil, function()
  kwmc("window -c reduce 0.05 east")
end)

k:bind('', 'e', nil, function()
  kwmc("window -c expand 0.05 east")
end)

-- move window up
k:bind('', 'w', nil, function()
  kwmc("window -s north")
end)

-- move window left
k:bind('', 'a', nil, function()
  kwmc("window -s west")
end)

-- move window down
k:bind('', 's', nil, function()
  kwmc("window -s south")
end)

-- move window right
k:bind('', 'd', nil, function()
  kwmc("window -s east")
end)

-- move focus to the next window 
k:bind('', 'return', nil, function()
  kwmc("window -f next")
end)

-- move window to the space left
k:bind('', 'left', nil, function()
  kwmc("window -m space left")
  hs.eventtap.keyStroke({'ctrl'}, 'left')
end)

-- move window to the space right
k:bind('', 'right', nil, function()
  kwmc("window -m space right")
  hs.eventtap.keyStroke({'ctrl'}, 'right')
end)

-- toggle the current windows floating
k:bind('', 't', nil, function()
  kwmc("window -t focused")
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
