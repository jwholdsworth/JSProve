#!/bin/bash

cwd="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

cd /tmp/
wget http://www.ringsoft.co.uk/change-ringers/ringing-programs/microsiril/method-libraries/mslibs.zip
unzip mslibs.zip -d lib/
cp lib/* $cwd/../lib/
