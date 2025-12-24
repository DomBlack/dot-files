# CD to a project directory with tab completion
set -g PRJ_PATHS ~/src/github.com/avianlabs/backend ~/src/github.com/avianlabs/ ~/src/github.com/DomBlack 
function prj
    # Try to find the directory in each of the project paths
    for path in $PRJ_PATHS
        if test -d $path/$argv[1]
            cd $path/$argv[1]
            return 0
        end
    end
    
    # If we reach here, the directory wasn't found
    echo "Directory not found: $argv[1]"
    return 1
end
complete -c prj -f -a "(find $PRJ_PATHS -maxdepth 1 -type d -not -path '*/\.*' | sed 's|.*/||')"
