import { DevicePool, canPathIdentifyDevice } from '../src/device/DevicePool';

jest.mock('../src/data/config', () => ({
  getSDKVersion: () => '1.0.0',
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

// A bootloader device reports this placeholder as its USB serial number, and the
// descriptor path is that serial number.
const BOOTLOADER_PATH = '000000000000000000000000';
const MINI_SERIAL = 'MI05W01202110270714200000644';

const deviceStub = (path: string, deviceType: string) =>
  ({
    originalDescriptor: { path },
    features: { serial_no: `${deviceType}-serial` },
    deviceType,
    updateDescriptor: jest.fn(),
  } as any);

describe('canPathIdentifyDevice', () => {
  it('accepts a real serial number', () => {
    expect(canPathIdentifyDevice(MINI_SERIAL)).toBe(true);
  });

  it('rejects the all-zero placeholder every bootloader device reports', () => {
    expect(canPathIdentifyDevice(BOOTLOADER_PATH)).toBe(false);
    expect(canPathIdentifyDevice('0')).toBe(false);
  });

  it('rejects an absent path', () => {
    expect(canPathIdentifyDevice('')).toBe(false);
    expect(canPathIdentifyDevice(undefined)).toBe(false);
  });
});

describe('DevicePool.getDeviceByPath', () => {
  afterEach(() => {
    DevicePool.devicesCache = {};
  });

  it('still reuses a cached device addressed by a real serial', () => {
    const mini = deviceStub(MINI_SERIAL, 'mini');
    DevicePool.devicesCache = { 'uuid-mini': mini };
    expect(DevicePool.getDeviceByPath(MINI_SERIAL)).toBe(mini);
  });

  // The placeholder path is what handed a Classic back as the Mini plugged in
  // first: both descriptors carry it, so the cache hit won and the device was
  // never read. Reporting a miss is what sends the caller to read it.
  it('reports a miss on the path every bootloader device shares', () => {
    const mini = deviceStub(BOOTLOADER_PATH, 'mini');
    DevicePool.devicesCache = { 'uuid-mini': mini };
    expect(DevicePool.getDeviceByPath(BOOTLOADER_PATH)).toBeUndefined();
  });

  it('reports a miss rather than an arbitrary entry when several share the path', () => {
    DevicePool.devicesCache = {
      'uuid-mini': deviceStub(BOOTLOADER_PATH, 'mini'),
      'uuid-classic': deviceStub(BOOTLOADER_PATH, 'classic'),
    };
    expect(DevicePool.getDeviceByPath(BOOTLOADER_PATH)).toBeUndefined();
  });
});
