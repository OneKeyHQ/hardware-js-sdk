import { HardwareErrorCode } from './HardwareError';

describe('HardwareErrorCode compatibility', () => {
  test('preserves published values when adding Protocol V2 errors', () => {
    expect(HardwareErrorCode.KaspaPrevTxIdMismatch).toBe(829);
    expect(HardwareErrorCode.DeviceLocked).toBe(830);
    expect(HardwareErrorCode.WalletSessionInvalid).toBe(831);
  });
});
