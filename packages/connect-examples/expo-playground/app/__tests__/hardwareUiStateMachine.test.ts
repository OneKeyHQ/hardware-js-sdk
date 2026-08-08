/// <reference types="jest" />

import { UI_REQUEST } from '@onekeyfe/hd-core';

import {
  createHardwareUiState,
  getUiResponseCorrelation,
  HardwareUiEventQueue,
  isProtocolV2UiEvent,
  reduceHardwareUiEvent,
} from '../utils/hardwareUiStateMachine';

const metadata = (overrides: Record<string, unknown> = {}) => ({
  interactionId: 'interaction-1',
  phaseId: 'phase-1',
  sequence: 1,
  phase: 'pin',
  transition: 'start',
  protocol: 'V2',
  ...overrides,
});

const event = (type: string, payload: Record<string, unknown> = {}) => ({ type, payload } as never);

describe('hardware UI state machine', () => {
  test('moves PIN to processing and ignores a late PIN completion after Passphrase starts', () => {
    let state = createHardwareUiState();

    state = reduceHardwareUiEvent(
      state,
      event(UI_REQUEST.REQUEST_PIN, {
        device: { connectId: 'connect-1' },
        interaction: metadata(),
      })
    );
    state = reduceHardwareUiEvent(
      state,
      event(UI_REQUEST.CLOSE_UI_PIN_WINDOW, {
        ...metadata({ transition: 'complete', sequence: 2 }),
      })
    );
    expect(state.phase).toBe('processing');

    state = reduceHardwareUiEvent(
      state,
      event(UI_REQUEST.REQUEST_PASSPHRASE, {
        device: { connectId: 'connect-1' },
        interaction: metadata({ phaseId: 'phase-2', phase: 'passphrase', sequence: 3 }),
      })
    );
    state = reduceHardwareUiEvent(
      state,
      event(UI_REQUEST.CLOSE_UI_PIN_WINDOW, {
        ...metadata({ phaseId: 'phase-1', transition: 'complete', sequence: 4 }),
      })
    );

    expect(state.phase).toBe('passphrase');
    expect(state.actionType).toBe(UI_REQUEST.REQUEST_PASSPHRASE);
  });

  test('serializes asynchronous event handlers and continues after a handler failure', async () => {
    const queue = new HardwareUiEventQueue();
    const order: string[] = [];
    let releaseFirst!: () => void;
    const firstFinished = new Promise<void>(resolve => {
      releaseFirst = resolve;
    });

    const first = queue.enqueue(event(UI_REQUEST.REQUEST_PIN), async () => {
      order.push('first:start');
      await firstFinished;
      order.push('first:end');
      throw new Error('expected test failure');
    });
    const second = queue.enqueue(event(UI_REQUEST.REQUEST_PASSPHRASE), async () => {
      order.push('second');
    });

    await Promise.resolve();
    expect(order).toEqual(['first:start']);

    releaseFirst();
    await expect(first).rejects.toThrow('expected test failure');
    await expect(second).resolves.toBeUndefined();
    expect(order).toEqual(['first:start', 'first:end', 'second']);
  });

  test('matches legacy V1 PIN completion against the current PIN page', () => {
    let state = createHardwareUiState();

    state = reduceHardwareUiEvent(
      state,
      event(UI_REQUEST.REQUEST_PIN, { device: { connectId: 'connect-1' } })
    );
    state = reduceHardwareUiEvent(state, event(UI_REQUEST.CLOSE_UI_PIN_WINDOW));

    expect(state.phase).toBe('processing');
  });

  test('detects Protocol V2 from the active device response or interaction metadata', () => {
    expect(
      isProtocolV2UiEvent(
        event(UI_REQUEST.REQUEST_PIN, {
          device: { connectProtocol: 'V2' },
        })
      )
    ).toBe(true);
    expect(
      isProtocolV2UiEvent(
        event(UI_REQUEST.REQUEST_PIN, {
          device: { connectProtocol: 'V1' },
          interaction: metadata(),
        })
      )
    ).toBe(true);
    expect(
      isProtocolV2UiEvent(
        event(UI_REQUEST.REQUEST_PIN, {
          device: { connectProtocol: 'V1' },
        })
      )
    ).toBe(false);
  });

  test('only forwards complete UI response correlation fields', () => {
    expect(
      getUiResponseCorrelation(
        event(UI_REQUEST.REQUEST_PASSPHRASE, {
          responseCorrelation: { interactionId: 'interaction-1', deviceId: 'device-1' },
        })
      )
    ).toEqual({ interactionId: 'interaction-1', deviceId: 'device-1' });
    expect(
      getUiResponseCorrelation(
        event(UI_REQUEST.REQUEST_PASSPHRASE, {
          responseCorrelation: { interactionId: 'interaction-1' },
        })
      )
    ).toBeUndefined();
  });
});
