import { Device } from '../src/device/Device';
import TransportManager from '../src/data-manager/TransportManager';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

function buildV1Device() {
  const device = Object.create(Device.prototype) as Device;
  const typedCall = jest.fn(() => Promise.resolve({ message: { device_id: 'device' } }));
  Object.assign(device, {
    commands: { typedCall },
    stateStore: { getState: () => undefined },
    isProtocolV2: () => false,
    _updateFeatures: jest.fn(),
    getInternalState: jest.fn(() => undefined),
  });
  return { device, typedCall };
}

describe('Device.initialize Protocol V1 timeout', () => {
  beforeEach(() => {
    jest.spyOn(TransportManager, 'reconfigure').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('passes a custom Initialize timeout through to typedCall', async () => {
    const { device, typedCall } = buildV1Device();

    await device.initialize({ timeoutMs: 2500 });

    expect(typedCall).toHaveBeenCalledWith(
      'Initialize',
      'Features',
      expect.objectContaining({ is_contains_attach: true }),
      { timeoutMs: 2500 }
    );
  });

  test('keeps the 25s Initialize timeout by default', async () => {
    const { device, typedCall } = buildV1Device();

    await device.initialize();

    expect(typedCall).toHaveBeenCalledWith(
      'Initialize',
      'Features',
      expect.objectContaining({ is_contains_attach: true }),
      { timeoutMs: 25 * 1000 }
    );
  });
});
