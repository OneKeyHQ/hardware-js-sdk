import { blake2s } from '@noble/hashes/blake2s';
import { bytesToHex } from '@noble/hashes/utils';

import {
  PRO2_NFT_IMAGE_HEIGHT,
  PRO2_NFT_IMAGE_WIDTH,
  PRO2_NFT_THUMBNAIL_HEIGHT,
  PRO2_NFT_THUMBNAIL_WIDTH,
  buildPro2NftBundle,
} from '../src/utils/pro2Nft';

const rgba = (width: number, height: number, alpha = 0xff) => {
  const data = new Uint8Array(width * height * 4);
  for (let index = 3; index < data.length; index += 4) data[index] = alpha;
  return data;
};

describe('buildPro2NftBundle', () => {
  test('builds the exact Pro2 RGB565 triplet and basename', () => {
    const bundle = buildPro2NftBundle({
      image: {
        width: PRO2_NFT_IMAGE_WIDTH,
        height: PRO2_NFT_IMAGE_HEIGHT,
        rgba: rgba(PRO2_NFT_IMAGE_WIDTH, PRO2_NFT_IMAGE_HEIGHT),
      },
      thumbnail: {
        width: PRO2_NFT_THUMBNAIL_WIDTH,
        height: PRO2_NFT_THUMBNAIL_HEIGHT,
        rgba: rgba(PRO2_NFT_THUMBNAIL_WIDTH, PRO2_NFT_THUMBNAIL_HEIGHT),
      },
      title: 'CryptoPunk #3100',
      subtitle: 'CryptoPunks',
      timestampMs: 1_760_000_000_000,
    });

    expect(bundle.image.byteLength).toBe(583_212);
    expect(bundle.thumbnail.byteLength).toBe(138_876);
    expect(Array.from(bundle.image.slice(0, 12))).toEqual([
      0x19, 0x12, 0, 0, 28, 2, 28, 2, 56, 4, 0, 0,
    ]);
    expect(Array.from(bundle.thumbnail.slice(0, 12))).toEqual([
      0x19, 0x12, 0, 0, 7, 1, 7, 1, 16, 2, 0, 0,
    ]);
    expect(new TextDecoder().decode(bundle.metadata)).toBe(
      '{"title":"CryptoPunk #3100","subtitle":"CryptoPunks"}'
    );
    expect(bytesToHex(blake2s(bundle.image))).toBe(
      'af4b5f8fe216cfd0ef4a9162a42b5c66a73466f2491066f66f756c4e28cc869e'
    );
    expect(bytesToHex(blake2s(bundle.thumbnail))).toBe(
      '44591afae1163cc14651d77644501c6a110f96506889b825cab0351ff4de857d'
    );
    expect(bytesToHex(blake2s(bundle.metadata))).toBe(
      'e30d4dc2cddd441c9f1438c783e05a623ccf76f2f6219d4281769dda1b3635b5'
    );
    expect(bundle.basename).toBe('nft-af4b5f8f-1760000000000');
  });

  test('composites transparent pixels onto black without an alpha plane', () => {
    const image = rgba(PRO2_NFT_IMAGE_WIDTH, PRO2_NFT_IMAGE_HEIGHT);
    image.set([255, 255, 255, 0], 0);
    const bundle = buildPro2NftBundle({
      image: { width: PRO2_NFT_IMAGE_WIDTH, height: PRO2_NFT_IMAGE_HEIGHT, rgba: image },
      thumbnail: {
        width: PRO2_NFT_THUMBNAIL_WIDTH,
        height: PRO2_NFT_THUMBNAIL_HEIGHT,
        rgba: rgba(PRO2_NFT_THUMBNAIL_WIDTH, PRO2_NFT_THUMBNAIL_HEIGHT, 0),
      },
      title: 'NFT',
      subtitle: '',
      timestampMs: 1,
    });

    expect(bundle.image[1]).toBe(0x12);
    expect(Array.from(bundle.image.slice(12, 14))).toEqual([0, 0]);
    expect(bundle.thumbnail.byteLength).toBe(138_876);
  });

  test('rejects invalid dimensions and metadata byte lengths', () => {
    const validThumbnail = {
      width: PRO2_NFT_THUMBNAIL_WIDTH,
      height: PRO2_NFT_THUMBNAIL_HEIGHT,
      rgba: rgba(PRO2_NFT_THUMBNAIL_WIDTH, PRO2_NFT_THUMBNAIL_HEIGHT),
    };
    expect(() =>
      buildPro2NftBundle({
        image: { width: 1, height: 1, rgba: new Uint8Array(4) },
        thumbnail: validThumbnail,
        title: 'NFT',
        subtitle: '',
        timestampMs: 1,
      })
    ).toThrow('540x540');
    expect(() =>
      buildPro2NftBundle({
        image: {
          width: PRO2_NFT_IMAGE_WIDTH,
          height: PRO2_NFT_IMAGE_HEIGHT,
          rgba: rgba(PRO2_NFT_IMAGE_WIDTH, PRO2_NFT_IMAGE_HEIGHT),
        },
        thumbnail: validThumbnail,
        title: 'a'.repeat(64),
        subtitle: '',
        timestampMs: 1,
      })
    ).toThrow('1 to 63');
  });
});
