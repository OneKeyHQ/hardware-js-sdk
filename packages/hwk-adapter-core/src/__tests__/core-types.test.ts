import { describe, it, expect } from 'vitest';
import { HardwareErrorCode } from '../index';

/**
 * These tests guard the numeric values of HardwareErrorCode.
 * External consumers may persist or switch on these numbers,
 * so changing them is a breaking API contract change.
 */
describe('HardwareErrorCode contract', () => {
  it('should have stable base error code values', () => {
    expect(HardwareErrorCode.UnknownError).toBe(0);
    expect(HardwareErrorCode.DeviceNotFound).toBe(1);
    expect(HardwareErrorCode.DeviceDisconnected).toBe(2);
    expect(HardwareErrorCode.UserRejected).toBe(3);
    expect(HardwareErrorCode.DeviceBusy).toBe(4);
    expect(HardwareErrorCode.FirmwareUpdateRequired).toBe(5);
    expect(HardwareErrorCode.AppNotOpen).toBe(6);
    expect(HardwareErrorCode.InvalidParams).toBe(7);
    expect(HardwareErrorCode.TransportError).toBe(8);
    expect(HardwareErrorCode.OperationTimeout).toBe(9);
    expect(HardwareErrorCode.MethodNotSupported).toBe(10);
  });

  it('should have stable extended error code values', () => {
    // PIN / Passphrase
    expect(HardwareErrorCode.PinInvalid).toBe(5520);
    expect(HardwareErrorCode.PinCancelled).toBe(5521);
    expect(HardwareErrorCode.PassphraseRejected).toBe(5522);
    // Device state
    expect(HardwareErrorCode.DeviceLocked).toBe(5530);
    expect(HardwareErrorCode.DeviceNotInitialized).toBe(5531);
    expect(HardwareErrorCode.DeviceInBootloader).toBe(5532);
    expect(HardwareErrorCode.FirmwareTooOld).toBe(5533);
    // Ledger specific
    expect(HardwareErrorCode.WrongApp).toBe(5540);
    // Transport
    expect(HardwareErrorCode.BridgeNotFound).toBe(5550);
    expect(HardwareErrorCode.TransportNotAvailable).toBe(5551);
  });
});
