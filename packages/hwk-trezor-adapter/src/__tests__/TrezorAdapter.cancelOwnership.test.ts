import { UiRequestRegistry, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hwk-adapter-core';
import type { IConnector } from '@onekeyfe/hwk-adapter-core';
import { TrezorAdapter } from '../index';

// Exercise the real adapter and registries with a simulated physical transport.
describe('Trezor connector cancellation ownership', () => {
  it.each([
    'live-other',
    'ended-other',
    'same-operation',
    'untargeted',
    'initial-target',
    'initial-other',
    'initial-global',
  ])('%s', async scenario => {
    const ui = new UiRequestRegistry();
    let waiting = false;
    let pairing = false;
    const connector: IConnector = {
      connectionType: 'usb',
      searchDevices: jest.fn().mockResolvedValue([]),
      connect: jest.fn(async id => {
        if (pairing) {
          const answer = ui.wait(UI_REQUEST.REQUEST_TREZOR_THP_PAIRING);
          waiting = true;
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
        waiting = true;
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
    const adapter = new TrezorAdapter(connector);
    try {
      const a = await adapter.connectDevice('device-a');
      if (scenario.startsWith('initial-')) {
        if (!a.success) throw new Error('Could not create operation');
        pairing = true;
        const connecting = adapter.connectDevice('device-b');
        for (let i = 0; i < 50 && !waiting; i += 1) {
          await new Promise(resolve => setImmediate(resolve));
        }
        expect(waiting).toBe(true);
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
      const b = await adapter.connectDevice('device-b');
      if (!a.success || !b.success) throw new Error('Could not create operations');
      expect((await adapter.getDeviceInfo(a.payload, '')).success).toBe(true);
      expect((await adapter.getDeviceInfo(b.payload, '')).success).toBe(true);
      if (scenario === 'ended-other') await adapter.releaseOperation(a.payload);
      const result = adapter.evmGetAddress(b.payload, '', {
        path: "m/44'/60'/0'/0/0",
        useEmptyPassphrase: true,
      });
      for (let i = 0; i < 50 && !waiting; i += 1) {
        await new Promise(resolve => setImmediate(resolve));
      }
      expect(waiting).toBe(true);
      adapter.cancel(
        scenario === 'untargeted'
          ? undefined
          : scenario === 'same-operation'
          ? b.payload
          : a.payload
      );
      const preservesOther = scenario === 'ended-other' || scenario === 'live-other';
      expect(ui.hasPending(UI_REQUEST.REQUEST_PIN)).toBe(preservesOther);
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
