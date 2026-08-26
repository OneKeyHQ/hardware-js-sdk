import { resolveBlePacketCapacity, resolveNobleAttMtu } from '../ble-packet-capacity';

describe('resolveBlePacketCapacity', () => {
  test('normalizes Noble platform reports to ATT MTU', () => {
    expect(resolveNobleAttMtu(244, 'darwin')).toBe(247);
    expect(resolveNobleAttMtu(244, 'win32')).toBe(247);
    expect(resolveNobleAttMtu(247, 'linux')).toBe(247);
    expect(resolveNobleAttMtu(null, 'darwin')).toBeUndefined();
  });

  test('uses ATT MTU payload capacity with an upper bound', () => {
    expect(resolveBlePacketCapacity(247, 244, 192)).toBe(244);
    expect(resolveBlePacketCapacity(185, 244, 192)).toBe(182);
  });

  test('preserves the compatibility fallback when MTU is unavailable', () => {
    expect(resolveBlePacketCapacity(null, 244, 192)).toBe(192);
    expect(resolveBlePacketCapacity(undefined, 244, 192)).toBe(192);
  });
});
