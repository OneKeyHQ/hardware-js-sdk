import { HardwareErrorCode } from './HardwareError';

describe('HardwareErrorCode compatibility', () => {
  test('preserves published Protocol V2 values while leaving code 829 unused', () => {
    expect(HardwareErrorCode).not.toHaveProperty('KaspaPrevTxIdMismatch');
    expect(HardwareErrorCode.DeviceLocked).toBe(830);
    expect(HardwareErrorCode.WalletSessionInvalid).toBe(831);
  });
});
