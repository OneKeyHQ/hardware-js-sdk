import {
  hasWritableCapability,
  resolveProtocolV2PacketCapacity,
  shouldRefreshNegotiatedMtu,
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

  test('uses the conservative ATT payload when MTU is unavailable', () => {
    expect(
      resolveProtocolV2PacketCapacity({
        platform: 'android',
        mtu: null,
      })
    ).toBe(20);
  });

  test('only refreshes an unavailable or default MTU snapshot', () => {
    expect(shouldRefreshNegotiatedMtu(undefined)).toBe(true);
    expect(shouldRefreshNegotiatedMtu(23)).toBe(true);
    expect(shouldRefreshNegotiatedMtu(185)).toBe(false);
    expect(shouldRefreshNegotiatedMtu(247)).toBe(false);
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

  test('keeps the default Android packet length within the validated ceiling', () => {
    expect(
      resolveProtocolV2PacketCapacity({
        platform: 'android',
        mtu: 517,
      })
    ).toBe(244);
  });

  test('allows an explicit Android packet length override for validated experiments', () => {
    expect(
      resolveProtocolV2PacketCapacity({
        platform: 'android',
        androidPacketLength: 514,
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

  test('uses withoutResponse by default unless explicitly overridden', () => {
    const characteristic = {
      isWritableWithResponse: true,
      isWritableWithoutResponse: true,
    };

    expect(
      shouldWriteProtocolV2WithResponse({
        platform: 'ios',
        highThroughput: false,
        characteristic,
      })
    ).toBe(false);
    expect(
      shouldWriteProtocolV2WithResponse({
        platform: 'ios',
        highThroughput: true,
        requestedWithResponse: true,
        characteristic,
      })
    ).toBe(true);
  });

  test('falls back to withResponse when withoutResponse is unavailable', () => {
    expect(
      shouldWriteProtocolV2WithResponse({
        platform: 'ios',
        highThroughput: true,
        requestedWithResponse: false,
        characteristic: {
          isWritableWithResponse: true,
          isWritableWithoutResponse: false,
        },
      })
    ).toBe(true);
  });
});
