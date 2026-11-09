#!/bin/sh
cd "$(dirname "$0")"
if [ ! -d "node_modules" ]; then
    npm install || exit 1
fi
node --no-lazy index
