#!/bin/bash
# Set the publish directory (web facing dir)
docroot="/home/james/www/projects/jsprove"
cwd="$( cd "$( dirname "${BASH_SOURCE[1]}" )" && pwd )"

rsync -a --del --exclude 'bin' --exclude '.git*' --exclude 'nbproject' -e "ssh -p26" $cwd/ james@cheshire:$docroot
