import { sha3_512 } from '@noble/hashes/sha3';
import semver from 'semver';

/**
 * Builds the unsigned host-asset package consumed by Pro2 firmware:
 *
 *   OKPP RESOURCE container
 *   └── OKAR archive
 *       └── independently compressed raw LZ4 blocks
 *
 * OKPP and OKAR are OneKey formats. Their constants mirror firmware-pro2's
 * payload_package headers; the LZ4 bytes inside each block follow the standard
 * raw block format and deliberately do not use an LZ4 frame or size prefix.
 */

/* eslint-disable no-bitwise */

export const PRO2_HOST_ASSET_PACKAGE_MIN_VERSION = '1.0.1';

// OKPP container layout. The fixed header has seven empty signature slots even
// for a host-generated unsigned package.
const CONTAINER_HEADER_SIZE = 0x5f90;
const CONTAINER_HEADER_HASH_INPUT_LENGTH = 0x240;
const CONTAINER_HASH_SECTION_OFFSET = 0x200;
const CONTAINER_SIGNATURE_ALGORITHM_OFFSET = 0x408;
const CONTAINER_HEADER_MAGIC = 0x50504b4f;
const CONTAINER_HEADER_VERSION = 1;
const CONTAINER_RESOURCE_TYPE_MAGIC = 0x43534552;
const CONTAINER_ED25519_SIGNATURE_ALGORITHM = 0x71717171;
const HOST_ASSET_PACKAGE_MAX_SIZE = 4 * 1024 * 1024;

// OKAR archive layout.
const ARCHIVE_MAGIC = 0x52414b4f;
const ARCHIVE_VERSION = 1;
const ARCHIVE_HEADER_SIZE = 42;
const ARCHIVE_ENTRY_SIZE = 296;
const ARCHIVE_ENTRY_NAME_MAX_LENGTH = 255;
const ARCHIVE_COMPRESS_LZ4_BLOCKED = 1;
const ARCHIVE_ALIGNMENT = 4;
const LZ4_PREFERRED_BLOCK_SIZE_LOG2 = 14;
const LZ4_FALLBACK_BLOCK_SIZE_LOG2 = 13;
const LZ4_COMPRESSED_BLOCK_SIZE_MAX = 1 << 14;

export type Pro2HostAssetPackageEntry = {
  name: string;
  data: Uint8Array;
};

type EncodedArchiveEntry = Pro2HostAssetPackageEntry & {
  nameBytes: Uint8Array;
  compressed: Uint8Array;
  offset: number;
};

