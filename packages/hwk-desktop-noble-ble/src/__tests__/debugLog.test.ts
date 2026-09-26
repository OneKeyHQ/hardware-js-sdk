import { redactBleDebugLogData } from '../debugLog';

describe('redactBleDebugLogData', () => {
  it('returns undefined when there is nothing to log', () => {
    expect(redactBleDebugLogData(undefined)).toBeUndefined();
  });

  it('redacts a secret nested inside an object while keeping its siblings', () => {
    const result = redactBleDebugLogData({
      event: 'connect.error',
      deviceId: 'aa11bb22',
      details: {
        passphrase: 'open sesame',
        stack: 'Error: boom\n    at connect',
        deviceId: 'aa11bb22',
        mtu: 244,
      },
    });

    expect(result).toEqual({
      event: 'connect.error',
      deviceId: 'aa11bb22',
      details: {
        passphrase: '<redacted 11 chars>',
        stack: 'Error: boom\n    at connect',
        deviceId: 'aa11bb22',
        mtu: 244,
      },
    });
  });

  it('redacts secrets inside arrays of objects', () => {
    const result = redactBleDebugLogData({
      peripherals: [
        { id: 'one', rssi: -52, pin: '1234' },
        { id: 'two', rssi: -70 },
      ],
    });

    expect(result).toEqual({
      peripherals: [
        { id: 'one', rssi: -52, pin: '<redacted 4 chars>' },
        { id: 'two', rssi: -70 },
      ],
    });
  });

  it('keeps the fields a transport bug is diagnosed from', () => {
    const data = {
      stack: 'Error: write failed',
      device: { id: 'aa11', name: 'Trezor Safe 7', rssi: -61, mtu: 244 },
      descriptors: ['svc-1', 'chr-2'],
      uuid: '0000fd10-0000-1000-8000-00805f9b34fb',
      state: 'poweredOn',
      publicKey: '02a1b2c3',
      rootFingerprint: 'f3b1c0de',
      packetHex: 'deadbeef',
      hexData: 'cafebabe',
      payload: { chunkIndex: 1, chunkCount: 4 },
      encryptedPayload: 'abcdef',
      bytesWritten: 64,
    };

    expect(redactBleDebugLogData(data)).toEqual(data);
  });

  it('reports the size of what it dropped', () => {
    const result = redactBleDebugLogData({
      privateKey: new Uint8Array(32),
      credentials: ['a', 'b', 'c'],
      sessionKey: { opaque: true },
    });

    expect(result).toEqual({
      privateKey: '<redacted 32 bytes>',
      credentials: '<redacted 3 items>',
      sessionKey: '<redacted>',
    });
  });

  it('forwards Error values whole instead of flattening them to {}', () => {
    const error = new Error('noble unreachable');
    const result = redactBleDebugLogData({ error });

    expect(result?.error).toBe(error);
  });

  it('survives a cyclic data bag', () => {
    const node: Record<string, unknown> = { id: 'aa11' };
    node.self = node;

    expect(redactBleDebugLogData({ node })).toEqual({
      node: { id: 'aa11', self: '<circular>' },
    });
  });

  it('stops descending past the depth limit', () => {
    let deepest: Record<string, unknown> = { pin: '0000' };
    for (let i = 0; i < 12; i += 1) {
      deepest = { child: deepest };
    }

    const serialized = JSON.stringify(redactBleDebugLogData(deepest));
    expect(serialized).toContain('<redacted depth limit>');
    expect(serialized).not.toContain('0000');
  });
});
