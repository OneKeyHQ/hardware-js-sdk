const fs = require('fs');
const path = require('path');

for (const [arch, machine] of [
  ['x64', 0x8664],
  ['arm64', 0xaa64],
]) {
  const file = path.join(__dirname, '..', 'prebuilds', `win32-${arch}`, 'onekey-ble-pair.exe');
  const bytes = fs.readFileSync(file);
  const pe = bytes.readUInt32LE(0x3c);
  if (
    bytes.toString('ascii', 0, 2) !== 'MZ' ||
    bytes.readUInt32LE(pe) !== 0x00004550 ||
    bytes.readUInt16LE(pe + 4) !== machine
  ) {
    throw new Error(`Invalid Windows pairing helper for ${arch}`);
  }
}
