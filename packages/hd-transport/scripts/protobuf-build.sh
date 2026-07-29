#!/usr/bin/env bash

set -euxo pipefail

PARENT_PATH=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
PACKAGE_ROOT="$PARENT_PATH/.."
REPO_ROOT="$PARENT_PATH/../../.."
CORE_MESSAGES_DIR="$REPO_ROOT/packages/core/src/data/messages"

SRC="../../submodules/firmware/common/protob"
DIST="."
LANG="typescript"

if [[ $# -ne 0 && $# -ne 3 ]]; then
    echo "must provide either 3 or 0 arguments. $# provided"
    exit 1
fi

if [[ $# -eq 3 ]]; then
    SRC=$1
    DIST=$2
    LANG=$3
fi

if [[ "$LANG" != "typescript" && "$LANG" != "flow" ]]; then
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

V1_TMP_PROTO="$DIST_PATH/messages-tmp.proto"
V2_TMP_PROTO="$PARENT_PATH/messages-protocol-v2-tmp.proto"
trap 'rm -f "$V1_TMP_PROTO" "$V2_TMP_PROTO"' EXIT

echo "=== Building Protocol V1 messages ==="
echo 'syntax = "proto2";' > "$V1_TMP_PROTO"
echo 'import "google/protobuf/descriptor.proto";' >> "$V1_TMP_PROTO"
grep -hv -e '^import ' -e '^syntax' -e '^package' -e 'option java_' "$SRC_PATH"/messages*.proto \
| sed 's/ hw\.trezor\.messages\.common\./ /' \
| sed 's/ common\./ /' \
| sed 's/ ethereum_definitions\./ /' \
| sed 's/ management\./ /' \
| sed 's/^option /\/\/ option /' \
| grep -v '    reserved ' >> "$V1_TMP_PROTO"

npx pbjs -t json -p "$DIST_PATH" -o "$DIST_PATH/messages.json" --keep-case "$V1_TMP_PROTO"
cp "$DIST_PATH/messages.json" "$CORE_MESSAGES_DIR/messages.json"

echo "=== Building Protocol V2 messages ==="
SRC_PRO2_LEGACY="$REPO_ROOT/submodules/firmware-pro2/sys/protobuf/onekey_protocol/legacy"
SRC_PRO2_LATEST="$REPO_ROOT/submodules/firmware-pro2/sys/protobuf/onekey_protocol/latest"

if [[ ! -d "$SRC_PRO2_LEGACY" || ! -d "$SRC_PRO2_LATEST" ]]; then
    echo "firmware-pro2 protobuf schema is missing"
    exit 1
fi

{
    echo 'syntax = "proto2";'
    echo 'import "google/protobuf/descriptor.proto";'
    echo ''
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
        -e '^import ' -e '^syntax' -e '^package' -e 'option java_' -e '^option ' \
        "$SRC_PRO2_LATEST"/messages*.proto \
        | grep -v '    reserved '
} > "$V2_TMP_PROTO"

# Protocol V2 latest schema defines common request names that also exist in
# legacy chain messages. Keep the legacy definitions and remove the duplicate
# top-level latest declarations before protobufjs parses the flattened schema.
node - "$V2_TMP_PROTO" <<'NODE'
const fs = require('fs');

const protoPath = process.argv[2];
let proto = fs.readFileSync(protoPath, 'utf8');

function removeLastTopLevelMessage(source, name) {
  const pattern = new RegExp(`(^|\\n)message\\s+${name}\\s*\\{`, 'gm');
  const matches = Array.from(source.matchAll(pattern));
  if (matches.length < 2) return source;
  const match = matches[matches.length - 1];
  const start = match.index + (match[1] ? match[1].length : 0);
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) {
        let end = index + 1;
        while (end < source.length && /\\s/.test(source[end])) end += 1;
        return `${source.slice(0, start)}${source.slice(end)}`;
      }
    }
  }
  throw new Error(`Unterminated message block: ${name}`);
}

['Initialize', 'GetFeatures', 'OnekeyGetFeatures', 'Features'].forEach(name => {
  proto = removeLastTopLevelMessage(proto, name);
});

fs.writeFileSync(protoPath, proto);
NODE

npx pbjs -t json -p "$PARENT_PATH" -o "$PACKAGE_ROOT/messages-protocol-v2.json" --keep-case "$V2_TMP_PROTO"
cp "$PACKAGE_ROOT/messages-protocol-v2.json" "$CORE_MESSAGES_DIR/messages-protocol-v2.json"

echo "generating type definitions for: $LANG"
cd "$PARENT_PATH"
node ./protobuf-types.js "$LANG"

yarn --cwd "$PACKAGE_ROOT" prettier --write "$DIST_PATH/messages.json"
yarn --cwd "$PACKAGE_ROOT" prettier --write "$CORE_MESSAGES_DIR/messages.json"
yarn --cwd "$PACKAGE_ROOT" prettier --write "$PACKAGE_ROOT/messages-protocol-v2.json"
yarn --cwd "$PACKAGE_ROOT" prettier --write "$CORE_MESSAGES_DIR/messages-protocol-v2.json"
yarn --cwd "$PACKAGE_ROOT" prettier --write "$PACKAGE_ROOT/src/types/messages.ts"
