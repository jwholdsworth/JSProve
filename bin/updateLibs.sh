#!/bin/bash

## Helper function ##
function logError {
    echo -e "\033[1;31m[ERROR] $1\033[0m";
    exit 1;
}

# get PWD
cwd="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# download the latest micro-siril libraries
cd /tmp/ && wget http://www.ringsoft.co.uk/change-ringers/ringing-programs/microsiril/method-libraries/mslibs.zip > /dev/null 2>&1 || logError 'Could not download the MicroSiril libraries'

# unzip them
unzip mslibs.zip -d lib/ > /dev/null 2>&1 || logError 'Something went wrong unzipping the MicroSiril libraries'

# remove ridiculous windows characters
dos2unix lib/* > /dev/null 2>&1 || logError 'There was a problem converting the libraries to Unix format'

# copy the cleansed libraries to the lib directory
cp lib/* $cwd/../lib/

echo -e "\033[1;32m[SUCCESS] The MicroSiril libraries have been updated. You will now need to commit them, and deploy them to the server.\033[0m";
