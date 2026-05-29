import {
  HardwareErrorCode,
  serializeConnectorError,
} from '@onekeyfe/hwk-adapter-core';

import {
  ERROR_TAG,
  isDeviceDisconnectedError,
  isDeviceLockedError,
  isTimeoutError,
  isUserRejectedError,
  isWrongAppError,
  ledgerFailure,
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

  it('should map OpenAppCommand 0x6807 to AppNotInstalled', () => {
    const result = mapLedgerError({
      _tag: ERROR_TAG.OpenAppCommand,
      statusCode: 0x6807,
      errorCode: '6807',
      message: 'Failed to open Bitcoin',
    });
    expect(result.code).toBe(HardwareErrorCode.AppNotInstalled);
  });

  it('should not map OpenAppCommand without app-not-installed signal to AppNotInstalled', () => {
    const result = mapLedgerError({
      _tag: ERROR_TAG.OpenAppCommand,
      statusCode: 0x6985,
      errorCode: '6985',
      message: 'Failed to open Bitcoin',
    });
    expect(result.code).toBe(HardwareErrorCode.UserRejected);
  });

  it('should map device disconnected to DeviceDisconnected', () => {
    const result = mapLedgerError({ _tag: 'DeviceNotRecognizedError', message: 'gone' });
    expect(result.code).toBe(HardwareErrorCode.DeviceDisconnected);
    expect(result.message).toContain('reconnect');
  });

  it('should map BLE not-advertising to DeviceNotFound', () => {
    const result = mapLedgerError({
      _tag: 'DeviceNotAdvertisingError',
      message: 'Ledger device is not currently advertising',
    });
    expect(result.code).toBe(HardwareErrorCode.DeviceNotFound);
  });

  it.each([ERROR_TAG.NoAccessibleDevice, ERROR_TAG.UnknownDevice, ERROR_TAG.DeviceNotInitialized])(
    'should map %s to DeviceNotFound',
    tag => {
      const result = mapLedgerError({ _tag: tag });
      expect(result.code).toBe(HardwareErrorCode.DeviceNotFound);
    }
  );

  it('should map OpeningConnectionError to DeviceBusy', () => {
    const result = mapLedgerError({ _tag: ERROR_TAG.OpeningConnection });
    expect(result.code).toBe(HardwareErrorCode.DeviceBusy);
  });

  it.each([
    ERROR_TAG.DeviceSessionRefresher,
    ERROR_TAG.DeviceDisconnectedBeforeSendingApdu,
    ERROR_TAG.DeviceDisconnectedWhileSending,
    ERROR_TAG.Disconnect,
    ERROR_TAG.ReconnectionFailed,
    ERROR_TAG.WebHIDDisconnect,
  ])('should map %s to DeviceDisconnected', tag => {
    const result = mapLedgerError({ _tag: tag });
    expect(result.code).toBe(HardwareErrorCode.DeviceDisconnected);
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

  it('should map Solana 0x6808 to SolanaBlindSigningRequired', () => {
    const result = mapLedgerError({ errorCode: '6808' });
    expect(result.code).toBe(HardwareErrorCode.SolanaBlindSigningRequired);
    expect(result.message).toContain('Blind signing');
  });

  it('should not map Ethereum app 0x6a80 to blind signing without step metadata', () => {
    const result = mapLedgerError({
      _tag: ERROR_TAG.EthAppCommand,
      errorCode: '6a80',
      message: 'Invalid data',
    });
    expect(result.code).toBe(HardwareErrorCode.UnknownError);
    expect(result.message).toBe('Invalid data');
  });

  it('should map Ethereum app 0x6a80 to EvmBlindSigningRequired with blind fallback step', () => {
    const result = mapLedgerError({
      _tag: ERROR_TAG.EthAppCommand,
      errorCode: '6a80',
      message: 'Invalid data',
      _lastStep: 'signer.eth.steps.blindSignTransactionFallback',
    });
    expect(result.code).toBe(HardwareErrorCode.EvmBlindSigningRequired);
    expect(result.message).toContain('Blind signing');
  });

  it('should map Ethereum app 0x6a80 to EvmBlindSigningRequired when step history includes blind fallback', () => {
    const result = mapLedgerError({
      _tag: ERROR_TAG.EthAppCommand,
      errorCode: '6a80',
      message: 'Invalid data',
      _lastStep: 'signer.eth.steps.detectBlindSigning',
      _deviceActionSteps: [
        'signer.eth.steps.signTransaction',
        'signer.eth.steps.blindSignTransactionFallback',
        'signer.eth.steps.detectBlindSigning',
      ],
    });
    expect(result.code).toBe(HardwareErrorCode.EvmBlindSigningRequired);
  });

  it('should map Tron 0x6a8d (hex) to TronCustomContractRequired', () => {
    const result = mapLedgerError({ errorCode: '6a8d' });
    expect(result.code).toBe(HardwareErrorCode.TronCustomContractRequired);
    expect(result.message).toContain('Custom Contracts');
  });

  it('should map Tron 0x6a8d (numeric statusCode) to TronCustomContractRequired', () => {
    const result = mapLedgerError({ statusCode: 0x6a8d });
    expect(result.code).toBe(HardwareErrorCode.TronCustomContractRequired);
  });

  it('should map Tron 0x6a8b to TronDataSigningRequired', () => {
    const result = mapLedgerError({ errorCode: '6a8b' });
    expect(result.code).toBe(HardwareErrorCode.TronDataSigningRequired);
  });

  it('should map Tron 0x6a8c to TronSignByHashRequired', () => {
    const result = mapLedgerError({ errorCode: '6a8c' });
    expect(result.code).toBe(HardwareErrorCode.TronSignByHashRequired);
  });

  it('should map BTC 0xb008 to BtcWalletPolicyHmacMismatch', () => {
    const result = mapLedgerError({ errorCode: 'b008' });
    expect(result.code).toBe(HardwareErrorCode.BtcWalletPolicyHmacMismatch);
    expect(result.message).toContain('Wallet policy');
  });

  it('should map BTC 0xb007 to BtcUnexpectedState', () => {
    const result = mapLedgerError({ errorCode: 'b007' });
    expect(result.code).toBe(HardwareErrorCode.BtcUnexpectedState);
  });

  it('should unwrap chain-specific APDU from nested originalError', () => {
    const result = mapLedgerError({
      _tag: 'SomeWrapper',
      message: 'wrapped',
      originalError: { errorCode: '6808' },
    });
    expect(result.code).toBe(HardwareErrorCode.SolanaBlindSigningRequired);
  });

  it('should prefer user-rejected over chain-specific code', () => {
    const result = mapLedgerError({ statusCode: '6985', errorCode: '6a8d' });
    expect(result.code).toBe(HardwareErrorCode.UserRejected);
  });
});

// ---------------------------------------------------------------------------
// ledgerFailure
// ---------------------------------------------------------------------------

describe('ledgerFailure', () => {
  it('includes appName in payload when provided', () => {
    const r = ledgerFailure(HardwareErrorCode.WrongApp, 'wrong app', 'Bitcoin');
    expect(r.success).toBe(false);
    expect(r.payload.code).toBe(HardwareErrorCode.WrongApp);
    expect(r.payload.error).toBe('wrong app');
    expect(r.payload.appName).toBe('Bitcoin');
  });

  it('omits appName key when not provided', () => {
    const r = ledgerFailure(HardwareErrorCode.DeviceLocked, 'locked');
    expect('appName' in r.payload).toBe(false);
  });

  it('omits appName key when explicitly passed undefined', () => {
    const r = ledgerFailure(HardwareErrorCode.DeviceLocked, 'locked', undefined);
    expect('appName' in r.payload).toBe(false);
  });

  it('includes params in payload when provided', () => {
    const r = ledgerFailure(
      HardwareErrorCode.DevicePermissionDenied,
      'denied',
      undefined,
      undefined,
      {
        permissionDeniedReason: 'bluetoothTurnedOff',
      }
    );
    expect(r.payload.params).toEqual({ permissionDeniedReason: 'bluetoothTurnedOff' });
  });
});

describe('serializeConnectorError', () => {
  it('hoists message/code/errorCode to the top level and nests domain fields under params', () => {
    const err = Object.assign(new Error('boom'), {
      code: HardwareErrorCode.WrongApp,
      errorCode: '0x6511',
      _tag: ERROR_TAG.WrongAppOpened,
      statusCode: '6511',
      appName: 'Bitcoin',
    });
    const s = serializeConnectorError(err);
    expect(s.message).toBe('boom');
    expect(s.code).toBe(HardwareErrorCode.WrongApp);
    expect(s.errorCode).toBe('0x6511');
    expect(s.params).toMatchObject({
      _tag: ERROR_TAG.WrongAppOpened,
      statusCode: '6511',
      appName: 'Bitcoin',
    });
  });

  it('preserves _lastStep / _deviceActionSteps so blind-sign survives the round-trip', () => {
    // Raw EthApp error WITHOUT a pre-resolved `code` — exercises the path where
    // the SW-side classifier must re-derive EvmBlindSigningRequired from the
    // 0x6a80 APDU + blind-sign step context after the cross-boundary round-trip.
    const raw = Object.assign(new Error('Invalid data'), {
      _tag: ERROR_TAG.EthAppCommand,
      errorCode: '6a80',
      appName: 'Ethereum',
      _lastStep: 'signer.eth.steps.blindSignTransactionFallback',
      _deviceActionSteps: [
        'signer.eth.steps.blindSignTransactionFallback',
        'signer.eth.steps.detectBlindSigning',
      ],
    });

    const s = serializeConnectorError(raw);
    expect(s.params?._lastStep).toBe('signer.eth.steps.blindSignTransactionFallback');
    expect(s.params?._deviceActionSteps).toEqual([
      'signer.eth.steps.blindSignTransactionFallback',
      'signer.eth.steps.detectBlindSigning',
    ]);

    // Rehydrate the flat error the way LedgerAdapter._unwrapConnectorResult does
    // (lift params.* back to own-properties) and confirm classification holds.
    const rehydrated = Object.assign(new Error(s.message), {
      ...(s.code !== undefined ? { code: s.code } : {}),
      ...(s.errorCode !== undefined ? { errorCode: s.errorCode } : {}),
      ...(s.params ?? {}),
    });
    expect(mapLedgerError(rehydrated).code).toBe(HardwareErrorCode.EvmBlindSigningRequired);
  });

  it('does not deep-walk originalError beyond a shallow copy', () => {
    const deep = Object.assign(new Error('outer'), {
      originalError: Object.assign(new Error('inner'), {
        _tag: 'InnerTag',
        originalError: new Error('innermost'),
      }),
    });
    const s = serializeConnectorError(deep);
    const orig = s.params?.originalError as Record<string, unknown>;
    expect(orig.message).toBe('inner');
    expect(orig._tag).toBe('InnerTag');
    // Only one level deep — the innermost envelope is intentionally dropped
    // (nested serialization is fragile across the native bridge).
    expect('originalError' in orig).toBe(false);
  });

  it('falls back to a plain message for non-object inputs', () => {
    expect(serializeConnectorError('just a string')).toEqual({ message: 'just a string' });
    expect(serializeConnectorError(undefined)).toEqual({ message: 'Unknown error' });
  });
});
