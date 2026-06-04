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
# Preferred source: submodules/firmware-pro2/sys/protobuf/onekey_protocol/latest/
# Fallback source: submodules/firmware-pro2/sys/protobuf/onekey_protocol/legacy/
#
# Latest firmware-pro2 defines the Protocol V2 schema directly (Device*,
# Filesystem* names). Older firmware-pro2 commits only exposed legacy Emmc* messages,
# so the fallback block below still remaps those into Protocol V2 system names.
#
# ID mapping (firmware legacy → Protocol V2 system IDs):
#   Ping=1          → 60206    Success=2        → 60207    Failure=3     → 60208
#   DeviceReboot=30000    → 60400
#   EmmcFixPermission=30100 → 60800    EmmcPath=30101 → 60801
#   EmmcPathInfo=30102      → 60802    EmmcFile=30103 → 60803
#   EmmcFileRead=30104      → 60804    EmmcFileWrite=30105 → 60805
#   EmmcFileDelete=30106    → 60806    EmmcDir=30107  → 60807
#   EmmcDirList=30108       → 60808    EmmcDirMake=30109   → 60809
#   EmmcDirRemove=30110     → 60810
#   DeviceFirmwareUpdate=30001 → 61000   DeviceFirmwareInstallProgress=30002 → 61001
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
        # device/filesystem/firmware protocols under latest/.  Build one flat
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
elif [ -d "$SRC_PRO2_LEGACY" ] && ls "$SRC_PRO2_LEGACY"/messages*.proto 1>/dev/null 2>&1; then
    echo "=== Building Protocol V2 messages from firmware-pro2 submodule ==="
    TMP_PROTO="$PARENT_PATH/messages-protocol-v2-tmp.proto"

    # ----------------------------------------------------------------
    # Step 1: extract Ping/Success/Failure from messages_management.proto
    #         and all messages from messages_emmc.proto
    # ----------------------------------------------------------------
    {
        echo 'syntax = "proto2";'
        echo ''

        # Ping from messages_management.proto
        # Success, Failure from messages_common.proto (that's where they live in firmware-pro2)
        # DeviceReboot is a Protocol V2 system message not in legacy protos — defined manually below
        echo '// --- Ping ---'
        awk '/^message Ping /,/^}/' "$SRC_PRO2_LEGACY/messages_management.proto" || true
        echo ''
        echo '// --- Success / Failure ---'
        for msg in Success Failure; do
            awk "/^message ${msg} /,/^}/" "$SRC_PRO2_LEGACY/messages_common.proto" \
                | grep -v 'enum FailureType' \
                | grep -v 'Failure_[A-Za-z]' \
                | grep -v '^\s*}$' \
                | sed 's/ hw\.trezor\.messages\.[a-z_]*\.\([A-Z]\)/\1/g' \
                | sed 's/ common\.\([A-Z]\)/\1/g' \
                || true
            echo '}'
            echo ''
        done
        echo '// --- DeviceReboot (Protocol V2 only, not in legacy protos) ---'
        echo 'message DeviceReboot {'
        echo '    required DeviceRebootType reboot_type = 1;'
        echo '}'
        echo ''

        echo ''
        echo '// --- Emmc / File system messages (renamed, Emmc prefix stripped) ---'
        # Extract messages_emmc.proto body (strip package/import/option/syntax lines)
        grep -hv \
            -e '^import ' -e '^syntax' -e '^package' -e 'option java_' \
            -e '^option ' \
            "$SRC_PRO2_LEGACY/messages_emmc.proto" \
            | grep -v '    reserved '

    } > "$TMP_PROTO"

    # ----------------------------------------------------------------
    # Step 2: rename — strip "Emmc" prefix, order matters (longest match first),
    #         rename EmmcFile.len → total_size to match Protocol V2 semantics.
    #         Use space/{/; as word-boundary substitute (macOS BSD sed has no \b).
    # ----------------------------------------------------------------
    sed -i '' \
        -e 's/message EmmcFixPermission /message FixPermission /g' \
        -e 's/message EmmcPathInfo /message PathInfoQuery /g' \
        -e 's/message EmmcFileRead /message FileRead /g' \
        -e 's/message EmmcFileWrite /message FileWrite /g' \
        -e 's/message EmmcFileDelete /message FileDelete /g' \
        -e 's/message EmmcDirList /message DirList /g' \
        -e 's/message EmmcDirMake /message DirMake /g' \
        -e 's/message EmmcDirRemove /message DirRemove /g' \
        -e 's/message EmmcPath /message PathInfo /g' \
        -e 's/message EmmcFile /message File /g' \
        -e 's/message EmmcDir /message Dir /g' \
        -e 's/ EmmcFile / File /g' \
        -e 's/required uint32 len = 3/required uint32 total_size = 3/g' \
        "$TMP_PROTO"

    # ----------------------------------------------------------------
    # Step 3: build the MessageType enum with remapped IDs
    # ----------------------------------------------------------------
    cat >> "$TMP_PROTO" << 'ENUM_EOF'

