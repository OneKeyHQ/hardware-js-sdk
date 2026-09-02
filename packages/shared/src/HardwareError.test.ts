import {
  HardwareErrorCode,
  HardwareErrorCodeMessage,
  TypedError,
  isBleStaleBondErrorText,
  serializeError,
} from './HardwareError';

describe('HardwareErrorCode compatibility', () => {
  test('preserves published Protocol V2 values while leaving code 829 unused', () => {
    expect(HardwareErrorCode).not.toHaveProperty('KaspaPrevTxIdMismatch');
    expect(HardwareErrorCode.DeviceLocked).toBe(830);
    expect(HardwareErrorCode.WalletSessionInvalid).toBe(831);
    expect(HardwareErrorCode.TransportFrameTooLarge).toBe(833);
  });

  test('uses actionable wallet-context and transport messages', () => {
    expect(HardwareErrorCodeMessage[HardwareErrorCode.DeviceCheckDeviceIdError]).toContain(
      'does not match this wallet'
    );
    expect(HardwareErrorCodeMessage[HardwareErrorCode.DeviceCheckUnlockTypeError]).toContain(
      'corresponding PIN or passphrase'
    );
    expect(
      serializeError({
        error: TypedError(HardwareErrorCode.TransportFrameTooLarge, undefined, {
          frameBytes: 2245,
          maxFrameBytes: 2048,
          transport: 'ReactNativeBleTransport',
        }),
      })
    ).toEqual({
      code: 833,
      error:
        'The request is too large for the current connection. Try a smaller transaction or use USB.',
      params: {
        frameBytes: 2245,
        maxFrameBytes: 2048,
        transport: 'ReactNativeBleTransport',
      },
    });
  });

  test('reserves the BLE and USB conflict code for app error mapping', () => {
    expect(HardwareErrorCode.BleUnavailableWhileUsbConnected).toBe(723);
    expect(HardwareErrorCodeMessage[HardwareErrorCode.BleUnavailableWhileUsbConnected]).toBe(
      'Bluetooth is unavailable while USB is connected. Unplug USB and try again.'
    );
    expect(
      serializeError({
        error: TypedError(HardwareErrorCode.BleUnavailableWhileUsbConnected, undefined, {
          failureCode: 'Failure_ProcessError',
          firmwareMessage: 'link disabled',
        }),
      })
    ).toEqual({
      code: 723,
      error: 'Bluetooth is unavailable while USB is connected. Unplug USB and try again.',
      params: {
        failureCode: 'Failure_ProcessError',
        firmwareMessage: 'link disabled',
      },
    });
  });

  test('recognizes the macOS CoreBluetooth stale-pairing error without matching generic failures', () => {
    expect(
      isBleStaleBondErrorText(
        'CBErrorDomain:14 Peer removed pairing information on the device side'
      )
    ).toBe(true);
    expect(isBleStaleBondErrorText('connection failed')).toBe(false);
  });
});
