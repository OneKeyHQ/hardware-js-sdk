import {
  HardwareErrorCode,
  HardwareErrorCodeMessage,
  TypedError,
  serializeError,
} from './HardwareError';

describe('HardwareErrorCode compatibility', () => {
  test('preserves published Protocol V2 values while leaving code 829 unused', () => {
    expect(HardwareErrorCode).not.toHaveProperty('KaspaPrevTxIdMismatch');
    expect(HardwareErrorCode.DeviceLocked).toBe(830);
    expect(HardwareErrorCode.WalletSessionInvalid).toBe(831);
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
});
