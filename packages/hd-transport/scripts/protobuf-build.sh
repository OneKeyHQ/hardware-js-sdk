#!/usr/bin/env bash

set -euxo pipefail

echo $#

PARENT_PATH=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )

# Updated to use onekey-protocol instead of firmware
SRC="../../submodules/onekey-protocol/protob"
DIST="."
LANG="typescript"

if [[ $# -ne 0 && $# -ne 3 ]]
    then
        echo "must provide either 3 or 0 arguments. $# provided"
        exit 1
fi

if [[ $# -eq 3 ]]
    then
        SRC=$1
        DIST=$2
        LANG=$3
fi

if [[ "$LANG" != "typescript" && "$LANG" != "flow" ]];
    then
        echo "either typescript or flow must be specified as the third argument"
        exit 1
fi

# Check if messages.json already exists in onekey-protocol
ONEKEY_PROTOCOL_PATH="../../submodules/onekey-protocol"
MESSAGES_JSON_PATH="$ONEKEY_PROTOCOL_PATH/messages.json"

if [ -f "$MESSAGES_JSON_PATH" ]; then
    echo "Using existing messages.json from onekey-protocol submodule"
    cp "$MESSAGES_JSON_PATH" "$DIST/messages.json"
else
    echo "No existing messages.json found in onekey-protocol, generating from .proto files"
    
    # BUILD combined messages.proto file from protobuf files
    # this code was copied from ./submodules/onekey-protocol/protob Makekile
    # clear protobuf syntax and remove unknown values to be able to work with proto2js
    echo 'syntax = "proto2";' > $DIST/messages.proto
    echo 'import "google/protobuf/descriptor.proto";' >> $DIST/messages.proto
    echo "Build proto file from $SRC"
    # First pass - save to temp file for inspection
    grep -hv -e '^import ' -e '^syntax' -e '^package' -e 'option java_' $SRC/messages*.proto \
    | sed 's/ hw\.onekey\.messages\.onekey\./ /' \
    | sed 's/ hw\.onekey\.messages\.common\./ /' \
    | sed 's/ common\./ /' \
    | sed 's/ ethereum_definitions\./ /' \
    | sed 's/ management\./ /' \
    | sed 's/ onekey\./ /' \
    | sed 's/^option /\/\/ option /' \
    | grep -v '    reserved '>> $DIST/messages.proto

    echo "Converting proto to JSON..."
    # Convert proto to JSON with type conversion:
    # --force-number: converts float/double to number
    # --force-long: converts int64/uint64 to number
    # Other types are automatically converted:
    # - string -> string
    # - bytes -> Uint8Array
    # - bool -> boolean
    # - int32/uint32 -> number
    # npx pbjs -t json --force-number --force-long -p $DIST -o $DIST/messages.json --keep-case messages.proto
    npx pbjs -t json -p $DIST -o $DIST/messages.json --keep-case messages.proto
    rm $DIST/messages.proto
fi

echo "generating type definitions for: $LANG"

cd "$PARENT_PATH"

node ./protobuf-types.js $LANG

yarn prettier --write messages.json
yarn prettier --write **/messages.ts
echo "Build process completed."
