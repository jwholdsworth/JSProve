#!/bin/bash

## Helper function ##
function logError {
    echo -e "\033[1;31m[ERROR] $1\033[0m";
    exit 1;
}

# get parent directory of script
cwd=$(cd $(dirname "${BASH_SOURCE[0]}")/.. && pwd)

# download the latest micro-siril libraries
curl -o /tmp/CCCBR_methods.mslibs.zip https://methods.cccbr.org.uk/CCCBR_methods.mslibs.zip > /dev/null 2>&1 || logError 'Could not download the MicroSiril libraries'

# extract them into the lib folder
unzip -o -j /tmp/CCCBR_methods.mslibs.zip 'mslibs/*' -d $cwd/lib/ > /dev/null 2>&1 || logError 'Something went wrong unzipping the MicroSiril libraries'

# remove ridiculous windows characters
dos2unix $cwd/lib/* > /dev/null 2>&1 || logError 'There was a problem converting the libraries to Unix format'

echo -e "\033[1;32m[SUCCESS] The MicroSiril libraries have been updated. You will now need to commit them, and deploy them to the server.\033[0m";
