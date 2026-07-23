import {
  getCanonicalDeviceState,
  getCompatibleFeatures,
} from '../deviceStateCommands';

const createSdkMock = () => ({
  searchDevices: jest.fn(),
  getDeviceState: jest.fn(),
  getFeatures: jest.fn(),
});

describe('设备状态 CLI 兼容层', () => {
  test('Protocol V2 直接返回 SDK 搜索结果中的兼容 features', async () => {
    const sdk = createSdkMock();
    const features = {
      protocol: 'V2',
      deviceType: 'pro2',
      deviceId: 'device-id',
    };
    sdk.searchDevices.mockResolvedValue({
      success: true,
      payload: [
        {
          connectId: 'pro2-connect-id',
          state: { protocol: 'V2' },
          features,
        },
      ],
    });

    await expect(getCompatibleFeatures(sdk as never, 'pro2-connect-id')).resolves.toEqual({
      success: true,
      payload: features,
    });
    expect(sdk.getFeatures).not.toHaveBeenCalled();
  });

  test('Protocol V1 继续调用公共 getFeatures 保持旧行为', async () => {
    const sdk = createSdkMock();
    const response = {
      success: true,
      payload: { protocol: 'V1', label: 'Classic' },
    };
    sdk.searchDevices.mockResolvedValue({
      success: true,
      payload: [
        {
          connectId: 'classic-connect-id',
          state: { protocol: 'V1' },
        },
      ],
    });
    sdk.getFeatures.mockResolvedValue(response);

    await expect(getCompatibleFeatures(sdk as never, 'classic-connect-id')).resolves.toBe(
      response
    );
    expect(sdk.getFeatures).toHaveBeenCalledWith('classic-connect-id');
  });

  test('未显式指定设备时选择搜索结果中的第一台设备', async () => {
    const sdk = createSdkMock();
    const response = { success: true, payload: { protocol: 'V1' } };
    sdk.searchDevices.mockResolvedValue({
      success: true,
      payload: [{ connectId: 'first-device', state: { protocol: 'V1' } }],
    });
    sdk.getFeatures.mockResolvedValue(response);

    await expect(getCompatibleFeatures(sdk as never)).resolves.toBe(response);
    expect(sdk.getFeatures).toHaveBeenCalledWith('first-device');
  });

  test('显式 connectId 不在搜索结果时返回结构化错误', async () => {
    const sdk = createSdkMock();
    sdk.searchDevices.mockResolvedValue({
      success: true,
      payload: [{ connectId: 'another-device', state: { protocol: 'V1' } }],
    });

    await expect(getCompatibleFeatures(sdk as never, 'missing-device')).resolves.toEqual({
      success: false,
      payload: {
        code: 'DEVICE_NOT_FOUND',
        error: 'Device not found: missing-device',
      },
    });
    expect(sdk.getFeatures).not.toHaveBeenCalled();
  });

  test('get-state 将 firmware scope 传给 SDK', async () => {
    const sdk = createSdkMock();
    const response = { success: true, payload: { protocol: 'V2' } };
    sdk.getDeviceState.mockResolvedValue(response);

    await expect(
      getCanonicalDeviceState(sdk as never, 'pro2-connect-id', 'firmware')
    ).resolves.toBe(response);
    expect(sdk.getDeviceState).toHaveBeenCalledWith('pro2-connect-id', {
      scope: 'firmware',
    });
    expect(sdk.searchDevices).not.toHaveBeenCalled();
  });

  test('get-state 未指定 connectId 时搜索并选择第一台设备', async () => {
    const sdk = createSdkMock();
    const response = { success: true, payload: { protocol: 'V2' } };
    sdk.searchDevices.mockResolvedValue({
      success: true,
      payload: [{ connectId: 'pro2-connect-id', state: { protocol: 'V2' } }],
    });
    sdk.getDeviceState.mockResolvedValue(response);

    await expect(getCanonicalDeviceState(sdk as never, undefined, 'runtime')).resolves.toBe(
      response
    );
    expect(sdk.getDeviceState).toHaveBeenCalledWith('pro2-connect-id', {
      scope: 'runtime',
    });
  });
});
