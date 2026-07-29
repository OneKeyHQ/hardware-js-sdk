/* eslint-disable @typescript-eslint/no-var-requires */
const { writeProtocolV2BleFrame } = require('../src');

describe('Protocol V2 BLE frame writer', () => {
  test('splits one complete Protocol V2 frame without changing packet order', async () => {
    const packets = [];

    await writeProtocolV2BleFrame({
      frame: new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
      packetCapacity: 4,
      writePacket: packet => {
        packets.push(Array.from(packet));
        return Promise.resolve();
      },
    });

    expect(packets).toEqual([
      [0, 1, 2, 3],
      [4, 5, 6, 7],
      [8, 9],
    ]);
  });

  test('stops before the next packet when the connection generation changes', async () => {
    const packets = [];
    let active = true;

    await expect(
      writeProtocolV2BleFrame({
        frame: new Uint8Array(9),
        packetCapacity: 4,
        assertActive: () => {
          if (!active) throw new Error('stale BLE generation');
        },
        writePacket: packet => {
          packets.push(packet);
          active = false;
          return Promise.resolve();
        },
      })
    ).rejects.toThrow('stale BLE generation');

    expect(packets).toHaveLength(1);
  });

  test('does not write when the call is already aborted', async () => {
    const controller = new AbortController();
    const writePacket = jest.fn();
    controller.abort();

    await expect(
      writeProtocolV2BleFrame({
        frame: new Uint8Array(4),
        packetCapacity: 4,
        signal: controller.signal,
        abortMessage: 'Protocol V2 BLE write aborted for Ping',
        writePacket,
      })
    ).rejects.toThrow('Protocol V2 BLE write aborted for Ping');

    expect(writePacket).not.toHaveBeenCalled();
  });

  test('surfaces an abort that occurs while the final packet write is completing', async () => {
    const controller = new AbortController();
    const writePacket = jest.fn().mockImplementation(() => {
      controller.abort();
      return Promise.resolve();
    });

    await expect(
      writeProtocolV2BleFrame({
        frame: new Uint8Array(4),
        packetCapacity: 4,
        signal: controller.signal,
        abortMessage: 'Protocol V2 BLE write aborted for Ping',
        writePacket,
      })
    ).rejects.toThrow('Protocol V2 BLE write aborted for Ping');

    expect(writePacket).toHaveBeenCalledTimes(1);
  });

  test('applies bounded burst pauses and one final flush delay', async () => {
    const waits = [];
    const writePacket = jest.fn().mockResolvedValue(undefined);

    await writeProtocolV2BleFrame({
      frame: new Uint8Array(10),
      packetCapacity: 3,
      initialDelayMs: 3,
      burstSize: 2,
      burstPauseMs: 7,
      flushDelayMs: 11,
      wait: ms => {
        waits.push(ms);
        return Promise.resolve();
      },
      writePacket,
    });

    expect(writePacket).toHaveBeenCalledTimes(4);
    expect(waits).toEqual([3, 7, 11]);
  });

  test('rejects an invalid packet capacity before writing', async () => {
    const writePacket = jest.fn();

    await expect(
      writeProtocolV2BleFrame({
        frame: new Uint8Array(4),
        packetCapacity: 0,
        writePacket,
      })
    ).rejects.toThrow('Protocol V2 BLE packet capacity must be a positive integer');

    expect(writePacket).not.toHaveBeenCalled();
  });
});
