#!/usr/bin/env bash

set -x

# copy hardware js-sdk iframe files to desktop
mkdir -p ./packages/connect-examples/electron-example/public/js-sdk/
rsync ./node_modules/@onekeyfe/hd-web-sdk/build/ ./packages/connect-examples/electron-example/public/js-sdk/ --checksum  --recursive --verbose

