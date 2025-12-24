# Function to grep for processes with highlighted pattern
function psgrep
    # The grep -v removes the grep line from being detected
    ps aux | grep -v grep | grep -i --color=always -E "$(echo $argv[1] | sed 's/^\(.\)\(.*\)$/[\1]\2/')"
end
