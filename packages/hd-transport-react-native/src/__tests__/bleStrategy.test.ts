import {
  hasWritableCapability,
  isGattCongestedError,
  resolveFirmwareUploadRetryDelay,
  resolveBleWriteMode,
  resolveProtocolV1HighVolumePacketCapacity,
  resolveProtocolV2PacketCapacity,
  shouldRetryFirmwareUploadWrite,
} from '../bleStrategy';

describe('React Native BLE strategy', () => {
  test('accepts writeWithoutResponse-only characteristics', () => {
    const characteristic = {
      isWritableWithResponse: false,
      isWritableWithoutResponse: true,
    };

    expect(hasWritableCapability(characteristic)).toBe(true);
    expect(resolveBleWriteMode(characteristic)).toBe('withoutResponse');
  });

  test('falls back to Android default ATT payload when MTU is unavailable', () => {
    expect(
      resolveProtocolV2PacketCapacity({
        platform: 'android',
        androidPacketLength: 192,
        mtu: null,
      })
    ).toBe(20);
  });

  test('caps Android packet length by negotiated MTU payload', () => {
    expect(
      resolveProtocolV2PacketCapacity({
        platform: 'android',
        androidPacketLength: 192,
        mtu: 100,
      })
    ).toBe(97);
  });

  test('keeps iOS packet length controlled by tuning profile', () => {
    expect(
      resolveProtocolV2PacketCapacity({
        platform: 'ios',
        iosPacketLength: 244,
        mtu: 256,
      })
    ).toBe(244);
  });

  test('keeps Protocol V1 firmware upload packets aligned to 64-byte frames', () => {
    expect(
      resolveProtocolV1HighVolumePacketCapacity({
        platform: 'android',
        androidPacketLength: 192,
        mtu: 256,
      })
    ).toBe(192);

    expect(
      resolveProtocolV1HighVolumePacketCapacity({
        platform: 'android',
        androidPacketLength: 192,
        mtu: 100,
      })
    ).toBe(64);
  });

  test('does not shrink Protocol V1 firmware upload packets without negotiated Android MTU', () => {
    expect(
      resolveProtocolV1HighVolumePacketCapacity({
        platform: 'android',
        androidPacketLength: 192,
        mtu: null,
      })
    ).toBe(192);
  });

  test('detects Android GATT congestion errors for firmware upload retry', () => {
    expect(isGattCongestedError({ androidErrorCode: 143 })).toBe(true);
    expect(isGattCongestedError({ reason: 'status 143 (GATT_CONGESTED)' })).toBe(true);
    expect(isGattCongestedError({ androidErrorCode: 133 })).toBe(false);
  });

  test('retries firmware upload writes only within congestion retry budget', () => {
    const error = { reason: 'status 143 (GATT_CONGESTED)' };

    expect(shouldRetryFirmwareUploadWrite(error, 0, 3)).toBe(true);
    expect(shouldRetryFirmwareUploadWrite(error, 3, 3)).toBe(false);
    expect(shouldRetryFirmwareUploadWrite({ androidErrorCode: 133 }, 0, 3)).toBe(false);
  });

  test('uses capped exponential backoff for firmware upload retries', () => {
    expect(resolveFirmwareUploadRetryDelay(0)).toBe(200);
    expect(resolveFirmwareUploadRetryDelay(1)).toBe(400);
    expect(resolveFirmwareUploadRetryDelay(10)).toBe(1200);
  });
});
