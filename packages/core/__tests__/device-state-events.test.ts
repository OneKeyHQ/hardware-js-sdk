import { Device } from '../src/device/Device';
import { DEVICE } from '../src/events';
import { EOneKeyDeviceMode } from '../src/types';

jest.mock('../src/data/config', () => ({
  getSDKVersion: jest.fn(() => '1.0.0'),
  DEFAULT_DOMAIN: 'https://jssdk.onekey.so/1.0.0/',
}));

describe('Device state events', () => {
  test('emits only the canonical state event for Protocol V2', () => {
    const device = Device.fromDescriptor({
      id: 'pro2',
      path: 'pro2',
      protocolType: 'V2',
    } as never);
    const onState = jest.fn();
    const onFeatures = jest.fn();
    device.on(DEVICE.STATE, onState);
    device.on(DEVICE.FEATURES, onFeatures);

    const state = device.updateState(
      {
        protocol: 'V2',
        identity: { label: 'Renamed', bleName: 'Pro2 1234' },
        raw: {
          protocolV2DeviceInfo: { protocol_version: 2 },
        },
      },
      'settings-write'
    );

    expect(state?.identity.label).toBe('Renamed');
    expect(onState).toHaveBeenCalledWith(
      device,
      expect.objectContaining({
        state: expect.objectContaining({ revision: 1 }),
        revision: 1,
        source: 'settings-write',
      })
    );
    expect(onFeatures).not.toHaveBeenCalled();
    expect(onState.mock.calls[0][1].state).not.toHaveProperty('raw');
    expect(onState.mock.calls[0][1].state).not.toHaveProperty('session');
    expect(device.state?.raw?.protocolV2DeviceInfo).toEqual({ protocol_version: 2 });
  });

  test.each([
    ['normal', null, EOneKeyDeviceMode.normal],
    ['notInitialized', false, EOneKeyDeviceMode.notInitialized],
    ['backupMode', true, EOneKeyDeviceMode.backupMode],
    ['bootloader', null, EOneKeyDeviceMode.bootloader],
    ['romloader', null, EOneKeyDeviceMode.bootloader],
  ] as const)(
    'uses canonical %s mode even when initialized is %s',
    (mode, initialized, expected) => {
      const device = Device.fromDescriptor({
        id: 'mode',
        path: 'mode',
        protocolType: 'V2',
      } as never);
      device.updateState({ protocol: 'V2', status: { mode, initialized } }, 'initialize');

      expect(device.getMode()).toBe(expected);
    }
  );

  test('commits lock success to canonical state and emits one state event', async () => {
    const device = Device.fromDescriptor({ id: 'pro2', path: 'pro2', protocolType: 'V2' } as never);
    (device as any).commands = {
      typedCall: jest.fn().mockResolvedValue({ message: { message: 'locked' } }),
    };
    device.updateState(
      { protocol: 'V2', status: { mode: 'normal', initialized: true, unlocked: true } },
      'initialize'
    );
    const onState = jest.fn();
    device.on(DEVICE.STATE, onState);

    await device.lockDevice();

    expect(device.state?.status.unlocked).toBe(false);
    expect(onState).toHaveBeenCalledWith(
      device,
      expect.objectContaining({ source: 'lock', changedKeys: ['status.unlocked'] })
    );
  });

  test('continues emitting projected Features events for Protocol V1', () => {
    const device = Device.fromDescriptor({ id: 'legacy', path: 'legacy' } as never);
    const onFeatures = jest.fn();
    device.on(DEVICE.FEATURES, onFeatures);

    device.updateState(
      {
        protocol: 'V1',
        identity: { label: 'Legacy' },
      },
      'settings-write'
    );

    expect(onFeatures).toHaveBeenCalledWith(device, expect.objectContaining({ label: 'Legacy' }));
  });

  test('keeps Features assignment as an import-only compatibility projection', () => {
    const device = Device.fromDescriptor({ id: 'legacy', path: 'legacy' } as never);

    (device as any).features = {
      protocol: 'V1',
      deviceType: 'pro',
      firmwareType: 'universal',
      model: 'pro',
      vendor: 'onekey.so',
      deviceId: 'device-1',
      serialNo: 'SERIAL-1',
      label: 'Imported',
      bleName: null,
      capabilities: [],
      mode: 'normal',
      initialized: true,
      bootloaderMode: false,
      unlocked: true,
      firmwarePresent: true,
      passphraseProtection: false,
      pinProtection: true,
      backupRequired: false,
      noBackup: false,
      unfinishedBackup: false,
      recoveryMode: false,
      language: 'en-US',
      bleEnabled: true,
      sdCardPresent: false,
      sdProtection: false,
      wipeCodeProtection: false,
      passphraseAlwaysOnDevice: false,
      safetyChecks: null,
      autoLockDelayMs: 10_000,
      autoShutdownDelayMs: 20_000,
      displayRotation: 0,
      experimentalFeatures: false,
      wallpaperPath: null,
      brightness: 50,
      animationEnabled: true,
      tapToWake: true,
      hapticFeedback: true,
      deviceNameDisplayEnabled: true,
      airgapMode: false,
      fidoEnabled: true,
      usbLockEnabled: false,
      randomKeypad: false,
      firmwareVersion: '4.0.0',
      bootloaderVersion: '1.0.0',
      boardVersion: '1.0.0',
      bleVersion: '1.0.0',
      sessionId: null,
    };

    expect(device.state?.identity.label).toBe('Imported');
    expect(device.features).not.toBe((device as any).state);
    expect(device.features?.label).toBe('Imported');
  });
});
