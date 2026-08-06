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

  test('builds the nested image parameters required by the Pro2 NFT API', () => {
    const imageRgba = new ArrayBuffer(8);
    const thumbnailRgba = new ArrayBuffer(4);

    expect(
      normalizeProtocolAwareParams('deviceUploadNft', {
        imageWidth: 2,
        imageHeight: 1,
        imageRgba,
        thumbnailWidth: 1,
        thumbnailHeight: 1,
        thumbnailRgba,
        title: 'NFT',
        subtitle: 'Playground',
      })
    ).toEqual({
      image: { width: 2, height: 1, rgba: imageRgba },
      thumbnail: { width: 1, height: 1, rgba: thumbnailRgba },
      title: 'NFT',
      subtitle: 'Playground',
    });
  });
});
