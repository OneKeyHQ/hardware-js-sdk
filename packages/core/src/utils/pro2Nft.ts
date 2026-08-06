import { blake2s } from '@noble/hashes/blake2s';
import { bytesToHex } from '@noble/hashes/utils';

import { invalidParameter } from '../api/helpers/filesystemValidation';
import { encodePro2Image } from './pro2Wallpaper';

export const PRO2_NFT_IMAGE_WIDTH = 540;
export const PRO2_NFT_IMAGE_HEIGHT = 540;
export const PRO2_NFT_THUMBNAIL_WIDTH = 263;
export const PRO2_NFT_THUMBNAIL_HEIGHT = 263;
export const PRO2_NFT_DIRECTORY = 'vol1:/nft';
export const PRO2_NFT_DEFAULT_CHUNK_SIZE = 2048;
export const PRO2_NFT_DEFAULT_PACE_MS = 0;
export const PRO2_NFT_DEFAULT_TIMEOUT_MS = 15_000;
export const PRO2_NFT_MIN_CHUNK_SIZE = 64;
export const PRO2_NFT_MAX_CHUNK_SIZE = 2048;
export const PRO2_NFT_MAX_ITEMS = 10;

export type Pro2NftImage = {
  width: number;
  height: number;
  rgba: Uint8Array | ArrayBuffer;
};

export type Pro2NftBundle = {
  basename: string;
  image: Uint8Array;
  thumbnail: Uint8Array;
  metadata: Uint8Array;
};

const PRO2_NFT_BASENAME_PATTERN = /^nft-[0-9a-f]{8}-[1-9][0-9]*$/;

type Pro2NftFileType = 'image' | 'thumbnail' | 'metadata';

function parsePro2NftFile(listedPath: string):
  | {
      basename: string;
      fileType: Pro2NftFileType;
    }
  | undefined {
  const filename = listedPath.trim().split('/').at(-1);
  if (!filename) return undefined;

  let basename: string | undefined;
  let fileType: Pro2NftFileType | undefined;
  if (filename.endsWith('_m.bin')) {
    basename = filename.slice(0, -'_m.bin'.length);
    fileType = 'thumbnail';
  } else if (filename.endsWith('.json')) {
    basename = filename.slice(0, -'.json'.length);
    fileType = 'metadata';
  } else if (filename.endsWith('.bin')) {
    basename = filename.slice(0, -'.bin'.length);
    fileType = 'image';
  }

  return basename && fileType && PRO2_NFT_BASENAME_PATTERN.test(basename)
    ? { basename, fileType }
    : undefined;
}

export function getCompletePro2NftBasenames(childFiles?: string): Set<string> {
  const filesByBasename = new Map<string, Set<Pro2NftFileType>>();

  for (const listedPath of childFiles?.split('\n') ?? []) {
    const file = parsePro2NftFile(listedPath);
    if (file) {
      const fileTypes = filesByBasename.get(file.basename) ?? new Set<Pro2NftFileType>();
      fileTypes.add(file.fileType);
      filesByBasename.set(file.basename, fileTypes);
    }
  }

  return new Set(
    [...filesByBasename.entries()]
      .filter(([, fileTypes]) => fileTypes.size === 3)
      .map(([basename]) => basename)
  );
}

function utf8Length(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function assertImage(
  name: string,
  image: Pro2NftImage,
  expectedWidth: number,
  expectedHeight: number
) {
  if (image.width !== expectedWidth || image.height !== expectedHeight) {
    throw invalidParameter(
      `Pro2 NFT ${name} dimensions must be ${expectedWidth}x${expectedHeight}.`
    );
  }
  if (!(image.rgba instanceof ArrayBuffer) && !ArrayBuffer.isView(image.rgba)) {
    throw invalidParameter(`Parameter [${name}.rgba] must be an ArrayBuffer or Uint8Array.`);
  }
}

export function buildPro2NftBundle(options: {
  image: Pro2NftImage;
  thumbnail: Pro2NftImage;
  title: string;
  subtitle: string;
  timestampMs: number;
}): Pro2NftBundle {
  const { image, thumbnail, title, subtitle, timestampMs } = options;
  assertImage('image', image, PRO2_NFT_IMAGE_WIDTH, PRO2_NFT_IMAGE_HEIGHT);
  assertImage('thumbnail', thumbnail, PRO2_NFT_THUMBNAIL_WIDTH, PRO2_NFT_THUMBNAIL_HEIGHT);
  const titleLength = typeof title === 'string' ? utf8Length(title) : 0;
  const subtitleLength =
    typeof subtitle === 'string' ? utf8Length(subtitle) : Number.POSITIVE_INFINITY;
  if (titleLength < 1 || titleLength > 63) {
    throw invalidParameter('Pro2 NFT title must contain 1 to 63 UTF-8 bytes.');
  }
  if (subtitleLength > 95) {
    throw invalidParameter('Pro2 NFT subtitle must contain at most 95 UTF-8 bytes.');
  }
  if (!Number.isSafeInteger(timestampMs) || timestampMs <= 0) {
    throw invalidParameter('Parameter [timestampMs] must be a positive safe integer.');
  }

  const encodedImage = encodePro2Image({ ...image, alphaMode: 'black-background' }).data;
  const encodedThumbnail = encodePro2Image({
    ...thumbnail,
    alphaMode: 'black-background',
  }).data;
  const metadata = new TextEncoder().encode(JSON.stringify({ title, subtitle }));
  if (metadata.byteLength === 0 || metadata.byteLength > 512) {
    throw invalidParameter('Pro2 NFT metadata must contain 1 to 512 UTF-8 bytes.');
  }

  const hash8 = bytesToHex(blake2s(encodedImage)).slice(0, 8);
  return {
    basename: `nft-${hash8}-${timestampMs}`,
    image: encodedImage,
    thumbnail: encodedThumbnail,
    metadata,
  };
}
