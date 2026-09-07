import { HardwareErrorCode } from '@onekeyfe/hd-shared';

import { isNativeBleDisconnectError, toBleDisconnectHardwareError } from '../bleNativeDisconnect';

describe('native BLE disconnect mapping', () => {
  test.each([
    [{ errorCode: 201, reason: 'The specified device has disconnected from us.' }],
    [{ errorCode: 201, iosErrorCode: 7, reason: 'The specified device has disconnected from us.' }],
    [{ iosErrorCode: 7, reason: 'Peripheral disconnected' }],
  ])('recognizes %j as a native disconnect', nativeError => {
    expect(isNativeBleDisconnectError(nativeError)).toBe(true);
    expect(toBleDisconnectHardwareError(nativeError)).toMatchObject({
      errorCode: HardwareErrorCode.BleDeviceDisconnected,
    });
  });

  test('does not treat a stale-bond iOS code as a disconnect', () => {
    expect(
      isNativeBleDisconnectError({
        iosErrorCode: 14,
        reason: 'Peer removed pairing information',
      })
    ).toBe(false);
  });

  test('does not treat an already-canonical unpaired error as a native disconnect', () => {
    expect(
      isNativeBleDisconnectError({
        errorCode: HardwareErrorCode.BleDeviceNotBonded,
      })
    ).toBe(false);
  });
});
