import { hasWritableCapability, resolveProtocolV2PacketCapacity } from '../bleStrategy';

describe('React Native BLE strategy', () => {
  test('accepts writeWithoutResponse-only characteristics', () => {
    const characteristic = {
      isWritableWithResponse: false,
      isWritableWithoutResponse: true,
    };

    expect(hasWritableCapability(characteristic)).toBe(true);
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
});
