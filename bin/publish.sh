#!/bin/bash
# Set the publish directory (web facing dir)
docroot="/home/james/Documents/jsprove"

# Merge JS files then minify them
cat ../js/*.js > $docroot/js/js.js
java -jar yuicompressor.jar --nomunge $docroot/js/js.js -o $docroot/js/js.js

# Merge CSS files then minify them
cat ../css/*.css > $docroot/css/css.css
java -jar yuicompressor.jar $docroot/css/css.css -o $docroot/css/css.css

# Remove JS files from index.html and replace with js.js
#cat ../index.html | grep -v "<script " > $docroot/index.html
# Remove new lines and tabs from HTML file
cat ../index.html | tr -d '\n' | tr -d '\t' > $docroot/index.html
