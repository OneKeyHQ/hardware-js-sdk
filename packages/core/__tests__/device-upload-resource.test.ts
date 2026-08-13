import { EDeviceType } from '@onekeyfe/hd-shared';
import { ResourceType } from '@onekeyfe/hd-transport';

import DeviceUploadResource from '../src/api/device/DeviceUploadResource';

jest.mock('../src/data/config', () => ({
  DEFAULT_DOMAIN: 'https://example.com/',
  getSDKVersion: () => '0.0.0-test',
}));

describe('DeviceUploadResource state refresh', () => {
  it('refreshes Protocol V1 settings inside a wallpaper update', async () => {
    const typedCall = jest.fn().mockResolvedValue({
      type: 'Success',
      message: { message: 'Success' },
    });
    const getDeviceState = jest.fn().mockResolvedValue({
      settings: { language: 'en-US' },
    });
    const method = new DeviceUploadResource({
      id: 1,
      payload: {
        method: 'deviceUploadResource',
        suffix: 'jpg',
        dataHex: '00',
        thumbnailDataHex: '00',
        blurDataHex: '00',
        resType: ResourceType.WallPaper,
      },
    });
    method.init();
    (method as any).device = {
      commands: { typedCall },
      getCurrentDeviceType: () => EDeviceType.Pro,
      getCurrentFirmwareVersionString: () => '4.21.0',
      getDeviceState,
    };

    await expect(method.run()).resolves.toEqual({
      message: 'Success',
      applyScreen: false,
    });
    expect(typedCall).toHaveBeenCalledWith(
      'ResourceUpload',
      ['ResourceRequest', 'ZoomRequest', 'BlurRequest', 'Success'],
      expect.objectContaining({ res_type: ResourceType.WallPaper })
    );
    expect(getDeviceState).toHaveBeenCalledWith({ refreshSections: ['settings'] });
    expect(typedCall.mock.invocationCallOrder[0]).toBeLessThan(
      getDeviceState.mock.invocationCallOrder[0]
    );
  });
});
