import { HardwareErrorCode } from '@onekeyfe/hwk-adapter-core';

import {
  isDeviceDisconnectedError,
  isDeviceLockedError,
  isTimeoutError,
  isUserRejectedError,
  isWrongAppError,
  mapLedgerError,
} from '../errors';

// ---------------------------------------------------------------------------
// Shared guards: all detectors return false for null/undefined/unrelated
// ---------------------------------------------------------------------------

describe('error detector shared guards', () => {
  const detectors = [
    isDeviceLockedError,
    isUserRejectedError,
    isWrongAppError,
    isDeviceDisconnectedError,
    isTimeoutError,
  ];

  it.each(detectors)('%o should return false for null/undefined', fn => {
    expect(fn(null)).toBe(false);
    expect(fn(undefined)).toBe(false);
  });

  it.each(detectors)('%o should return false for unrelated errors', fn => {
    expect(fn(new Error('completely unrelated'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isDeviceLockedError
// ---------------------------------------------------------------------------

describe('isDeviceLockedError', () => {
  it('should detect errorCode 5515', () => {
    expect(isDeviceLockedError({ errorCode: '5515' })).toBe(true);
  });

  it('should detect statusCode 6982', () => {
    expect(isDeviceLockedError({ statusCode: '6982' })).toBe(true);
  });

  it('should detect _tag DeviceLockedError', () => {
    expect(isDeviceLockedError({ _tag: 'DeviceLockedError' })).toBe(true);
  });

  it('should detect "locked" in message', () => {
    expect(isDeviceLockedError({ message: 'Device is Locked' })).toBe(true);
  });

  it('should detect in error chain (originalError)', () => {
    expect(isDeviceLockedError({ originalError: { errorCode: '5515' } })).toBe(true);
  });

  it('should detect in error chain (_tag + .error)', () => {
    expect(isDeviceLockedError({ _tag: 'SomeWrapper', error: { errorCode: '5515' } })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isUserRejectedError
// ---------------------------------------------------------------------------

describe('isUserRejectedError', () => {
  it('should detect statusCode 6985 (conditions of use not satisfied)', () => {
    expect(isUserRejectedError({ statusCode: '6985' })).toBe(true);
  });

  it('should detect errorCode 27013 (decimal of 0x6985)', () => {
    expect(isUserRejectedError({ errorCode: '27013' })).toBe(true);
  });

  it('should detect _tag UserRefusedOnDevice', () => {
    expect(isUserRejectedError({ _tag: 'UserRefusedOnDevice' })).toBe(true);
  });

  it('should detect "denied" in message', () => {
    expect(isUserRejectedError({ message: 'Transaction denied by user' })).toBe(true);
  });

  it('should detect "rejected" in message', () => {
    expect(isUserRejectedError({ message: 'User rejected the operation' })).toBe(true);
  });

  it('should detect "refused" in message', () => {
    expect(isUserRejectedError({ message: 'Action refused on device' })).toBe(true);
  });

  it('should detect in error chain via originalError', () => {
    expect(isUserRejectedError({ originalError: { statusCode: '6985' } })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isWrongAppError
// ---------------------------------------------------------------------------

describe('isWrongAppError', () => {
  it('should detect statusCode 6e00 (CLA not supported)', () => {
    expect(isWrongAppError({ statusCode: '6e00' })).toBe(true);
  });

  it('should detect errorCode 28160 (decimal of 0x6e00)', () => {
    expect(isWrongAppError({ errorCode: '28160' })).toBe(true);
  });

  it('should detect statusCode 6d00 (INS not supported)', () => {
    expect(isWrongAppError({ statusCode: '6d00' })).toBe(true);
  });

  it('should detect "wrong app" in message', () => {
    expect(isWrongAppError({ message: 'Wrong app is currently open' })).toBe(true);
  });

  it('should detect "open the Ethereum app" in message', () => {
    expect(isWrongAppError({ message: 'Please open the Ethereum app' })).toBe(true);
  });

  it('should detect "CLA not supported" in message', () => {
    expect(isWrongAppError({ message: 'CLA not supported' })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isDeviceDisconnectedError
// ---------------------------------------------------------------------------

describe('isDeviceDisconnectedError', () => {
  it('should detect _tag DeviceNotRecognizedError', () => {
    expect(isDeviceDisconnectedError({ _tag: 'DeviceNotRecognizedError' })).toBe(true);
  });

  it('should detect _tag DeviceSessionNotFound', () => {
    expect(isDeviceDisconnectedError({ _tag: 'DeviceSessionNotFound' })).toBe(true);
  });

  it('should detect "disconnected" in message', () => {
    expect(isDeviceDisconnectedError({ message: 'Device was disconnected' })).toBe(true);
  });

  it('should detect "no device" in message', () => {
    expect(isDeviceDisconnectedError({ message: 'No device connected' })).toBe(true);
  });

  it('should detect "session not found" in message', () => {
    expect(isDeviceDisconnectedError({ message: 'Session not found for device' })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isTimeoutError
// ---------------------------------------------------------------------------

describe('isTimeoutError', () => {
  it('should detect _tag DeviceExchangeTimeoutError', () => {
    expect(isTimeoutError({ _tag: 'DeviceExchangeTimeoutError' })).toBe(true);
  });

  it('should detect _tag SendApduTimeoutError', () => {
    expect(isTimeoutError({ _tag: 'SendApduTimeoutError' })).toBe(true);
  });

  it('should detect _tag SendCommandTimeoutError', () => {
    expect(isTimeoutError({ _tag: 'SendCommandTimeoutError' })).toBe(true);
  });

  it('should NOT match arbitrary "timeout" in message', () => {
    expect(isTimeoutError({ message: 'Operation timeout' })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// mapLedgerError
// ---------------------------------------------------------------------------

describe('mapLedgerError', () => {
  it('should map locked device to DeviceLocked with recovery message', () => {
    const result = mapLedgerError({ errorCode: '5515' });
    expect(result.code).toBe(HardwareErrorCode.DeviceLocked);
    expect(result.message).toContain('unlock');
  });

  it('should map user rejection to UserRejected', () => {
    const result = mapLedgerError({ statusCode: '6985' });
    expect(result.code).toBe(HardwareErrorCode.UserRejected);
    expect(result.message).toContain('rejected');
  });

  it('should map wrong app to WrongApp with recovery message', () => {
    const result = mapLedgerError({ statusCode: '6e00' });
    expect(result.code).toBe(HardwareErrorCode.WrongApp);
    expect(result.message).toContain('open the correct app');
  });

  it('should map device disconnected to DeviceDisconnected', () => {
    const result = mapLedgerError({ _tag: 'DeviceNotRecognizedError', message: 'gone' });
    expect(result.code).toBe(HardwareErrorCode.DeviceDisconnected);
    expect(result.message).toContain('reconnect');
  });

  it('should map timeout to OperationTimeout', () => {
    const result = mapLedgerError(
      Object.assign(new Error('APDU timeout'), { _tag: 'SendApduTimeoutError' })
    );
    expect(result.code).toBe(HardwareErrorCode.OperationTimeout);
  });

  it('should fall through to UnknownError for unrecognized errors', () => {
    const result = mapLedgerError(new Error('something unexpected'));
    expect(result.code).toBe(HardwareErrorCode.UnknownError);
    expect(result.message).toBe('something unexpected');
  });

  it('should handle non-Error objects with _tag', () => {
    const result = mapLedgerError({ _tag: 'SomeOtherError' });
    expect(result.code).toBe(HardwareErrorCode.UnknownError);
    expect(result.message).toBe('SomeOtherError');
  });

  it('should prefer locked over user-rejected when both codes present', () => {
    // 6982 is in locked set
    const result = mapLedgerError({ statusCode: '6982' });
    expect(result.code).toBe(HardwareErrorCode.DeviceLocked);
  });
});
