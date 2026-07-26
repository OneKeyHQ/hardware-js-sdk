import { FirmwareHostBindingRegistry } from '@onekeyfe/hd-core';

import { FirmwareHostChannel } from '../src/firmware/FirmwareHostChannel';
import { FirmwareIframeChannel } from '../src/firmware/FirmwareIframeChannel';
import { FIRMWARE_HOST_CHANNEL_PROTOCOL } from '../src/firmware/FirmwareHostChannelProtocol';

import type { FirmwareUpdateHostBinding } from '@onekeyfe/hd-core';
import type { FirmwareHostChannelTargetWindow } from '../src/firmware/FirmwareHostChannel';
import type { FirmwareIframeChannelMessageTarget } from '../src/firmware/FirmwareIframeChannel';

class TestMessageTarget implements FirmwareIframeChannelMessageTarget {
  private readonly listeners = new Set<(event: MessageEvent<unknown>) => void>();

  addEventListener(_type: 'message', listener: (event: MessageEvent<unknown>) => void): void {
    this.listeners.add(listener);
  }

  removeEventListener(_type: 'message', listener: (event: MessageEvent<unknown>) => void): void {
    this.listeners.delete(listener);
  }

  dispatch(data: unknown, source: MessageEventSource, ports: readonly MessagePort[]): void {
    const event = { data, source, origin: 'null', ports } as MessageEvent<unknown>;
    this.listeners.forEach(listener => listener(event));
  }
}

const createBinding = (readerId: string) => {
  const close = jest.fn(() => Promise.resolve());
  const binding: FirmwareUpdateHostBinding = {
    artifactReader: {
      open: jest.fn(() => Promise.resolve({ readerId, size: 1 })),
      read: jest.fn(() =>
        Promise.resolve({
          data: Uint8Array.from([1]).buffer,
          bytesRead: 1,
          eof: true,
        })
      ),
      close,
      cancel: jest.fn(() => Promise.resolve()),
    },
    checkpointSink: {
      commit: jest.fn(() => Promise.resolve()),
    },
  };
  return { binding, close };
};

const nextTurn = () =>
  new Promise(resolve => {
    setTimeout(resolve, 0);
  });

describe('desktop firmware host channel generation', () => {
  it('invalidates the old port and readers when a newer bridge generation connects', async () => {
    const messageTarget = new TestMessageTarget();
    const hostWindow = {} as MessageEventSource;
    const targetWindow: FirmwareHostChannelTargetWindow = {
      postMessage(data, _targetOrigin, transfer = []) {
        messageTarget.dispatch(data, hostWindow, transfer as MessagePort[]);
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

    const firstBinding = createBinding('reader-generation-1');
    const firstHost = new FirmwareHostChannel({
      binding: firstBinding.binding,
      targetWindow,
      targetOrigin: '*',
      sessionId: 'session-generation-1',
      generation: 1,
      nonceFactory: () => 'nonce-generation-1',
    });
    await firstHost.connect();
    const staleProxy = registry.capture().binding;
    await staleProxy.artifactReader.open({ artifactRef: 'artifact-1' });

    const secondBinding = createBinding('reader-generation-2');
    const secondHost = new FirmwareHostChannel({
      binding: secondBinding.binding,
      targetWindow,
      targetOrigin: '*',
      sessionId: 'session-generation-2',
      generation: 2,
      nonceFactory: () => 'nonce-generation-2',
    });
    await secondHost.connect();
    await nextTurn();

    expect(firstHost.getState()).toMatchObject({ disposed: true, connected: false });
    expect(firstBinding.close).toHaveBeenCalledWith({ readerId: 'reader-generation-1' });
    await expect(
      staleProxy.artifactReader.read({
        readerId: 'reader-generation-1',
        operationId: 'stale-read',
        offset: 0,
        length: 1,
      })
    ).rejects.toThrow('stale');

    const currentProxy = registry.capture().binding;
    await expect(currentProxy.artifactReader.open({ artifactRef: 'artifact-2' })).resolves.toEqual({
      readerId: 'reader-generation-2',
      size: 1,
    });

    const hostPort = (secondHost as unknown as { port: MessagePort }).port;
    hostPort.postMessage({
      protocol: FIRMWARE_HOST_CHANNEL_PROTOCOL,
      kind: 'response',
      requestId: 'session-generation-2:2:1',
      sessionId: 'session-generation-2',
      generation: 2,
      ok: true,
      payload: {
        readerId: 'reader-generation-2',
        size: 1,
      },
    });
    await nextTurn();
    expect(iframeChannel.getState()).toMatchObject({ connected: false, generation: 2 });
    expect(() => registry.capture()).toThrow('not registered');

    const staleHost = new FirmwareHostChannel({
      binding: createBinding('reader-stale').binding,
      targetWindow,
      targetOrigin: '*',
      sessionId: 'session-stale',
      generation: 1,
      handshakeTimeoutMs: 100,
      nonceFactory: () => 'nonce-stale',
    });
    await expect(staleHost.connect()).rejects.toThrow('rejected');

    await secondHost.dispose();
    iframeChannel.dispose();
  });
});
