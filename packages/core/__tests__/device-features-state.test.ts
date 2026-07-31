import { mergeDeviceFeaturesPatch } from '../src/device/DeviceFeaturesState';

import type { Features } from '../src/types';

const baseFeatures = {
  protocol: 'V2',
  deviceType: 'pro2',
  firmwareType: 'universal',
  model: 'pro2',
  vendor: 'onekey.so',
  deviceId: null,
  serialNo: 'P20001',
  label: 'Old Label',
  bleName: 'Pro2 0001',
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
  sdCardPresent: null,
  sdProtection: null,
  wipeCodeProtection: null,
  passphraseAlwaysOnDevice: null,
  safetyChecks: null,
  autoLockDelayMs: 60_000,
  displayRotation: null,
  experimentalFeatures: false,
  firmwareVersion: '1.0.0',
  bootloaderVersion: '1.0.0',
  boardVersion: '1.0.0',
  bleVersion: '1.0.0',
  sessionId: null,
} as Features;

describe('mergeDeviceFeaturesPatch', () => {
  it('ignores undefined fields instead of clearing cached values', () => {
    const next = mergeDeviceFeaturesPatch(baseFeatures, {
      label: undefined,
      language: 'ja-JP',
    });

    expect(next).toMatchObject({
      label: 'Old Label',
      language: 'ja-JP',
    });
  });

  it('allows null to explicitly clear a cached value', () => {
    const next = mergeDeviceFeaturesPatch(baseFeatures, { label: null });

    expect(next.label).toBeNull();
  });

  it('returns the same object when no value changes', () => {
    const next = mergeDeviceFeaturesPatch(baseFeatures, {
      label: 'Old Label',
      language: undefined,
    });

    expect(next).toBe(baseFeatures);
  });

  it('returns a new object when a defined value changes', () => {
    const next = mergeDeviceFeaturesPatch(baseFeatures, { label: 'New Label' });

    expect(next).not.toBe(baseFeatures);
    expect(next.label).toBe('New Label');
  });
});
