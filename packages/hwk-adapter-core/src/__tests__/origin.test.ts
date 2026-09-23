import {
  HardwareErrorCode,
  createHwkError,
  defaultOriginForCode,
  defaultRecoveryForCode,
  isHwkRecoveryHint,
} from '../types/errors';

describe('defaultOriginForCode', () => {
  // UserRejected and DevicePermissionDenied sit in ranges that would misfile them.
  it.each([
    [HardwareErrorCode.UserRejected, 'device'],
    [HardwareErrorCode.DeviceLocked, 'device'],
    [HardwareErrorCode.DeviceMismatch, 'device'],
    [HardwareErrorCode.WrongApp, 'device'],
    [HardwareErrorCode.EvmBlindSigningRequired, 'device'],
    [HardwareErrorCode.DeviceNotFound, 'transport'],
    [HardwareErrorCode.DeviceDisconnected, 'transport'],
    [HardwareErrorCode.BleConnectFailed, 'transport'],
    [HardwareErrorCode.DevicePermissionDenied, 'host'],
    [HardwareErrorCode.UserAborted, 'host'],
    [HardwareErrorCode.InvalidParams, 'host'],
    [HardwareErrorCode.OperationTimeout, undefined],
    [HardwareErrorCode.UnknownError, undefined],
    [HardwareErrorCode.DeviceBusy, undefined],
  ] as const)('labels error %s as %s', (code, origin) => {
    expect(defaultOriginForCode(code)).toBe(origin);
  });
});

describe('hardware recovery metadata', () => {
  it.each([
    [HardwareErrorCode.DeviceLocked, 'call'],
    [HardwareErrorCode.WrongApp, 'call'],
    [HardwareErrorCode.DeviceDisconnected, 'operation'],
    [HardwareErrorCode.OperationEnded, 'operation'],
    [HardwareErrorCode.DeviceMismatch, 'search-target'],
    [HardwareErrorCode.BleBondInvalid, 'search-target'],
    [HardwareErrorCode.TransportNotAvailable, 'transport'],
    [HardwareErrorCode.PayloadTooLarge, 'transport'],
    [HardwareErrorCode.InvalidParams, 'not-recoverable'],
    [HardwareErrorCode.OperationTimeout, 'unknown'],
  ] as const)('maps error %s to %s recovery scope', (code, scope) => {
    expect(defaultRecoveryForCode(code)).toEqual({ scope });
  });

  it('accepts only known serialized recovery scopes', () => {
    expect(isHwkRecoveryHint({ scope: 'operation' })).toBe(true);
    expect(isHwkRecoveryHint({ scope: 'future-scope' })).toBe(false);
    expect(isHwkRecoveryHint(null)).toBe(false);
  });

  it('lets runtime-specific adapter knowledge override the default', () => {
    // Must differ from TransportError's default scope, or a fallthrough would also pass.
    expect(defaultRecoveryForCode(HardwareErrorCode.TransportError)).toEqual({
      scope: 'operation',
    });
    const error = createHwkError({
      code: HardwareErrorCode.TransportError,
      message: 'retry only this call',
      recovery: { scope: 'call' },
    });

    expect(error.recovery).toEqual({ scope: 'call' });
  });
});
