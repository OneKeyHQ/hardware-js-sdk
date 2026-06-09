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

    echo "generating type definitions for: $LANG"

    cd "$PARENT_PATH"

    node ./protobuf-types.js $LANG

    yarn --cwd "$PACKAGE_ROOT" prettier --write "$DIST_PATH/messages.json"
    yarn --cwd "$PACKAGE_ROOT" prettier --write "$CORE_MESSAGES_DIR/messages.json"
    yarn --cwd "$PACKAGE_ROOT" prettier --write "$PACKAGE_ROOT/src/types/messages.ts"
else
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

        if ! grep -q '^message TonSignData ' "$SRC_PRO2_LEGACY"/messages*.proto; then
            echo ''
            echo '// --- TON signData (kept until firmware-pro2 legacy proto exports it) ---'
            echo 'message TonSignData {'
            echo '    repeated uint32 address_n = 1;'
            echo '    required TonSignDataType type = 2;'
            echo '    required bytes payload = 3;'
            echo '    optional string schema = 4;'
            echo '    required string appdomain = 5;'
            echo '    required uint64 timestamp = 6;'
            echo '    optional string from_address = 7;'
            echo '    optional TonWalletVersion wallet_version = 8 [default=V4R2];'
            echo '    optional uint32 wallet_id = 9 [default=698983191];'
            echo '    optional TonWorkChain workchain = 10 [default=BASECHAIN];'
            echo '    optional bool is_bounceable = 11 [default=false];'
            echo '    optional bool is_testnet_only = 12 [default=false];'
            echo ''
            echo '    enum TonSignDataType {'
            echo '        TEXT = 0;'
            echo '        BINARY = 1;'
            echo '        CELL = 2;'
            echo '    }'
            echo '}'
            echo ''
            echo 'message TonSignedData {'
            echo '    optional bytes signature = 1;'
            echo '    optional bytes digest = 2;'
            echo '}'
        fi

        echo ''
        echo '// --- Protocol V2 system messages ---'
        grep -hv \
            -e '^import ' -e '^syntax' -e '^package' -e 'option java_' \
            -e '^option ' \
            "$SRC_PRO2_LATEST"/messages*.proto \
            | grep -v '    reserved '

        if ! grep -q '^message GetOnboardingStatus ' "$SRC_PRO2_LATEST"/messages*.proto; then
            echo ''
            echo '// --- Onboarding status (kept until firmware-pro2 latest proto exports it) ---'
            echo 'enum OnboardingStep {'
            echo '    ONBOARDING_STEP_UNKNOWN = 0;'
            echo '    ONBOARDING_STEP_DEVICE_VERIFICATION = 1;'
            echo '    ONBOARDING_STEP_PERSONALIZATION = 2;'
            echo '    ONBOARDING_STEP_SETUP = 3;'
            echo '    ONBOARDING_STEP_FIRMWARE = 4;'
            echo '}'
            echo ''
            echo 'message GetOnboardingStatus {'
            echo '}'
            echo ''
            echo 'message OnboardingStatus {'
            echo '    message Setup {'
            echo '        message NewDevice {'
            echo '            optional bool seedcard_backup = 1;'
            echo '        }'
            echo '        message Restore {'
            echo '            optional bool mnemonic = 1;'
            echo '            optional bool seedcard = 2;'
            echo '        }'
            echo '        optional NewDevice new_device = 1;'
            echo '        optional Restore restore = 2;'
            echo '    }'
            echo '    required OnboardingStep step = 1;'
            echo '    optional Setup setup = 2;'
            echo '    optional uint32 detail_code = 3;'
            echo '    optional string detail_str = 4;'
            echo '}'
        fi
    } > "$TMP_PROTO"

    if ! grep -q 'MessageType_TonSignData' "$TMP_PROTO"; then
        node - "$TMP_PROTO" <<'NODE'
const fs = require('fs');

