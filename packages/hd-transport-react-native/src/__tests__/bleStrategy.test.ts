import {
  hasWritableCapability,
  resolveProtocolV2PacketCapacity,
  shouldWriteProtocolV2WithResponse,
} from '../bleStrategy';

describe('React Native BLE strategy', () => {
  test('accepts writeWithoutResponse-only characteristics', () => {
    const characteristic = {
      isWritableWithResponse: false,
      isWritableWithoutResponse: true,
    };

    expect(hasWritableCapability(characteristic)).toBe(true);
  });

  test('rejects Protocol V2 packet sizing when MTU is unavailable', () => {
    expect(() =>
      resolveProtocolV2PacketCapacity({
        platform: 'android',
        mtu: null,
      })
    ).toThrow('Protocol V2 BLE requires a negotiated MTU');
  });

  test('caps Android packet length by negotiated MTU payload', () => {
    expect(
      resolveProtocolV2PacketCapacity({
        platform: 'android',
        androidPacketLength: 244,
        mtu: 100,
      })
    ).toBe(97);
  });

  test('uses the Android 517 MTU payload when fully negotiated', () => {
    expect(
      resolveProtocolV2PacketCapacity({
        platform: 'android',
        mtu: 517,
      })
    ).toBe(514);
  });

  test('caps iOS packet length by the system-negotiated write payload', () => {
    expect(
      resolveProtocolV2PacketCapacity({
        platform: 'ios',
        iosPacketLength: 244,
        mtu: 256,
      })
    ).toBe(244);
  });

  test('uses the reported iOS MTU without a compatibility fallback', () => {
    expect(
      resolveProtocolV2PacketCapacity({
        platform: 'ios',
        iosPacketLength: 128,
        mtu: 23,
      })
    ).toBe(20);
  });

  test('uses a smaller system-negotiated iOS write payload', () => {
    expect(
      resolveProtocolV2PacketCapacity({
        platform: 'ios',
        iosPacketLength: 244,
        mtu: 185,
      })
    ).toBe(182);
  });

  test('uses withoutResponse for a high-volume write unless explicitly overridden', () => {
    const characteristic = {
      isWritableWithResponse: true,
      isWritableWithoutResponse: true,
    };

    expect(
      shouldWriteProtocolV2WithResponse({
        platform: 'ios',
        highVolume: true,
        requestedWithResponse: false,
        characteristic,
      })
    ).toBe(false);
    expect(
      shouldWriteProtocolV2WithResponse({
        platform: 'ios',
        highVolume: true,
        requestedWithResponse: true,
        characteristic,
      })
    ).toBe(true);
  });

  test('falls back to withResponse when withoutResponse is unavailable', () => {
    expect(
      shouldWriteProtocolV2WithResponse({
        platform: 'ios',
        highVolume: true,
        requestedWithResponse: false,
        characteristic: {
          isWritableWithResponse: true,
          isWritableWithoutResponse: false,
        },
      })
    ).toBe(true);
  });
});
