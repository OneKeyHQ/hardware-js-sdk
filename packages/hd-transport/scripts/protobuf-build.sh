#!/usr/bin/env bash

set -euxo pipefail

echo $#

PARENT_PATH=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )
PACKAGE_ROOT="$PARENT_PATH/.."

SRC="../../submodules/firmware/common/protob"
DIST="."
LANG="typescript"
# Absolute paths — resolved relative to this script's directory
REPO_ROOT="$PARENT_PATH/../../.."
CORE_MESSAGES_DIR="$REPO_ROOT/packages/core/src/data/messages"

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

if [[ "$SRC" = /* ]]; then
    SRC_PATH="$SRC"
else
    SRC_PATH="$PACKAGE_ROOT/$SRC"
fi

if [[ "$DIST" = /* ]]; then
    DIST_PATH="$DIST"
else
    DIST_PATH="$PACKAGE_ROOT/$DIST"
fi

# Remove temp proto files on any exit, including failure paths
trap 'rm -f "$DIST_PATH/messages-tmp.proto" "$PARENT_PATH/messages-protocol-v2-tmp.proto"' EXIT


# ============================================================
# BUILD Pro1 messages.json  (requires firmware submodule)
# ============================================================
# Combines all messages*.proto files from firmware submodule into
# messages.json, then copies to core package.
if [ -d "$SRC_PATH" ] && ls "$SRC_PATH"/messages*.proto 1>/dev/null 2>&1; then
    echo "=== Building Pro1 (legacy) protobuf messages ==="
    TMP_PROTO="$DIST_PATH/messages-tmp.proto"
    echo 'syntax = "proto2";' > "$TMP_PROTO"
    echo 'import "google/protobuf/descriptor.proto";' >> "$TMP_PROTO"
    echo "Build proto file from $SRC_PATH"
    grep -hv -e '^import ' -e '^syntax' -e '^package' -e 'option java_' "$SRC_PATH"/messages*.proto \
    | sed 's/ hw\.trezor\.messages\.common\./ /' \
    | sed 's/ common\./ /' \
    | sed 's/ ethereum_definitions\./ /' \
    | sed 's/ management\./ /' \
    | sed 's/^option /\/\/ option /' \
    | grep -v '    reserved '>> "$TMP_PROTO"

    npx pbjs -t json -p "$DIST_PATH" -o "$DIST_PATH/messages.json" --keep-case "$TMP_PROTO"
    rm "$TMP_PROTO"

    # Copy to core package
    cp "$DIST_PATH/messages.json" "$CORE_MESSAGES_DIR/messages.json"
    echo "Pro1 messages.json copied to core"

    yarn --cwd "$PACKAGE_ROOT" prettier --write "$DIST_PATH/messages.json"
    yarn --cwd "$PACKAGE_ROOT" prettier --write "$CORE_MESSAGES_DIR/messages.json"
    # Type generation (protobuf-types.js) runs once at the end of the Protocol V2
    # section below, after both schemas are available.
else
    # Intentional asymmetry with the Protocol V2 section below: the legacy firmware
    # submodule is optional (the committed messages.json stays in use when it is
    # absent), while firmware-pro2 is the only source of the Protocol V2 schema,
    # so its absence is a hard error (exit 1).
    echo "⚠️  firmware submodule not found at $SRC_PATH"
    echo "    Skipping Pro1 protobuf build. To enable:"
    echo "    git submodule update --init submodules/firmware"
fi


# ============================================================
# BUILD Protocol V2 messages-protocol-v2.json
# ============================================================
# Source of truth: submodules/firmware-pro2/sys/protobuf/onekey_protocol/.
# Protocol V2 keeps chain/app protocols under legacy/ and system protocols under latest/.
# The SDK flattens them into one protobuf schema for transport runtime, but it must keep
# firmware message names and enum values intact. SDK-facing aliases belong in core/API code,
# not in the protobuf schema.
# ============================================================
cd "$PARENT_PATH"

SRC_PRO2_LEGACY="$REPO_ROOT/submodules/firmware-pro2/sys/protobuf/onekey_protocol/legacy"
SRC_PRO2_LATEST="$REPO_ROOT/submodules/firmware-pro2/sys/protobuf/onekey_protocol/latest"

if [ -d "$SRC_PRO2_LATEST" ] && ls "$SRC_PRO2_LATEST"/messages*.proto 1>/dev/null 2>&1; then
    echo "=== Building Protocol V2 messages from firmware-pro2 legacy + latest protobuf schema ==="
    TMP_PROTO="$PARENT_PATH/messages-protocol-v2-tmp.proto"

    {
        echo 'syntax = "proto2";'
        echo 'import "google/protobuf/descriptor.proto";'
        echo ''

        # Pro2 firmware keeps chain/app protocols under legacy/, and Protocol V2
        # device/filesystem/firmware protocols under latest/. Build one flat
        # schema so Protocol V2 framing can also encode legacy public-chain calls.
        grep -hv \
            -e '^import ' -e '^syntax' -e '^package' -e 'option java_' \
            "$SRC_PRO2_LEGACY"/messages*.proto \
            | sed 's/ hw\.onekey\.messages\.[a-zA-Z_]*\./ /g' \
            | sed 's/ crypto\./ /g' \
            | sed 's/ ethereum_definitions\./ /g' \
            | sed 's/ management\./ /g' \
            | sed 's/^option /\/\/ option /' \
            | grep -v '    reserved '

        echo ''
        echo '// --- Protocol V2 system messages ---'
        grep -hv \
            -e '^import ' -e '^syntax' -e '^package' -e 'option java_' \
            -e '^option ' \
            "$SRC_PRO2_LATEST"/messages*.proto \
            | grep -v '    reserved '

    } > "$TMP_PROTO"

    npx pbjs -t json \
        -p "$PARENT_PATH" \
        -o "$PARENT_PATH/../messages-protocol-v2.json" \
        --keep-case \
        "$(basename "$TMP_PROTO")"

    rm -f "$TMP_PROTO"

    cp "$PARENT_PATH/../messages-protocol-v2.json" "$CORE_MESSAGES_DIR/messages-protocol-v2.json"
    echo "Protocol V2 messages-protocol-v2.json generated from firmware-pro2 legacy + latest schema and copied to core"

    yarn --cwd "$PACKAGE_ROOT" prettier --write "$PARENT_PATH/../messages-protocol-v2.json"
    yarn --cwd "$PACKAGE_ROOT" prettier --write "$CORE_MESSAGES_DIR/messages-protocol-v2.json"

    echo "generating type definitions for: $LANG"
    node ./protobuf-types.js $LANG
    yarn --cwd "$PACKAGE_ROOT" prettier --write "$PACKAGE_ROOT/src/types/messages.ts"
    echo "=== Protocol V2 messages build complete ==="
else
    # Unlike the optional Pro1 (legacy) section above, the firmware-pro2 submodule is
    # the only source of the Protocol V2 schema, so a missing checkout is a hard error.
    echo "firmware-pro2 latest protobuf schema not found at $SRC_PRO2_LATEST"
    echo "The Protocol V2 schema requires firmware-pro2 on branch dev."
    echo "Run: git submodule update --init submodules/firmware-pro2"
    echo "Then: git -C submodules/firmware-pro2 fetch origin dev && git -C submodules/firmware-pro2 checkout origin/dev"
    exit 1
fi
