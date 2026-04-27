#!/usr/bin/env bash

set -euxo pipefail

echo $#

PARENT_PATH=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )

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


# ============================================================
# BUILD Pro1 messages.json  (requires firmware submodule)
# ============================================================
# Combines all messages*.proto files from firmware submodule into
# messages.json, then copies to core package.
if [ -d "$SRC" ] && ls "$SRC"/messages*.proto 1>/dev/null 2>&1; then
    echo "=== Building Pro1 (legacy) protobuf messages ==="
    echo 'syntax = "proto2";' > $DIST/messages.proto
    echo 'import "google/protobuf/descriptor.proto";' >> $DIST/messages.proto
    echo "Build proto file from $SRC"
    grep -hv -e '^import ' -e '^syntax' -e '^package' -e 'option java_' $SRC/messages*.proto \
    | sed 's/ hw\.trezor\.messages\.common\./ /' \
    | sed 's/ common\./ /' \
    | sed 's/ ethereum_definitions\./ /' \
    | sed 's/ management\./ /' \
    | sed 's/^option /\/\/ option /' \
    | grep -v '    reserved '>> $DIST/messages.proto

    npx pbjs -t json -p $DIST -o $DIST/messages.json --keep-case messages.proto
    rm $DIST/messages.proto

    # Copy to core package
    cp $DIST/messages.json "$CORE_MESSAGES_DIR/messages.json"
    echo "Pro1 messages.json copied to core"

    echo "generating type definitions for: $LANG"

    cd "$PARENT_PATH"

    node ./protobuf-types.js $LANG

    yarn prettier --write ../messages.json
    yarn prettier --write "$CORE_MESSAGES_DIR/messages.json"
    yarn prettier --write **/messages.ts
else
    echo "⚠️  firmware submodule not found at $SRC"
    echo "    Skipping Pro1 protobuf build. To enable:"
    echo "    git submodule update --init submodules/firmware"
fi


# ============================================================
# BUILD Pro2 messages-pro2.json
# ============================================================
# Source: submodules/firmware-pro2/sys/protobuf/onekey_protocol/legacy/
#
# The Pro2 device uses two parallel message ID spaces:
#   - Legacy transport (0x3F framing): EmmcFileRead=30104, EmmcDirList=30108, ...
#   - Proto V0 transport (0x5A framing): FileRead=60804, DirList=60808, ...
#
# The protobuf message STRUCTURES are identical; only the MessageType IDs differ.
# We derive messages-pro2.json from the firmware-pro2 proto files by:
#   1. Extracting messages_emmc.proto + management messages (Ping/Success/Failure/Reboot)
#   2. Stripping the "Emmc" prefix from message names
#   3. Remapping MessageType IDs from 30xxx → 60xxx (and special cases below)
#
# ID mapping (firmware legacy → Proto V0):
#   Ping=1          → 60206    Success=2        → 60207    Failure=3     → 60208
#   Reboot=30000    → 60400
#   EmmcFixPermission=30100 → 60800    EmmcPath=30101 → 60801
#   EmmcPathInfo=30102      → 60802    EmmcFile=30103 → 60803
#   EmmcFileRead=30104      → 60804    EmmcFileWrite=30105 → 60805
#   EmmcFileDelete=30106    → 60806    EmmcDir=30107  → 60807
#   EmmcDirList=30108       → 60808    EmmcDirMake=30109   → 60809
#   EmmcDirRemove=30110     → 60810
#   FirmwareUpdateEmmc=30001 → 61000   FirmwareInstallProgress=30002 → 61001
# ============================================================
cd "$PARENT_PATH"

SRC_PRO2_LEGACY="$REPO_ROOT/submodules/firmware-pro2/sys/protobuf/onekey_protocol/legacy"

if [ -d "$SRC_PRO2_LEGACY" ] && ls "$SRC_PRO2_LEGACY"/messages*.proto 1>/dev/null 2>&1; then
    echo "=== Building Pro2 messages from firmware-pro2 submodule ==="
    TMP_PROTO="$PARENT_PATH/messages-pro2-tmp.proto"

    # ----------------------------------------------------------------
    # Step 1: extract Ping/Success/Failure/Reboot from messages_management.proto
    #         and all messages from messages_emmc.proto
    # ----------------------------------------------------------------
    {
        echo 'syntax = "proto2";'
        echo ''

        # Ping from messages_management.proto
        # Success, Failure from messages_common.proto (that's where they live in firmware-pro2)
        # Reboot is a Pro V0-only message not in legacy protos — defined manually below
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
        echo '// --- Reboot (Pro V0 only, not in legacy protos) ---'
        echo 'message Reboot {'
        echo '    required RebootType reboot_type = 1;'
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
    #         rename EmmcFile.len → total_size to match Proto V0 semantics.
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

// MessageType enum with Proto V0 IDs (mapped from firmware-pro2 legacy IDs)
enum MessageType {
    MessageType_Ping                    = 60206;
    MessageType_Success                 = 60207;
    MessageType_Failure                 = 60208;
    MessageType_Reboot                  = 60400;
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
    MessageType_FirmwareUpdate          = 61000;
    MessageType_FirmwareInstallProgress = 61001;
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

enum FirmwareTargetType {
    TARGET_MAIN_APP     = 0;
    TARGET_MAIN_BOOT    = 1;
    TARGET_BLE          = 2;
    TARGET_SE1          = 3;
    TARGET_SE2          = 4;
    TARGET_SE3          = 5;
    TARGET_SE4          = 6;
    TARGET_RESOURCE     = 10;
}

enum RebootType {
    REBOOT_NORMAL       = 0;
    REBOOT_BOARDLOADER  = 1;
    REBOOT_BOOTLOADER   = 2;
}

message FirmwareTarget {
    required FirmwareTargetType target_id = 1;
    required string             path      = 2;
}

message FirmwareUpdate {
    repeated FirmwareTarget targets           = 1;
    optional bool           reboot_on_success = 2;
}

message FirmwareInstallProgress {
    required uint32 progress = 1;
}
ENUM_EOF

    # ----------------------------------------------------------------
    # Step 4: compile to JSON
    # ----------------------------------------------------------------
    npx pbjs -t json \
        -p "$PARENT_PATH" \
        -o "$PARENT_PATH/../messages-pro2.json" \
        --keep-case \
        "$(basename "$TMP_PROTO")"

    rm -f "$TMP_PROTO"

    # Copy to core package
    cp "$PARENT_PATH/../messages-pro2.json" "$CORE_MESSAGES_DIR/messages-pro2.json"
    echo "Pro2 messages-pro2.json generated from firmware-pro2 submodule and copied to core"

    yarn prettier --write "$PARENT_PATH/../messages-pro2.json"
    yarn prettier --write "$CORE_MESSAGES_DIR/messages-pro2.json"
    echo "=== Pro2 messages build complete ==="
else
    echo "⚠️  firmware-pro2 submodule not found at $SRC_PRO2_LEGACY"
    echo "    Skipping Pro2 protobuf build. To enable:"
    echo "    git submodule update --init submodules/firmware-pro2"
fi
