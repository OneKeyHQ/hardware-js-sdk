export type ProtocolV2BleFrameWriterOptions = {
  frame: Uint8Array;
  packetCapacity: number;
  writePacket: (packet: Uint8Array, packetIndex: number) => Promise<void>;
  assertActive?: () => void;
  signal?: AbortSignal;
  abortMessage?: string;
  initialDelayMs?: number;
  burstSize?: number;
  burstPauseMs?: number;
  flushDelayMs?: number;
  wait?: (timeoutMs: number) => Promise<void>;
};

const defaultWait = (timeoutMs: number) =>
  new Promise<void>(resolve => {
    setTimeout(resolve, timeoutMs);
  });

export async function writeProtocolV2BleFrame({
  frame,
  packetCapacity,
  writePacket,
  assertActive,
  signal,
  abortMessage = 'Protocol V2 BLE write aborted',
  initialDelayMs = 0,
  burstSize,
  burstPauseMs = 0,
  flushDelayMs = 0,
  wait = defaultWait,
}: ProtocolV2BleFrameWriterOptions): Promise<void> {
  if (!Number.isInteger(packetCapacity) || packetCapacity <= 0) {
    throw new Error('Protocol V2 BLE packet capacity must be a positive integer');
  }
  if (burstSize !== undefined && (!Number.isInteger(burstSize) || burstSize <= 0)) {
    throw new Error('Protocol V2 BLE burst size must be a positive integer');
  }

  const assertWritable = () => {
    assertActive?.();
    if (signal?.aborted) {
      throw new Error(abortMessage);
    }
  };

  if (frame.length > 0 && initialDelayMs > 0) {
    assertWritable();
    await wait(initialDelayMs);
    assertWritable();
  }

  let packetsWritten = 0;
  for (let offset = 0; offset < frame.length; offset += packetCapacity) {
    assertWritable();
    const packet = frame.slice(offset, offset + packetCapacity);
    await writePacket(packet, packetsWritten);
    packetsWritten += 1;
    assertWritable();

    const hasMorePackets = offset + packetCapacity < frame.length;
    if (
      hasMorePackets &&
      burstSize !== undefined &&
      packetsWritten % burstSize === 0 &&
      burstPauseMs > 0
    ) {
      await wait(burstPauseMs);
      assertWritable();
    }
  }

  if (burstSize !== undefined && packetsWritten > burstSize && flushDelayMs > 0) {
    await wait(flushDelayMs);
    assertWritable();
  }
}
