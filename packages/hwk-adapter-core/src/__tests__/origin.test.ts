import {
  HardwareErrorCode,
  createHwkError,
  defaultOriginForCode,
  defaultRecoveryForCode,
  isHwkRecoveryHint,
} from '../types/errors';

describe('defaultOriginForCode', () => {
  it('labels device verdicts as device, wherever their code range sits', () => {
    // UserRejected lives in the generic 10000s range — the range alone would
    // misfile it. The table exists precisely because ranges cannot be trusted.
    expect(defaultOriginForCode(HardwareErrorCode.UserRejected)).toBe('device');
    expect(defaultOriginForCode(HardwareErrorCode.DeviceLocked)).toBe('device');
    expect(defaultOriginForCode(HardwareErrorCode.DeviceMismatch)).toBe('device');
    expect(defaultOriginForCode(HardwareErrorCode.WrongApp)).toBe('device');
    // Every chain-APDU code is the on-device app answering.
    expect(defaultOriginForCode(HardwareErrorCode.EvmBlindSigningRequired)).toBe('device');
  });

  it('labels pipe failures as transport', () => {
    expect(defaultOriginForCode(HardwareErrorCode.DeviceNotFound)).toBe('transport');
    expect(defaultOriginForCode(HardwareErrorCode.DeviceDisconnected)).toBe('transport');
    expect(defaultOriginForCode(HardwareErrorCode.BleConnectFailed)).toBe('transport');
  });

  it('labels host-environment refusals as host — including the one parked in the transport range', () => {
    expect(defaultOriginForCode(HardwareErrorCode.DevicePermissionDenied)).toBe('host');
    expect(defaultOriginForCode(HardwareErrorCode.UserAborted)).toBe('host');
    expect(defaultOriginForCode(HardwareErrorCode.InvalidParams)).toBe('host');
  });

  it('refuses to guess for genuinely ambiguous codes', () => {
    // A timeout can be a human not pressing confirm OR a dead pipe; Unknown is
    // unknown. Returning undefined forces consumers onto their explicit
    // fallbacks instead of a confident mislabel.
    expect(defaultOriginForCode(HardwareErrorCode.OperationTimeout)).toBeUndefined();
    expect(defaultOriginForCode(HardwareErrorCode.UnknownError)).toBeUndefined();
    expect(defaultOriginForCode(HardwareErrorCode.DeviceBusy)).toBeUndefined();
  });
});

describe('hardware recovery metadata', () => {
  it.each([
    [HardwareErrorCode.DeviceLocked, 'operation'],
    [HardwareErrorCode.WrongApp, 'operation'],
    [HardwareErrorCode.DeviceDisconnected, 'interaction'],
    [HardwareErrorCode.InteractionEnded, 'interaction'],
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
    expect(isHwkRecoveryHint({ scope: 'interaction' })).toBe(true);
    expect(isHwkRecoveryHint({ scope: 'future-scope' })).toBe(false);
    expect(isHwkRecoveryHint(null)).toBe(false);
  });

  it('lets runtime-specific adapter knowledge override the default', () => {
    const error = createHwkError({
      code: HardwareErrorCode.TransportError,
      message: 'session survived a transient connector error',
      recovery: { scope: 'operation' },
    });

    expect(error.recovery).toEqual({ scope: 'operation' });
  });
});
