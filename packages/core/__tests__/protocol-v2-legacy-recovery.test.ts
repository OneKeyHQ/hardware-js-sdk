import { isLegacyProtocolV2FirmwareRecoveryMethod } from '../src/core/protocolV2LegacyRecovery';

import type { BaseMethod } from '../src/api/BaseMethod';

const createMethod = (
  name: string,
  payload: Record<string, unknown>
): Pick<BaseMethod, 'name' | 'payload'> => ({
  name,
  payload: { method: name, ...payload },
});

describe('Protocol V2 legacy firmware recovery policy', () => {
  test.each([
    ['firmware state read', 'getDeviceState', { scope: 'firmware' }],
    ['firmware release check', 'checkAllFirmwareRelease', {}],
    ['firmware update', 'firmwareUpdateV4', {}],
  ])('allows legacy ProtocolInfo for %s', (_label, name, payload) => {
    expect(isLegacyProtocolV2FirmwareRecoveryMethod(createMethod(name, payload))).toBe(true);
  });

  test.each([
    ['runtime state read', 'getDeviceState', { scope: 'runtime' }],
    ['settings state read', 'getDeviceState', { scope: 'settings' }],
    ['ordinary API', 'getFeatures', {}],
  ])('rejects legacy ProtocolInfo for %s', (_label, name, payload) => {
    expect(isLegacyProtocolV2FirmwareRecoveryMethod(createMethod(name, payload))).toBe(false);
  });
});