export function supportsPro2HostAssetPackage(firmwareVersion: string | undefined): boolean {
  return Boolean(
    firmwareVersion &&
      semver.valid(firmwareVersion) &&
      semver.gte(firmwareVersion, PRO2_HOST_ASSET_PACKAGE_MIN_VERSION)
  );
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(parts.reduce((length, part) => length + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }
  return output;
}

// Raw LZ4 block encoder
// ---------------------
//
// This encoder is adapted from lz4-lite 1.1.2 and intentionally kept local so
// every SDK runtime uses the same dependency-free implementation. Keep this
// section isolated from the OneKey package writer below. Firmware requires raw
// blocks here; replacing it with an LZ4 frame encoder is not compatible.
//
// MIT License
// Copyright (c) 2026 Alexander Vukov
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

const LZ4_MIN_MATCH = 4;
const LZ4_LAST_LITERALS = 5;
const LZ4_MATCH_FIND_LIMIT = 12;
const LZ4_MAX_OFFSET = 0xffff;
const LZ4_LENGTH_MASK = 15;
const LZ4_HASH_LOG = 16;
const LZ4_HASH_MULTIPLIER = 2654435761;
const LZ4_MAX_SEARCH_DEPTH = 64;

function writeExtendedLength(output: Uint8Array, offset: number, length: number): number {
  let remaining = length;
  let nextOffset = offset;
  while (remaining >= 255) {
    output[nextOffset] = 255;
    nextOffset += 1;
    remaining -= 255;
  }
  output[nextOffset] = remaining;
  return nextOffset + 1;
}

function copyBytes(
  output: Uint8Array,
  outputOffset: number,
  input: Uint8Array,
  inputOffset: number,
  length: number
): number {
  output.set(input.subarray(inputOffset, inputOffset + length), outputOffset);
  return outputOffset + length;
}

function emitSequence(
  output: Uint8Array,
  outputOffset: number,
  input: Uint8Array,
  anchor: number,
  literalLength: number,
  matchOffset: number,
  matchLengthCode: number
): number {
  const tokenOffset = outputOffset;
  let nextOffset = outputOffset + 1;
  let token = 0;

  if (literalLength >= LZ4_LENGTH_MASK) {
    token = LZ4_LENGTH_MASK << 4;
    nextOffset = writeExtendedLength(output, nextOffset, literalLength - LZ4_LENGTH_MASK);
  } else {
    token = literalLength << 4;
  }
  nextOffset = copyBytes(output, nextOffset, input, anchor, literalLength);
  output[nextOffset] = matchOffset & 0xff;
  output[nextOffset + 1] = (matchOffset >>> 8) & 0xff;
  nextOffset += 2;

  if (matchLengthCode >= LZ4_LENGTH_MASK) {
    token |= LZ4_LENGTH_MASK;
    nextOffset = writeExtendedLength(output, nextOffset, matchLengthCode - LZ4_LENGTH_MASK);
  } else {
    token |= matchLengthCode;
  }
  output[tokenOffset] = token;
  return nextOffset;
}

function emitLastLiterals(
  output: Uint8Array,
  outputOffset: number,
  input: Uint8Array,
  anchor: number,
  literalLength: number
): number {
  const tokenOffset = outputOffset;
  let nextOffset = outputOffset + 1;
  if (literalLength >= LZ4_LENGTH_MASK) {
    output[tokenOffset] = LZ4_LENGTH_MASK << 4;
    nextOffset = writeExtendedLength(output, nextOffset, literalLength - LZ4_LENGTH_MASK);
  } else {
    output[tokenOffset] = literalLength << 4;
  }
  return copyBytes(output, nextOffset, input, anchor, literalLength);
}

function compressRawLz4Block(
  input: Uint8Array,
  hashTable: Uint32Array,
  matchChain: Int32Array
): Uint8Array {
  const output = new Uint8Array(input.byteLength + Math.floor(input.byteLength / 255) + 16);
  const inputView = new DataView(input.buffer, input.byteOffset, input.byteLength);
  const matchFindLimit = input.byteLength - LZ4_MATCH_FIND_LIMIT;
  const matchExtendLimit = input.byteLength - LZ4_LAST_LITERALS;
  let anchor = 0;
  let inputOffset = 0;
  let outputOffset = 0;

  hashTable.fill(0);
  while (inputOffset < matchFindLimit) {
    const sequence = inputView.getUint32(inputOffset, true);
    const hash = Math.imul(sequence, LZ4_HASH_MULTIPLIER) >>> (32 - LZ4_HASH_LOG);
    let candidate = hashTable[hash] - 1;
    matchChain[inputOffset] = candidate;
    hashTable[hash] = inputOffset + 1;

    let bestCandidate = -1;
    let bestMatchEnd = inputOffset;
    let searchDepth = 0;
    while (
      candidate >= 0 &&
      inputOffset - candidate <= LZ4_MAX_OFFSET &&
      searchDepth < LZ4_MAX_SEARCH_DEPTH
    ) {
      if (inputView.getUint32(candidate, true) === sequence) {
        let matchEnd = inputOffset + LZ4_MIN_MATCH;
        let reference = candidate + LZ4_MIN_MATCH;
        while (matchEnd < matchExtendLimit && input[matchEnd] === input[reference]) {
          matchEnd += 1;
          reference += 1;
        }
        if (matchEnd > bestMatchEnd) {
          bestCandidate = candidate;
          bestMatchEnd = matchEnd;
        }
      }
      candidate = matchChain[candidate];
      searchDepth += 1;
    }

    if (bestCandidate < 0) {
      inputOffset += 1;
    } else {
      const matchStart = inputOffset;
      outputOffset = emitSequence(
        output,
        outputOffset,
        input,
        anchor,
        inputOffset - anchor,
        inputOffset - bestCandidate,
        bestMatchEnd - inputOffset - LZ4_MIN_MATCH
      );
      inputOffset = bestMatchEnd;
      anchor = inputOffset;

      for (
        let skippedOffset = matchStart + 1;
        skippedOffset < inputOffset && skippedOffset < matchFindLimit;
        skippedOffset += 1
      ) {
        const skippedSequence = inputView.getUint32(skippedOffset, true);
        const skippedHash = Math.imul(skippedSequence, LZ4_HASH_MULTIPLIER) >>> (32 - LZ4_HASH_LOG);
        matchChain[skippedOffset] = hashTable[skippedHash] - 1;
        hashTable[skippedHash] = skippedOffset + 1;
      }
    }
  }

  outputOffset = emitLastLiterals(output, outputOffset, input, anchor, input.byteLength - anchor);
  return output.slice(0, outputOffset);
}

// OneKey LZ4-blocked wrapper
// --------------------------
// The archive stores an 8-byte descriptor, one compressed-size value per
// block, then the concatenated raw blocks. Blocks are independent so firmware
// can validate and decompress them with bounded memory.
function encodeLz4BlockedWithBlockSize(
  data: Uint8Array,
  blockSizeLog2: number
): Uint8Array | undefined {
  const blockSize = 1 << blockSizeLog2;
  const blockCount = Math.ceil(data.byteLength / blockSize);
  const hashTable = new Uint32Array(1 << LZ4_HASH_LOG);
  const matchChain = new Int32Array(blockSize);
  const blocks: Uint8Array[] = [];
  const header = new Uint8Array(8 + blockCount * 4);
  const headerView = new DataView(header.buffer);
  headerView.setUint16(0, blockCount, true);
  headerView.setUint16(2, blockSizeLog2, true);

  for (let index = 0; index < blockCount; index += 1) {
    const block = compressRawLz4Block(
      data.subarray(index * blockSize, Math.min((index + 1) * blockSize, data.byteLength)),
      hashTable,
      matchChain
    );
    if (block.byteLength > LZ4_COMPRESSED_BLOCK_SIZE_MAX) return undefined;
    headerView.setUint32(8 + index * 4, block.byteLength, true);
    blocks.push(block);
  }
  return concatBytes([header, ...blocks]);
}

function encodeLz4Blocked(data: Uint8Array): Uint8Array {
  const preferred = encodeLz4BlockedWithBlockSize(data, LZ4_PREFERRED_BLOCK_SIZE_LOG2);
  if (preferred) return preferred;

  const fallback = encodeLz4BlockedWithBlockSize(data, LZ4_FALLBACK_BLOCK_SIZE_LOG2);
  if (!fallback) {
    throw new Error('Pro2 host asset package LZ4 block exceeds the firmware buffer limit.');
  }
  return fallback;
}

// OKAR integrity helpers
// ----------------------
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < table.length; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let value = 0xffffffff;
  for (const byte of data) {
    value = CRC32_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function align(value: number): number {
  return (value + ARCHIVE_ALIGNMENT - 1) & ~(ARCHIVE_ALIGNMENT - 1);
}

// OKAR archive writer
// -------------------
function buildArchive(entries: Pro2HostAssetPackageEntry[]): Uint8Array {
  const textEncoder = new TextEncoder();
  let dataOffset = ARCHIVE_HEADER_SIZE + entries.length * ARCHIVE_ENTRY_SIZE;
  const encodedEntries: EncodedArchiveEntry[] = entries.map(entry => {
    const nameBytes = textEncoder.encode(entry.name);
    if (!entry.name || nameBytes.byteLength > ARCHIVE_ENTRY_NAME_MAX_LENGTH) {
      throw new Error('Pro2 host asset package entry names must contain 1 to 255 UTF-8 bytes.');
    }
    if (!(entry.data instanceof Uint8Array) || entry.data.byteLength === 0) {
      throw new Error(`Pro2 host asset package entry [${entry.name}] must not be empty.`);
    }
    const compressed = encodeLz4Blocked(entry.data);
    const offset = align(dataOffset);
    dataOffset = offset + compressed.byteLength;
    return { ...entry, nameBytes, compressed, offset };
  });

  const archive = new Uint8Array(dataOffset);
  const view = new DataView(archive.buffer);
  view.setUint32(0, ARCHIVE_MAGIC, true);
  view.setUint32(4, ARCHIVE_VERSION, true);
  view.setUint16(8, encodedEntries.length, true);

  encodedEntries.forEach((entry, index) => {
    const recordOffset = ARCHIVE_HEADER_SIZE + index * ARCHIVE_ENTRY_SIZE;
    archive[recordOffset] = entry.nameBytes.byteLength;
    archive.set(entry.nameBytes, recordOffset + 1);
    view.setUint32(recordOffset + 0x100, entry.offset, true);
    view.setUint32(recordOffset + 0x104, entry.data.byteLength, true);
    view.setUint32(recordOffset + 0x108, entry.compressed.byteLength, true);
    view.setUint32(recordOffset + 0x10c, crc32(entry.data), true);
    view.setUint32(recordOffset + 0x110, crc32(entry.compressed), true);
    archive[recordOffset + 0x114] = ARCHIVE_COMPRESS_LZ4_BLOCKED;
    archive.set(entry.compressed, entry.offset);
  });
  return archive;
}

// OKPP container writer
// ---------------------
export function buildPro2HostAssetPackage(entries: Pro2HostAssetPackageEntry[]): Uint8Array {
  if (entries.length === 0 || new Set(entries.map(entry => entry.name)).size !== entries.length) {
    throw new Error('Pro2 host asset package entries must have unique, non-empty names.');
  }

  const payload = buildArchive(entries);
  const header = new Uint8Array(CONTAINER_HEADER_SIZE);
  const view = new DataView(header.buffer);
  view.setUint32(0, CONTAINER_HEADER_MAGIC, true);
  view.setUint32(4, CONTAINER_HEADER_VERSION, true);
  view.setUint32(8, CONTAINER_RESOURCE_TYPE_MAGIC, true);
  view.setUint32(0x0c, CONTAINER_HEADER_SIZE, true);
  view.setUint32(0x10, 1, true);
  view.setUint32(0x14, payload.byteLength, true);

  // Host asset packages are unsigned, but firmware still requires a valid
  // payload hash, header hash, and the Ed25519 algorithm discriminator. The
  // zero-initialized header intentionally leaves sig_used_count and every
  // signature slot empty.
  header.set(sha3_512(payload), CONTAINER_HASH_SECTION_OFFSET);
  header.set(sha3_512(header.subarray(0, CONTAINER_HEADER_HASH_INPUT_LENGTH)), 0x240);
  view.setUint32(CONTAINER_SIGNATURE_ALGORITHM_OFFSET, CONTAINER_ED25519_SIGNATURE_ALGORITHM, true);

  const packageData = concatBytes([header, payload]);
  if (packageData.byteLength > HOST_ASSET_PACKAGE_MAX_SIZE) {
    throw new Error('Pro2 host asset package exceeds the firmware 4 MiB limit.');
  }
  return packageData;
}