const protoPath = process.argv[2];
const proto = fs.readFileSync(protoPath, 'utf8');
const updated = proto.replace(
  /(    MessageType_TonTxAck\s*=\s*11907[^\n]*;\n)/,
  `$1    MessageType_TonSignData = 11908 [(wire_in) = true];\n    MessageType_TonSignedData = 11909 [(wire_out) = true];\n`
);

if (updated === proto) {
  throw new Error('Unable to insert TON signData MessageType entries into Pro2 schema');
}

fs.writeFileSync(protoPath, updated);
NODE
    fi

    if ! grep -q 'MessageType_GetOnboardingStatus' "$TMP_PROTO"; then
        node - "$TMP_PROTO" <<'NODE'
const fs = require('fs');

const protoPath = process.argv[2];
const proto = fs.readFileSync(protoPath, 'utf8');
const updated = proto.replace(
  /(    MessageType_DeviceInfo\s*=\s*60601[^\n]*;\n)/,
  `$1    MessageType_GetOnboardingStatus = 60602;\n    MessageType_OnboardingStatus = 60603;\n`
);

if (updated === proto) {
  throw new Error('Unable to insert onboarding MessageType entries into Pro2 schema');
}

fs.writeFileSync(protoPath, updated);
NODE
    fi

    node - "$TMP_PROTO" <<'NODE'
const fs = require('fs');

const protoPath = process.argv[2];
const proto = fs.readFileSync(protoPath, 'utf8');
const messageNames = new Set(
  Array.from(proto.matchAll(/^\s*message\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{/gm)).map(
    match => match[1]
  )
);
const messageTypeNames = new Set(
  Array.from(proto.matchAll(/^\s*MessageType_([A-Za-z_][A-Za-z0-9_]*)\s*=/gm)).map(
    match => match[1]
  )
);
const requiredMessages = [
  'Ping',
  'Success',
  'Failure',
  'DevReboot',
  'DevGetDeviceInfo',
  'DeviceInfo',
  'DevFirmwareUpdate',
  'DevFirmwareInstallProgress',
  'DevGetFirmwareUpdateStatus',
  'DevFirmwareUpdateStatus',
  'FilesystemFixPermission',
  'FilesystemPathInfo',
  'FilesystemPathInfoQuery',
  'FilesystemFile',
  'FilesystemFileRead',
  'FilesystemFileWrite',
  'FilesystemFileDelete',
  'FilesystemDir',
  'FilesystemDirList',
  'FilesystemDirMake',
  'FilesystemDirRemove',
  'FilesystemFormat',
  'TonSignData',
  'TonSignedData',
  'GetOnboardingStatus',
  'OnboardingStatus',
];
const missingMessages = requiredMessages.filter(name => !messageNames.has(name));
const missingMessageTypes = requiredMessages.filter(name => !messageTypeNames.has(name));

if (missingMessages.length > 0 || missingMessageTypes.length > 0) {
  throw new Error(
    `Protocol V2 schema missing required entries: messages=[${missingMessages.join(
      ', '
    )}], messageTypes=[${missingMessageTypes.join(', ')}]`
  );
}
NODE

    npx pbjs -t json \
        -p "$PARENT_PATH" \
        -o "$PARENT_PATH/../messages-protocol-v2.json" \
        --keep-case \
        "$(basename "$TMP_PROTO")"

    rm -f "$TMP_PROTO"

    cp "$PARENT_PATH/../messages-protocol-v2.json" "$CORE_MESSAGES_DIR/messages-protocol-v2.json"
    echo "Protocol V2 messages-protocol-v2.json generated from firmware-pro2 legacy + latest schema and copied to core"

    yarn prettier --write "$PARENT_PATH/../messages-protocol-v2.json"
    yarn prettier --write "$CORE_MESSAGES_DIR/messages-protocol-v2.json"
    node ./protobuf-types.js $LANG
    yarn --cwd "$PACKAGE_ROOT" prettier --write "$PACKAGE_ROOT/src/types/messages.ts"
    echo "=== Protocol V2 messages build complete ==="
else
    echo "firmware-pro2 latest protobuf schema not found at $SRC_PRO2_LATEST"
    echo "Run: git submodule update --init submodules/firmware-pro2"
    exit 1
fi
