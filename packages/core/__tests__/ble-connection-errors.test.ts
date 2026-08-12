import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import {
  isRetryableBleProtocolV2ProbeError,
  shouldRetryBleConnection,
  shouldStopBleConnectionPolling,
} from '../src/core/bleConnectionErrors';

import type { BaseMethod } from '../src/api/BaseMethod';

function buildMethod(connectProtocol: 'V1' | 'V2', options?: { reuseConnectedOnly?: boolean }) {
  return {
    payload: { connectProtocol, ...options },
  } as BaseMethod;
}

describe('BLE connection polling errors', () => {
  test('stops polling when BLE UUID is missing', () => {
    const error = ERRORS.TypedError(HardwareErrorCode.BleRequiredUUID);

    expect(shouldStopBleConnectionPolling(buildMethod('V2'), error)).toBe(true);
  });

  test('stops outer polling after a strict Protocol V2 probe mismatch', () => {
    const error = Object.assign(
      new Error(
        'Device protocol mismatch: expected V2, but device did not respond to expected protocol'
      ),
      { errorCode: HardwareErrorCode.RuntimeError }
    );

    expect(isRetryableBleProtocolV2ProbeError(buildMethod('V2'), error)).toBe(true);
    expect(shouldStopBleConnectionPolling(buildMethod('V2'), error)).toBe(true);
  });

  test('stops polling when connected-only reuse finds a disconnected device', () => {
    const error = ERRORS.TypedError(HardwareErrorCode.DeviceNotFound);

    expect(
      shouldStopBleConnectionPolling(buildMethod('V2', { reuseConnectedOnly: true }), error)
    ).toBe(true);
    expect(shouldStopBleConnectionPolling(buildMethod('V2'), error)).toBe(false);
  });

  test.each([
    ERRORS.TypedError(HardwareErrorCode.DeviceBusy),
    Object.assign(new Error('IPC transport error'), {
      errorCode: HardwareErrorCode.RuntimeError,
    }),
    new Error('IPC error without structured fields'),
  ])('stops connected-only polling after any single connection failure', error => {
    expect(
      shouldStopBleConnectionPolling(buildMethod('V2', { reuseConnectedOnly: true }), error)
    ).toBe(true);
  });

  test('does not classify a generic runtime error as terminal', () => {
    const error = Object.assign(new Error('temporary BLE failure'), {
      errorCode: HardwareErrorCode.RuntimeError,
    });

    expect(shouldStopBleConnectionPolling(buildMethod('V2'), error)).toBe(false);
  });

  test('does not apply the Protocol V2 mismatch rule to Protocol V1', () => {
    const error = Object.assign(
      new Error(
        'Device protocol mismatch: expected V2, but device did not respond to expected protocol'
      ),
      { errorCode: HardwareErrorCode.RuntimeError }
    );

    expect(shouldStopBleConnectionPolling(buildMethod('V1'), error)).toBe(false);
  });

  test.each([
    ERRORS.TypedError(HardwareErrorCode.BleTimeoutError),
    ERRORS.TypedError(HardwareErrorCode.BleConnectedError),
    Object.assign(
      new Error(
        'Device protocol mismatch: expected V2, but device did not respond to expected protocol'
      ),
      { errorCode: HardwareErrorCode.RuntimeError }
    ),
  ])('does not retry any reusable-link failure in connected-only mode', error => {
    expect(shouldRetryBleConnection(buildMethod('V2', { reuseConnectedOnly: true }), error)).toBe(
      false
    );
  });

  test.each([
    ERRORS.TypedError(HardwareErrorCode.BleTimeoutError),
    ERRORS.TypedError(HardwareErrorCode.BleConnectedError),
    Object.assign(
      new Error(
        'Device protocol mismatch: expected V2, but device did not respond to expected protocol'
      ),
      { errorCode: HardwareErrorCode.RuntimeError }
    ),
  ])('keeps the existing retry policy outside connected-only mode', error => {
    expect(shouldRetryBleConnection(buildMethod('V2'), error)).toBe(true);
  });
});
