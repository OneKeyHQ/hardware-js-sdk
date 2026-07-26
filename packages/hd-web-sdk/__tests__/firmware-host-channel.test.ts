import { FirmwareHostBindingRegistry, MAX_FIRMWARE_ARTIFACT_READ_LENGTH } from '@onekeyfe/hd-core';

import { FirmwareHostChannel } from '../src/firmware/FirmwareHostChannel';
import { FirmwareIframeChannel } from '../src/firmware/FirmwareIframeChannel';

import type {
  FirmwareArtifactReader,
  FirmwareCheckpoint,
  FirmwareUpdateHostBinding,
} from '@onekeyfe/hd-core';
import type {
  FirmwareHostChannelState,
  FirmwareHostChannelTargetWindow,
} from '../src/firmware/FirmwareHostChannel';
import type { FirmwareIframeChannelMessageTarget } from '../src/firmware/FirmwareIframeChannel';

class TestMessageTarget implements FirmwareIframeChannelMessageTarget {
  private readonly listeners = new Set<(event: MessageEvent<unknown>) => void>();

  addEventListener(_type: 'message', listener: (event: MessageEvent<unknown>) => void): void {
    this.listeners.add(listener);
  }

  removeEventListener(_type: 'message', listener: (event: MessageEvent<unknown>) => void): void {
    this.listeners.delete(listener);
  }

  dispatch({
    data,
    source,
    origin,
    ports,
  }: {
    data: unknown;
    source: MessageEventSource;
    origin: string;
    ports: readonly MessagePort[];
  }): void {
    const event = { data, source, origin, ports } as MessageEvent<unknown>;
    this.listeners.forEach(listener => listener(event));
  }
}

const checkpoint: FirmwareCheckpoint = {
  schemaVersion: 1,
  transactionId: 'transaction-1',
  planDigest: 'a'.repeat(64),
  sequence: 1,
  state: 'PREPARED',
  timestampMs: 1,
};

const createBinding = (
  readerOverrides: Partial<FirmwareArtifactReader> = {}
): FirmwareUpdateHostBinding => ({
  artifactReader: {
    open: jest.fn(() => Promise.resolve({ readerId: 'reader-1', size: 4 })),
    read: jest.fn(() =>
      Promise.resolve({
        data: Uint8Array.from([1, 2, 3, 4]).buffer,
        bytesRead: 4,
        eof: true,
      })
    ),
    close: jest.fn(() => Promise.resolve()),
    cancel: jest.fn(() => Promise.resolve()),
    ...readerOverrides,
  },
  checkpointSink: {
    commit: jest.fn(() => Promise.resolve()),
  },
  progressSink: {
    report: jest.fn(() => Promise.resolve()),
  },
});

const createHarness = ({
  binding = createBinding(),
  eventOrigin = 'null',
  generation = 1,
  sessionId = 'firmware-session-1',
}: {
  binding?: FirmwareUpdateHostBinding;
  eventOrigin?: string;
  generation?: number;
  sessionId?: string;
} = {}) => {
  const messageTarget = new TestMessageTarget();
  const hostWindow = {} as MessageEventSource;
  const postedOrigins: string[] = [];
  const targetWindow: FirmwareHostChannelTargetWindow = {
    postMessage(data, targetOrigin, transfer = []) {
      postedOrigins.push(targetOrigin);
      messageTarget.dispatch({
        data,
        source: hostWindow,
        origin: eventOrigin,
        ports: transfer as MessagePort[],
      });
    },
  };
  const registry = new FirmwareHostBindingRegistry();
  const iframeChannel = new FirmwareIframeChannel({
    messageTarget,
    hostWindow,
    expectedOrigin: 'file://',
    registry,
  });
  iframeChannel.start();
  const hostChannel = new FirmwareHostChannel({
    binding,
    targetWindow,
    targetOrigin: '*',
    sessionId,
    generation,
    nonceFactory: () => `nonce-${generation}`,
  });
  return {
    binding,
    hostChannel,
    iframeChannel,
    messageTarget,
    hostWindow,
    postedOrigins,
    registry,
    targetWindow,
  };
};

