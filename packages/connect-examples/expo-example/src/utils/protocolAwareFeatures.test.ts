import {
  getProtocolAwareFeatures,
  getProtocolAwareFirmwareFeatures,
  isPassphraseProtectionEnabled,
} from './protocolAwareFeatures';

import type { CoreApi } from '@onekeyfe/hd-core';

jest.mock('@onekeyfe/hd-core', () => ({
  projectDeviceStateFeatures: jest.fn(state => ({
    deviceId: state.identity.deviceId,
    device_id: state.identity.deviceId,
    protocol: state.protocol,
  })),
}));

const createSdk = () =>
  ({
    detectDeviceConnectProtocol: jest.fn(),
    getDeviceState: jest.fn(),
    getFeatures: jest.fn(),
  } as unknown as CoreApi);

describe('getProtocolAwareFeatures', () => {
  test('统一识别 V1 与 V2 的 Passphrase 状态字段', () => {
    expect(isPassphraseProtectionEnabled({ passphrase_protection: true })).toBe(true);
    expect(isPassphraseProtectionEnabled({ passphraseProtection: true })).toBe(true);
    expect(
      isPassphraseProtectionEnabled({
        passphraseProtection: false,
        passphrase_protection: true,
      })
    ).toBe(false);
    expect(isPassphraseProtectionEnabled(undefined)).toBe(false);
  });

  test('keeps Protocol V1 on the legacy getFeatures API', async () => {
    const sdk = createSdk();
    const expected = { success: true, payload: { deviceId: 'legacy-device' } };
    (sdk.getFeatures as jest.Mock).mockResolvedValue(expected);

    await expect(getProtocolAwareFeatures(sdk, 'legacy-connect', undefined, 'V1')).resolves.toBe(
      expected
    );

    expect(sdk.getFeatures).toHaveBeenCalledWith('legacy-connect', undefined);
    expect(sdk.getDeviceState).not.toHaveBeenCalled();
    expect(sdk.detectDeviceConnectProtocol).not.toHaveBeenCalled();
  });

  test('projects Protocol V2 getDeviceState into the legacy Features shape', async () => {
    const sdk = createSdk();
    (sdk.getDeviceState as jest.Mock).mockResolvedValue({
      success: true,
      payload: {
        protocol: 'V2',
        identity: { deviceId: 'protocol-v2-device' },
      },
    });

    const result = await getProtocolAwareFeatures(
      sdk,
      'protocol-v2-connect',
      { retryCount: 1 },
      'V2'
    );

    expect(sdk.getDeviceState).toHaveBeenCalledWith('protocol-v2-connect', {
      retryCount: 1,
      scope: 'firmware',
    });
    expect(sdk.getFeatures).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      payload: {
        deviceId: 'protocol-v2-device',
        device_id: 'protocol-v2-device',
        protocol: 'V2',
      },
    });
  });

  test('actively detects the protocol when the caller has no discovery hint', async () => {
    const sdk = createSdk();
    (sdk.detectDeviceConnectProtocol as jest.Mock).mockResolvedValue({
      success: true,
      payload: 'V2',
    });
    (sdk.getDeviceState as jest.Mock).mockResolvedValue({
      success: true,
      payload: {
        protocol: 'V2',
        identity: { deviceId: 'detected-device' },
      },
    });

    await getProtocolAwareFeatures(sdk, 'detected-connect');

    expect(sdk.detectDeviceConnectProtocol).toHaveBeenCalledWith('detected-connect');
    expect(sdk.getDeviceState).toHaveBeenCalled();
  });

  test('reads complete firmware information through one API for V1 and V2 devices', async () => {
    const sdk = createSdk();
    (sdk.getDeviceState as jest.Mock).mockResolvedValue({
      success: true,
      payload: {
        protocol: 'V2',
        identity: { deviceId: 'firmware-device' },
      },
    });

    await expect(getProtocolAwareFirmwareFeatures(sdk, 'firmware-connect')).resolves.toEqual({
      success: true,
      payload: {
        deviceId: 'firmware-device',
        device_id: 'firmware-device',
        protocol: 'V2',
      },
    });

    expect(sdk.getDeviceState).toHaveBeenCalledWith('firmware-connect', {
      scope: 'firmware',
    });
    expect(sdk.getFeatures).not.toHaveBeenCalled();
    expect(sdk.detectDeviceConnectProtocol).not.toHaveBeenCalled();
  });
});
