/// <reference types="jest" />

import { normalizeProtocolAwareParams } from '../services/protocolAwareParams';

describe('protocol-aware playground parameters', () => {
  test('removes legacy wallet parameters from a standard wallet session', () => {
    expect(
      normalizeProtocolAwareParams('openWalletSession', {
        mode: 'standard',
        useEmptyPassphrase: false,
        deviceId: 'legacy-device-id',
        passphraseState: 'legacy-wallet-state',
      })
    ).toEqual({ mode: 'standard' });
  });

  test('preserves the public identity required to resume a hidden wallet', () => {
    expect(
      normalizeProtocolAwareParams('openWalletSession', {
        mode: 'resume-hidden',
        useEmptyPassphrase: false,
        deviceId: 'device-id',
        passphraseState: 'wallet-state',
      })
    ).toEqual({
      mode: 'resume-hidden',
      deviceId: 'device-id',
      passphraseState: 'wallet-state',
    });
  });

  test('converts Pro2 NFT files to the Base64 API contract', () => {
    const imageJpeg = Uint8Array.from([1, 2, 3]).buffer;
    const thumbnailJpeg = Uint8Array.from([4, 5]).buffer;

    expect(
      normalizeProtocolAwareParams('deviceUploadNft', {
        imageJpegBase64: imageJpeg,
        thumbnailJpegBase64: thumbnailJpeg,
        title: 'NFT',
        subtitle: 'Playground',
      })
    ).toEqual({
      imageJpegBase64: 'AQID',
      thumbnailJpegBase64: 'BAU=',
      title: 'NFT',
      subtitle: 'Playground',
    });
  });

  test('converts wallpaper and portfolio files to Base64 strings', () => {
    expect(
      normalizeProtocolAwareParams('deviceUploadWallpaper', {
        jpegBase64: Uint8Array.from([0xff, 0xd8, 0xff]).buffer,
      })
    ).toEqual({ jpegBase64: '/9j/' });
    expect(
      normalizeProtocolAwareParams('uploadPortfolio', {
        packageBase64: Uint8Array.from([1, 2, 3]).buffer,
      })
    ).toEqual({ packageBase64: 'AQID' });
  });
});
