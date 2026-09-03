import { getMethodSupportedProtocols, projectDeviceStateFeatures } from '@onekeyfe/hd-core';
import { DeviceSessionPinType } from '@onekeyfe/hd-transport';

import { executeProtocolAwareMethod, isMethodSupportedOnProtocol } from './protocolAwareMethod';
import { getProtocolAwareFeatures } from './protocolAwareFeatures';

import type { CoreApi } from '@onekeyfe/hd-core';

jest.mock('@onekeyfe/hd-core', () => ({
  getMethodSupportedProtocols: jest.fn(),
  projectDeviceStateFeatures: jest.fn(),
}));

jest.mock('./protocolAwareFeatures', () => ({
  getProtocolAwareFeatures: jest.fn(),
}));

const mockedGetMethodSupportedProtocols = getMethodSupportedProtocols as jest.MockedFunction<
  typeof getMethodSupportedProtocols
>;
const mockedGetProtocolAwareFeatures = getProtocolAwareFeatures as jest.MockedFunction<
  typeof getProtocolAwareFeatures
>;
const mockedProjectDeviceStateFeatures = projectDeviceStateFeatures as jest.MockedFunction<
  typeof projectDeviceStateFeatures
>;

describe('protocolAwareMethod', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('uses the Core method contract as the protocol support source', () => {
    mockedGetMethodSupportedProtocols.mockReturnValue(['V1']);

    expect(isMethodSupportedOnProtocol('stellarGetAddress', 'V2', { path: 'm/0' })).toBe(false);
    expect(mockedGetMethodSupportedProtocols).toHaveBeenCalledWith('stellarGetAddress', {
      path: 'm/0',
    });
  });

  test('adapts getFeatures instead of sending the V1 command to a V2 device', async () => {
    const response = { success: true, payload: { protocol: 'V2' } };
    mockedGetProtocolAwareFeatures.mockResolvedValue(response as never);
    const sdk = { getFeatures: jest.fn() } as unknown as CoreApi;

    await expect(
      executeProtocolAwareMethod({
        sdk,
        method: 'getFeatures',
        connectId: 'pro2',
        deviceId: 'device-id',
        protocol: 'V2',
        mode: 'connection',
      })
    ).resolves.toBe(response);

    expect(mockedGetProtocolAwareFeatures).toHaveBeenCalledWith(sdk, 'pro2', {}, 'V2');
    expect(sdk.getFeatures).not.toHaveBeenCalled();
  });

  test('returns a skippable 415 response without invoking a V1-only method', async () => {
    mockedGetMethodSupportedProtocols.mockReturnValue(['V1']);
    const stellarGetAddress = jest.fn();
    const sdk = { stellarGetAddress } as unknown as CoreApi;

    await expect(
      executeProtocolAwareMethod({
        sdk,
        method: 'stellarGetAddress',
        connectId: 'pro2',
        deviceId: 'device-id',
        params: { path: "m/44'/148'/0'" },
        protocol: 'V2',
      })
    ).resolves.toEqual(
      expect.objectContaining({
        success: false,
        payload: expect.objectContaining({
          code: 415,
          method: 'stellarGetAddress',
          protocol: 'V2',
        }),
      })
    );
    expect(stellarGetAddress).not.toHaveBeenCalled();
  });

  test.each([
    [undefined, false],
    [DeviceSessionPinType.Main, false],
    [DeviceSessionPinType.AttachToPin, true],
    [DeviceSessionPinType.Any, true],
  ])(
    'skips a redundant Protocol V2 unlock for pinType=%s in the matching PIN context',
    async (pinType, unlockedAttachPin) => {
      mockedGetMethodSupportedProtocols.mockReturnValue(['V1', 'V2']);
      const state = {
        status: { unlocked: true, unlockedAttachPin },
      };
      const projectedFeatures = { unlocked: true, unlockedAttachPin };
      mockedProjectDeviceStateFeatures.mockReturnValue(projectedFeatures as never);
      const getDeviceState = jest.fn().mockResolvedValue({ success: true, payload: state });
      const deviceUnlock = jest.fn();
      const sdk = { getDeviceState, deviceUnlock } as unknown as CoreApi;

      await expect(
        executeProtocolAwareMethod({
          sdk,
          method: 'deviceUnlock',
          connectId: 'pro2',
          deviceId: '',
          params: pinType === undefined ? {} : { pinType },
          protocol: 'V2',
          mode: 'connection',
        })
      ).resolves.toEqual({ success: true, payload: projectedFeatures });

      expect(getDeviceState).toHaveBeenCalledWith('pro2', { scope: 'runtime' });
      expect(mockedProjectDeviceStateFeatures).toHaveBeenCalledWith(state);
      expect(deviceUnlock).not.toHaveBeenCalled();
    }
  );

  test.each([
    ['locked', false, false, undefined],
    ['Attach PIN context for a Main PIN request', true, true, DeviceSessionPinType.Main],
    ['Main PIN context for an Attach PIN request', true, false, DeviceSessionPinType.AttachToPin],
  ])(
    'executes Protocol V2 unlock when the device is %s',
    async (_case, unlocked, unlockedAttachPin, pinType) => {
      mockedGetMethodSupportedProtocols.mockReturnValue(['V1', 'V2']);
      const stateResponse = {
        success: true,
        payload: { status: { unlocked, unlockedAttachPin } },
      };
      const unlockResponse = { success: true, payload: { unlocked: true } };
      const getDeviceState = jest.fn().mockResolvedValue(stateResponse);
      const deviceUnlock = jest.fn().mockResolvedValue(unlockResponse);
      const sdk = { getDeviceState, deviceUnlock } as unknown as CoreApi;
      const params = pinType === undefined ? {} : { pinType };

      await expect(
        executeProtocolAwareMethod({
          sdk,
          method: 'deviceUnlock',
          connectId: 'pro2',
          deviceId: '',
          params,
          protocol: 'V2',
          mode: 'connection',
        })
      ).resolves.toBe(unlockResponse);

      expect(deviceUnlock).toHaveBeenCalledWith('pro2', params);
      expect(mockedProjectDeviceStateFeatures).not.toHaveBeenCalled();
    }
  );
});
