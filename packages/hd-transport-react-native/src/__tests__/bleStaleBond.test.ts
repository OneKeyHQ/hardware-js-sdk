import { HardwareErrorCode } from '@onekeyfe/hd-shared';

import { isNativeBleStaleBondError, toBleStaleBondHardwareError } from '../bleStaleBond';

describe('native BLE stale bond mapping', () => {
  test.each([
    [
      { attErrorCode: 15, reason: 'Encryption is insufficient' },
      HardwareErrorCode.BleDeviceBondError,
    ],
    [
      { attErrorCode: 5, reason: 'GATT_INSUF_AUTHENTICATION' },
      HardwareErrorCode.BleDeviceBondError,
    ],
    [
      { androidErrorCode: 5, reason: 'Connection state changed with status 5' },
      HardwareErrorCode.BleDeviceBondError,
    ],
    [
      { androidErrorCode: 15, reason: 'Connection state changed with status 15' },
      HardwareErrorCode.BleDeviceBondError,
    ],
    [
      { iosErrorCode: 14, reason: 'Peer removed pairing information' },
      HardwareErrorCode.BlePeerRemovedPairingInformation,
    ],
    [
      { reason: 'peer removed pairing information' },
      HardwareErrorCode.BlePeerRemovedPairingInformation,
    ],
    [
      { message: 'PEER REMOVED PAIRING INFORMATION' },
      HardwareErrorCode.BlePeerRemovedPairingInformation,
    ],
  ])('maps %j to %s', (nativeError, errorCode) => {
    expect(isNativeBleStaleBondError(nativeError)).toBe(true);
    expect(toBleStaleBondHardwareError(nativeError)).toMatchObject({ errorCode });
  });

  test('does not treat the generic ATT unlikely error as a stale bond', () => {
    expect(isNativeBleStaleBondError({ attErrorCode: 14, reason: 'Unlikely error' })).toBe(false);
  });

  test('does not treat a generic disconnect as a stale bond', () => {
    expect(isNativeBleStaleBondError({ reason: 'Device disconnected' })).toBe(false);
  });
});
