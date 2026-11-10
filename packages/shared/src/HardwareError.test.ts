import {
  HardwareErrorCode,
  HardwareErrorCodeMessage,
  TypedError,
  serializeError,
} from './HardwareError';
import { ERROR_CODES_REQUIRE_DISCONNECT, ERROR_CODES_REQUIRE_RELEASE } from './constants';

describe('HardwareErrorCode compatibility', () => {
  test.each([
    ['TransportProtocolProbeFailed', 604, { expectedProtocol: 'V1' }],
    ['TransportProtocolMismatch', 605, { expectedProtocol: 'V2', detectedProtocol: 'V1' }],
  ] as const)('serializes the dedicated %s transport error', (name, code, params) => {
    expect(HardwareErrorCode[name]).toBe(code);
    const message = HardwareErrorCodeMessage[HardwareErrorCode[name]];
    expect(message).toBeTruthy();
    expect(ERROR_CODES_REQUIRE_RELEASE).toContain(code);
    expect(ERROR_CODES_REQUIRE_DISCONNECT).toContain(code);
    expect(
      JSON.parse(JSON.stringify(serializeError({ error: TypedError(code, undefined, params) })))
    ).toEqual({ code, error: message, params });
  });

  test('preserves published Protocol V2 values while leaving code 829 unused', () => {
    expect(HardwareErrorCode).not.toHaveProperty('KaspaPrevTxIdMismatch');
    expect(HardwareErrorCode.DeviceLocked).toBe(830);
    expect(HardwareErrorCode.WalletSessionInvalid).toBe(831);
  });

  test('uses actionable wallet-context messages', () => {
    expect(HardwareErrorCodeMessage[HardwareErrorCode.DeviceCheckDeviceIdError]).toContain(
      'does not match this wallet'
    );
    expect(HardwareErrorCodeMessage[HardwareErrorCode.DeviceCheckUnlockTypeError]).toContain(
      'corresponding PIN or passphrase'
    );
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

  test('reserves a dedicated hd-core code for an invalid OS BLE bond', () => {
    expect(HardwareErrorCode.BleBondInvalid).toBe(724);
    expect(HardwareErrorCodeMessage[HardwareErrorCode.BleBondInvalid]).toContain(
      'pairing information is no longer valid'
    );
  });
});