describe('desktop firmware host channel', () => {
  it('accepts Electron file protocol event origins', async () => {
    const harness = createHarness({ eventOrigin: 'file://' });

    await expect(harness.hostChannel.connect()).resolves.toMatchObject({
      connected: true,
      generation: 1,
    });

    await harness.hostChannel.dispose();
    harness.iframeChannel.dispose();
  });

  it('uses a one-time file origin handshake and transfers bounded reader and checkpoint calls', async () => {
    const harness = createHarness();

    await expect(harness.hostChannel.connect()).resolves.toEqual<FirmwareHostChannelState>({
      connected: true,
      disposed: false,
      generation: 1,
      sessionId: 'firmware-session-1',
    });
    expect(harness.postedOrigins).toEqual(['*']);

    const proxy = harness.registry.capture().binding;
    await expect(proxy.artifactReader.open({ artifactRef: 'artifact-1' })).resolves.toEqual({
      readerId: 'reader-1',
      size: 4,
    });
    await expect(
      proxy.artifactReader.read({
        readerId: 'reader-1',
        operationId: 'read-1',
        offset: 0,
        length: 4,
      })
    ).resolves.toMatchObject({
      bytesRead: 4,
      eof: true,
    });
    await expect(proxy.checkpointSink.commit(checkpoint)).resolves.toBeUndefined();
    await expect(
      proxy.progressSink?.report({
        transactionId: 'transaction-1',
        phase: 'SYNCING_OR_TRANSFERRING',
        completed: 4,
        total: 4,
      })
    ).resolves.toBeUndefined();

    expect(harness.binding.artifactReader.read).toHaveBeenCalledWith({
      readerId: 'reader-1',
      operationId: 'read-1',
      offset: 0,
      length: 4,
    });
    expect(harness.binding.checkpointSink.commit).toHaveBeenCalledWith(checkpoint);
    await harness.hostChannel.dispose();
    harness.iframeChannel.dispose();
  });

  it('rejects oversized and concurrent reads before they cross the channel', async () => {
    let resolveRead:
      | ((value: { data: ArrayBuffer; bytesRead: number; eof: boolean }) => void)
      | null = null;
    const read = jest.fn(
      () =>
        new Promise<{
          data: ArrayBuffer;
          bytesRead: number;
          eof: boolean;
        }>(resolve => {
          resolveRead = resolve;
        })
    );
    const harness = createHarness({
      binding: createBinding({ read }),
    });
    await harness.hostChannel.connect();
    const proxy = harness.registry.capture().binding;
    await proxy.artifactReader.open({ artifactRef: 'artifact-1' });

    await expect(
      proxy.artifactReader.read({
        readerId: 'reader-1',
        operationId: 'oversized',
        offset: 0,
        length: Number(MAX_FIRMWARE_ARTIFACT_READ_LENGTH) + 1,
      })
    ).rejects.toMatchObject({
      errorCode: expect.any(Number),
    });
    expect(read).not.toHaveBeenCalled();

    const firstRead = proxy.artifactReader.read({
      readerId: 'reader-1',
      operationId: 'read-in-flight',
      offset: 0,
      length: 4,
    });
    while (!resolveRead) {
      await new Promise(resolve => {
        setTimeout(resolve, 0);
      });
    }
    await expect(
      proxy.artifactReader.read({
        readerId: 'reader-1',
        operationId: 'read-concurrent',
        offset: 0,
        length: 4,
      })
    ).rejects.toThrow('already has an active read');
    resolveRead?.({
      data: Uint8Array.from([1, 2, 3, 4]).buffer,
      bytesRead: 4,
      eof: true,
    });
    await expect(firstRead).resolves.toMatchObject({ bytesRead: 4 });

    await harness.hostChannel.dispose();
    harness.iframeChannel.dispose();
  });

  it('ignores a handshake that does not come from the exact host window', async () => {
    const harness = createHarness();
    const attackerChannel = new MessageChannel();
    harness.messageTarget.dispatch({
      data: {
        protocol: 'onekey-firmware-host-channel-v1',
        kind: 'handshake',
        nonce: 'attacker',
        sessionId: 'attacker-session',
        generation: 1,
      },
      source: {} as MessageEventSource,
      origin: 'null',
      ports: [attackerChannel.port2],
    });
    expect(() => harness.registry.capture()).toThrow('not registered');

    await expect(harness.hostChannel.connect()).resolves.toMatchObject({ connected: true });
    await harness.hostChannel.dispose();
    harness.iframeChannel.dispose();
    attackerChannel.port1.close();
  });
});
