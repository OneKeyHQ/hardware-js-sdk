import { HardwareTopLevelSdk } from '../src';
import { findMethod } from '../src/api/utils';

import type { LowLevelCoreApi } from '../src';

jest.mock('../src/data/config', () => ({
  DEFAULT_DOMAIN: 'https://example.com/',
  getSDKVersion: () => '0.0.0-test',
}));

const crossJsonOnlyBridge = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

describe('Base64 resource boundary', () => {
  test('keeps Portfolio, wallpaper and NFT payloads JSON-safe across TopLevel and LowLevel', async () => {
    const restoredPayloads: Array<Record<string, any>> = [];
    const lowLevelApi = {
      call: jest.fn(params => {
        const method = findMethod({ id: 1, payload: crossJsonOnlyBridge(params) } as any);
        restoredPayloads.push(method.payload);
        return Promise.resolve({ success: true, payload: {} });
      }),
      init: jest.fn(() => Promise.resolve(true)),
    } as unknown as LowLevelCoreApi;
    const sdk = HardwareTopLevelSdk();
    await sdk.init({}, lowLevelApi);

    await sdk.uploadPortfolio('connect-id', { packageBase64: 'AQID' });
    await sdk.deviceUploadWallpaper('connect-id', { jpegBase64: '/9j/' });
    await sdk.deviceUploadNft('connect-id', {
      imageJpegBase64: '/9j/',
      thumbnailJpegBase64: '/9j/',
      title: 'NFT',
      subtitle: '',
    });

    expect(restoredPayloads.map(payload => payload.method)).toEqual([
      'uploadPortfolio',
      'deviceUploadWallpaper',
      'deviceUploadNft',
    ]);
    expect(restoredPayloads[0].packageBase64).toBe('AQID');
    expect(restoredPayloads[1].jpegBase64).toBe('/9j/');
    expect(restoredPayloads[2]).toMatchObject({
      imageJpegBase64: '/9j/',
      thumbnailJpegBase64: '/9j/',
    });
  });
});