// MessageType enum with Protocol V2 system IDs (mapped from firmware-pro2 legacy IDs)
enum MessageType {
    MessageType_Ping                    = 60206;
    MessageType_Success                 = 60207;
    MessageType_Failure                 = 60208;
    MessageType_DeviceReboot            = 60400;
    MessageType_GetOnboardingStatus       = 60602;
    MessageType_OnboardingStatus          = 60603;
    MessageType_FixPermission           = 60800;
    MessageType_PathInfo                = 60801;
    MessageType_PathInfoQuery           = 60802;
    MessageType_File                    = 60803;
    MessageType_FileRead                = 60804;
    MessageType_FileWrite               = 60805;
    MessageType_FileDelete              = 60806;
    MessageType_Dir                     = 60807;
    MessageType_DirList                 = 60808;
    MessageType_DirMake                 = 60809;
    MessageType_DirRemove               = 60810;
    MessageType_DeviceFirmwareUpdate    = 61000;
    MessageType_DeviceFirmwareInstallProgress = 61001;
    MessageType_DeviceGetFirmwareUpdateStatus = 61002;
    MessageType_DeviceFirmwareUpdateStatus = 61003;
}

enum FailureType {
    Failure_UnexpectedMessage  = 1;
    Failure_ButtonExpected     = 2;
    Failure_DataError          = 3;
    Failure_ActionCancelled    = 4;
    Failure_PinExpected        = 5;
    Failure_PinCancelled       = 6;
    Failure_PinInvalid         = 7;
    Failure_InvalidSignature   = 8;
    Failure_ProcessError       = 9;
    Failure_NotEnoughFunds     = 10;
    Failure_NotInitialized     = 11;
    Failure_PinMismatch        = 12;
    Failure_WipeCodeMismatch   = 13;
    Failure_InvalidSession     = 14;
    Failure_FirmwareError      = 99;
}

enum DeviceFirmwareTargetType {
    TARGET_INVALID      = 0;
    TARGET_ROMLOADER    = 1;
    TARGET_BOOTLOADER   = 2;
    TARGET_FIRMWARE_P1  = 3;
    TARGET_FIRMWARE_P2  = 4;
    TARGET_COPROCESSOR  = 5;
    TARGET_SE           = 6;
    TARGET_RESOURCE     = 10;
}

enum DeviceRebootType {
    Normal              = 0;
    Boardloader         = 1;
    Bootloader          = 2;
}

message DeviceFirmwareTarget {
    required DeviceFirmwareTargetType target_id = 1;
    required string                   path      = 2;
}

message DeviceFirmwareUpdate {
    repeated DeviceFirmwareTarget targets        = 1;
    optional uint32               max_concurrent = 2;
}

message DeviceFirmwareInstallProgress {
    required DeviceFirmwareTargetType target_id = 1;
    required uint32                   progress  = 2;
    optional string                   stage     = 3;
}

message DeviceFirmwareUpdateStatusEntry {
    required DeviceFirmwareTargetType target_id = 1;
    required uint32                   status    = 2;
}

message DeviceGetFirmwareUpdateStatus {
}

message DeviceFirmwareUpdateStatus {
    repeated DeviceFirmwareUpdateStatusEntry targets = 1;
}

enum OnboardingStep {
    ONBOARDING_STEP_UNKNOWN             = 0;
    ONBOARDING_STEP_DEVICE_VERIFICATION = 1;
    ONBOARDING_STEP_PERSONALIZATION     = 2;
    ONBOARDING_STEP_SETUP               = 3;
    ONBOARDING_STEP_FIRMWARE            = 4;
}

message OnboardingNewDevice {
    optional bool seedcard_backup = 1;
}

message OnboardingRestore {
    optional bool mnemonic = 1;
    optional bool seedcard = 2;
}

message OnboardingSetup {
    optional OnboardingNewDevice new_device = 1;
    optional OnboardingRestore   restore    = 2;
}

message GetOnboardingStatus {
}

message OnboardingStatus {
    required OnboardingStep  step        = 1;
    optional OnboardingSetup setup       = 2;
    optional uint32          detail_code = 3;
    optional string          detail_str  = 4;
}
ENUM_EOF

    # ----------------------------------------------------------------
    # Step 4: compile to JSON
    # ----------------------------------------------------------------
    npx pbjs -t json \
        -p "$PARENT_PATH" \
        -o "$PARENT_PATH/../messages-protocol-v2.json" \
        --keep-case \
        "$(basename "$TMP_PROTO")"

    rm -f "$TMP_PROTO"

    # Copy to core package
    cp "$PARENT_PATH/../messages-protocol-v2.json" "$CORE_MESSAGES_DIR/messages-protocol-v2.json"
    echo "Protocol V2 messages-protocol-v2.json generated from firmware-pro2 submodule and copied to core"

    yarn prettier --write "$PARENT_PATH/../messages-protocol-v2.json"
    yarn prettier --write "$CORE_MESSAGES_DIR/messages-protocol-v2.json"
    node ./protobuf-types.js $LANG
    yarn --cwd "$PACKAGE_ROOT" prettier --write "$PACKAGE_ROOT/src/types/messages.ts"
    echo "=== Protocol V2 messages build complete ==="
else
    echo "⚠️  firmware-pro2 submodule not found at $SRC_PRO2_LEGACY"
    echo "    Skipping Pro2 protobuf build. To enable:"
    echo "    git submodule update --init submodules/firmware-pro2"
fi
