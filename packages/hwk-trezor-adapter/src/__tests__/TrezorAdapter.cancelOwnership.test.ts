import { UI_REQUEST, UI_RESPONSE, UiRequestRegistry } from '@onekeyfe/hwk-adapter-core';

import { TrezorAdapter } from '../index';

import type { IConnector } from '@onekeyfe/hwk-adapter-core';

/**
 * A simulated USB transport: evmGetAddress (and connect, once `state.pairing` is set) waits
 * on a host prompt and flags `state.waiting` while it does.
 */
function createPromptingConnector() {
  const ui = new UiRequestRegistry();
  const state = { waiting: false, pairing: false };
  const connector: IConnector = {
    connectionType: 'usb',
    searchDevices: jest.fn().mockResolvedValue([]),
    connect: jest.fn(async id => {
      if (state.pairing) {
        const answer = ui.wait(UI_REQUEST.REQUEST_TREZOR_THP_PAIRING);
        state.waiting = true;
        await answer;
      }
      return {
        sessionId: `session-${id}`,
        deviceInfo: {
          vendor: 'trezor' as const,
          model: 'T2T1',
          firmwareVersion: '',
          deviceId: id ?? '',
          connectId: id ?? '',
          connectionType: 'usb' as const,
        },
      };
    }),
    disconnect: jest.fn().mockResolvedValue(undefined),
    call: jest.fn(async (_sessionId, method) => {
      if (method !== 'evmGetAddress') return {};
      const answer = ui.wait(UI_REQUEST.REQUEST_PIN);
      state.waiting = true;
      await answer;
      return { address: 'synthetic-address' };
    }),
    cancel: jest.fn().mockResolvedValue(undefined),
    uiResponse: response => {
      if (response.type === UI_RESPONSE.CANCEL) ui.cancel();
      else ui.resolve(response.type, response.payload);
    },
    on: jest.fn(),
    off: jest.fn(),
    reset: jest.fn(),
  };
  return { ui, state, connector };
}

async function waitUntil(condition: () => boolean) {
  for (let i = 0; i < 50 && !condition(); i += 1) {
    await new Promise(resolve => setImmediate(resolve));
  }
}

// Exercise the real adapter and registries with a simulated physical transport.
describe('Trezor connector cancellation ownership', () => {
  it.each([
    'live-other',
    'ended-other',
    'same-operation',
    'same-device-independent',
    'untargeted',
    'initial-target',
    'initial-other',
    'initial-global',
  ])('%s', async scenario => {
    const { ui, state, connector } = createPromptingConnector();
    const adapter = new TrezorAdapter(connector);
    try {
      const a = await adapter.connectDevice('device-a');
      if (scenario.startsWith('initial-')) {
        if (!a.success) throw new Error('Could not create operation');
        state.pairing = true;
        const connecting = adapter.connectDevice('device-b');
        await waitUntil(() => state.waiting);
        expect(state.waiting).toBe(true);
        adapter.cancel(
          scenario === 'initial-global'
            ? undefined
            : scenario === 'initial-target'
            ? 'device-b'
            : a.payload
        );
        const preserved = scenario === 'initial-other';
        expect(ui.hasPending(UI_REQUEST.REQUEST_TREZOR_THP_PAIRING)).toBe(preserved);
        if (preserved) ui.resolve(UI_RESPONSE.RECEIVE_TREZOR_THP_PAIRING, {});
        expect((await connecting).success).toBe(preserved);
        return;
      }
      const b =
        scenario === 'same-device-independent' ? a : await adapter.connectDevice('device-b');
      if (!a.success || !b.success) throw new Error('Could not create operations');
      expect((await adapter.getDeviceInfo(a.payload, '')).success).toBe(true);
      expect((await adapter.getDeviceInfo(b.payload, '')).success).toBe(true);
      if (scenario === 'ended-other') await adapter.releaseOperation(a.payload);
      const result = adapter.evmGetAddress(
        scenario === 'same-device-independent' ? 'device-a' : b.payload,
        '',
        {
          path: "m/44'/60'/0'/0/0",
          useEmptyPassphrase: true,
        }
      );
      await waitUntil(() => state.waiting);
      expect(state.waiting).toBe(true);
      adapter.cancel(
        scenario === 'untargeted'
          ? undefined
          : scenario === 'same-operation'
          ? b.payload
          : a.payload
      );
      const preservesOther =
        scenario === 'ended-other' ||
        scenario === 'live-other' ||
        scenario === 'same-device-independent';
      expect(ui.hasPending(UI_REQUEST.REQUEST_PIN)).toBe(preservesOther);
      if (scenario === 'same-device-independent') expect(connector.cancel).not.toHaveBeenCalled();
      if (preservesOther) {
        ui.resolve(UI_RESPONSE.RECEIVE_PIN, 'synthetic-answer');
      }
      const response = await result;
      expect(response.success).toBe(preservesOther);
    } finally {
      ui.reset();
      await adapter.dispose();
    }
  });
});

describe('Trezor reset with a connector prompt open', () => {
  it.each(['dispose', 'searchDevices with resetSession'] as const)(
    '%s ends a PIN prompt the host never answered',
    async action => {
      const { ui, state, connector } = createPromptingConnector();
      const adapter = new TrezorAdapter(connector);
      try {
        const result = adapter.evmGetAddress('device-a', '', {
          path: "m/44'/60'/0'/0/0",
          useEmptyPassphrase: true,
        });
        await waitUntil(() => state.waiting);
        expect(state.waiting).toBe(true);

        const reset =
          action === 'dispose' ? adapter.dispose() : adapter.searchDevices({ resetSession: true });
        const settled = await Promise.race([
          Promise.resolve(reset).then(() => true),
          new Promise<boolean>(resolve => {
            setTimeout(() => resolve(false), 200);
          }),
        ]);
        expect(settled).toBe(true);
        expect(ui.hasPending(UI_REQUEST.REQUEST_PIN)).toBe(false);
        expect((await result).success).toBe(false);
      } finally {
        ui.reset();
        await adapter.dispose();
      }
    }
  );
});
