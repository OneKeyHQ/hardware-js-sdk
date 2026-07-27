import { describe, expect, test } from '@jest/globals';

import {
  getFirmwareVersionsFromDeviceState,
  getPassphraseProtectionFromDeviceState,
  parseDeviceVersionTuple,
} from './deviceStateSelectors';

describe('DeviceState selectors', () => {
  const passphraseCases: Array<[boolean | null | undefined, boolean | undefined]> = [
    [true, true],
    [false, false],
    [null, undefined],
    [undefined, undefined],
  ];

  test.each(passphraseCases)('preserves passphrase status %s as %s', (value, expected) => {
    expect(
      getPassphraseProtectionFromDeviceState({
        status: { passphraseProtection: value },
      } as never)
    ).toBe(expected);
  });

  test('reads firmware versions from the canonical versions section', () => {
    expect(
      getFirmwareVersionsFromDeviceState({
        versions: {
          firmware: '2.0.1',
          bootloader: '1.2.0',
          ble: '3.4.5',
        },
      } as never)
    ).toEqual({
      firmwareVersion: '2.0.1',
      bootloaderVersion: '1.2.0',
      bleVersion: '3.4.5',
    });
  });

  test('returns undefined when no version is available', () => {
    expect(
      getFirmwareVersionsFromDeviceState({
        versions: { firmware: null, bootloader: null, ble: null },
      } as never)
    ).toBeUndefined();
  });

  const versionCases: Array<[string | null, [number, number, number] | null]> = [
    ['2.1.0', [2, 1, 0]],
    ['3.4', [3, 4, 0]],
    [null, null],
    ['invalid', null],
  ];

  test.each(versionCases)('parses version %s as %s', (version, expected) => {
    expect(parseDeviceVersionTuple(version)).toEqual(expected);
  });
});
