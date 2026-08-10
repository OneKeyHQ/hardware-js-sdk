import { isLegacyProtocolV2CompatibilityMethod } from '../src/core/protocolV2LegacyCompatibility';

import type { BaseMethod } from '../src/api/BaseMethod';

const createMethod = (
  name: string,
  payload: Record<string, unknown>
): Pick<BaseMethod, 'name' | 'payload'> => ({
  name,
  payload: { method: name, ...payload },
});

describe('Protocol V2 legacy compatibility policy', () => {
  test.each([
    ['firmware state read', 'getDeviceState', { scope: 'firmware' }],
    ['firmware release check', 'checkAllFirmwareRelease', {}],
    ['firmware update', 'firmwareUpdateV4', {}],
    ['bootloader reboot', 'deviceReboot', { rebootType: 'bootloader' }],
    ['factory info read', 'deviceReadFactoryInfo', {}],
    ['factory info provisioning', 'deviceProvisionFactoryInfo', {}],
    ['factory certificate read', 'deviceReadFactoryCertificate', {}],
    ['factory certificate write', 'deviceWriteFactoryCertificate', {}],
    ['factory challenge signing', 'deviceSignFactoryChallenge', {}],
  ])('allows legacy ProtocolInfo for %s', (_label, name, payload) => {
    expect(isLegacyProtocolV2CompatibilityMethod(createMethod(name, payload))).toBe(true);
  });

  test.each([
    ['runtime state read', 'getDeviceState', { scope: 'runtime' }],
    ['settings state read', 'getDeviceState', { scope: 'settings' }],
    ['normal reboot', 'deviceReboot', { rebootType: 'normal' }],
    ['romloader reboot', 'deviceReboot', { reboot_type: 'romloader' }],
    ['ordinary API', 'getFeatures', {}],
  ])('rejects legacy ProtocolInfo for %s', (_label, name, payload) => {
    expect(isLegacyProtocolV2CompatibilityMethod(createMethod(name, payload))).toBe(false);
  });
});
