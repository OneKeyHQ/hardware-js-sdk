import { HardwareErrorCode } from '../index';

/**
 * Guards the numeric values of HardwareErrorCode. External consumers may
 * persist or switch on these numbers, so changing them is a breaking API
 * contract change. Also enforces the namespace invariant: every HWK code
 * is >= 10000, disjoint from legacy `@onekeyfe/shared` which tops out at 902.
 */
describe('HardwareErrorCode contract', () => {
  it('every code is 5-digit (>= 10000)', () => {
    for (const [name, value] of Object.entries(HardwareErrorCode)) {
      if (typeof value === 'number') {
        expect({ name, value }).toMatchObject({ name, value: expect.any(Number) });
        expect(value).toBeGreaterThanOrEqual(10000);
        expect(value).toBeLessThanOrEqual(99999);
      }
    }
  });

  it('generic primitives (10000-10099)', () => {
    expect(HardwareErrorCode.UnknownError).toBe(10000);
    expect(HardwareErrorCode.UserRejected).toBe(10001);
    expect(HardwareErrorCode.InvalidParams).toBe(10002);
    expect(HardwareErrorCode.OperationTimeout).toBe(10003);
    expect(HardwareErrorCode.MethodNotSupported).toBe(10004);
  });

  it('device state (10100-10199)', () => {
    expect(HardwareErrorCode.DeviceNotFound).toBe(10100);
    expect(HardwareErrorCode.DeviceDisconnected).toBe(10101);
    expect(HardwareErrorCode.DeviceBusy).toBe(10102);
    expect(HardwareErrorCode.DeviceLocked).toBe(10103);
    expect(HardwareErrorCode.DeviceNotInitialized).toBe(10104);
    expect(HardwareErrorCode.DeviceInBootloader).toBe(10105);
    expect(HardwareErrorCode.DeviceMismatch).toBe(10106);
    expect(HardwareErrorCode.DeviceOneDeviceOnly).toBe(10109);
  });

  it('firmware (10200-10299)', () => {
    expect(HardwareErrorCode.FirmwareTooOld).toBe(10200);
    expect(HardwareErrorCode.FirmwareUpdateRequired).toBe(10201);
  });

  it('transport + permission (10300-10399)', () => {
    expect(HardwareErrorCode.TransportError).toBe(10300);
    expect(HardwareErrorCode.BridgeNotFound).toBe(10301);
    expect(HardwareErrorCode.TransportNotAvailable).toBe(10302);
    expect(HardwareErrorCode.DevicePermissionDenied).toBe(10303);
  });

  it('PIN / passphrase (10400-10499)', () => {
    expect(HardwareErrorCode.PinInvalid).toBe(10400);
    expect(HardwareErrorCode.PinCancelled).toBe(10401);
    expect(HardwareErrorCode.PassphraseRejected).toBe(10402);
  });

  it('app lifecycle (10500-10599)', () => {
    expect(HardwareErrorCode.AppNotInstalled).toBe(10500);
    expect((HardwareErrorCode as Record<string, unknown>).AppNotOpen).toBeUndefined();
    expect(HardwareErrorCode.WrongApp).toBe(10501);
    expect(HardwareErrorCode.AppTooOld).toBe(10502);
  });

  it('chain APDU blocks (11000-11399, 100 per chain)', () => {
    // EVM 11000-11099
    expect(HardwareErrorCode.EvmBlindSigningRequired).toBe(11000);
    expect(HardwareErrorCode.EvmClearSignPluginMissing).toBe(11001);
    expect(HardwareErrorCode.EvmDataTooLarge).toBe(11002);
    expect(HardwareErrorCode.EvmTxTypeNotSupported).toBe(11003);
    // Solana 11100-11199
    expect(HardwareErrorCode.SolanaBlindSigningRequired).toBe(11100);
    // Tron 11200-11299
    expect(HardwareErrorCode.TronCustomContractRequired).toBe(11200);
    expect(HardwareErrorCode.TronDataSigningRequired).toBe(11201);
    expect(HardwareErrorCode.TronSignByHashRequired).toBe(11202);
    // BTC 11300-11399
    expect(HardwareErrorCode.BtcWalletPolicyHmacMismatch).toBe(11300);
    expect(HardwareErrorCode.BtcUnexpectedState).toBe(11301);
  });
});
