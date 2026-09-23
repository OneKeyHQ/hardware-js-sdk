import { UI_REQUEST, UI_RESPONSE } from '../events/ui-request';
import { TypedEventEmitter } from '../utils/TypedEventEmitter';
import { UiRequestRegistry } from '../utils/UiRequestRegistry';
import { requestSaveDeviceBinding } from '../utils/requestSaveDeviceBinding';

import type { HardwareEventMap, SaveDeviceBindingRequest } from '../types/wallet';

const binding: Omit<SaveDeviceBindingRequest, 'requestId'> = {
  selectionRequestId: 'selection-fixture',
  connection: { transport: 'ble', connectId: 'ble-fixture' },
  identity: { vendor: 'trezor', type: 'deviceId', value: 'device-fixture' },
};

function setup() {
  const emitter = new TypedEventEmitter<HardwareEventMap>();
  const registry = new UiRequestRegistry();
  const requests: SaveDeviceBindingRequest[] = [];
  emitter.on(UI_REQUEST.REQUEST_SAVE_DEVICE_BINDING, event => requests.push(event.payload));
  return { emitter, registry, requests };
}

describe('acknowledged device binding', () => {
  it('waits for a correlated successful persistence response', async () => {
    const { emitter, registry, requests } = setup();
    const pending = requestSaveDeviceBinding(emitter, registry, binding);
    registry.resolve(UI_RESPONSE.RECEIVE_SAVE_DEVICE_BINDING, { saved: true });
    registry.resolve(UI_RESPONSE.RECEIVE_SAVE_DEVICE_BINDING, {
      requestId: 'stale',
      saved: true,
    });
    expect(registry.hasPending()).toBe(true);
    registry.resolve(UI_RESPONSE.RECEIVE_SAVE_DEVICE_BINDING, {
      requestId: requests[0].requestId,
      saved: true,
    });
    await expect(pending).resolves.toEqual({ saved: true });
    expect(registry.hasPending()).toBe(false);
  });

  it.each([false, undefined, 'true'])('reports an unsuccessful save: %s', async saved => {
    const { emitter, registry, requests } = setup();
    const pending = requestSaveDeviceBinding(emitter, registry, binding);
    registry.resolve(UI_RESPONSE.RECEIVE_SAVE_DEVICE_BINDING, {
      requestId: requests[0].requestId,
      saved,
    });
    await expect(pending).resolves.toEqual({ saved: false, reason: 'skipped' });
  });

  it.each(['mismatch', 'skipped'] as const)(
    'passes the host decline reason through without failing the operation: %s',
    async reason => {
      const { emitter, registry, requests } = setup();
      const status = jest.fn();
      emitter.on(UI_REQUEST.DEVICE_BINDING_STATUS, status);
      const pending = requestSaveDeviceBinding(emitter, registry, binding);
      registry.resolve(UI_RESPONSE.RECEIVE_SAVE_DEVICE_BINDING, {
        requestId: requests[0].requestId,
        saved: false,
        reason,
      });
      await expect(pending).resolves.toEqual({ saved: false, reason });
      expect(status).toHaveBeenCalledWith({
        type: UI_REQUEST.DEVICE_BINDING_STATUS,
        payload: { selectionRequestId: 'selection-fixture', status: 'failed' },
      });
    }
  );

  it('cancels the pending wait when the operation is aborted', async () => {
    const { emitter, registry } = setup();
    const status = jest.fn();
    emitter.on(UI_REQUEST.DEVICE_BINDING_STATUS, status);
    const controller = new AbortController();
    const pending = requestSaveDeviceBinding(emitter, registry, binding, controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ _tag: 'UiRequestCancelled' });
    expect(status.mock.calls.map(([event]) => event.payload.status)).toEqual(['cancelled']);
    expect(registry.hasPending()).toBe(false);
  });

  it('throws for an already-aborted signal without opening a request', async () => {
    const { emitter, registry, requests } = setup();
    const controller = new AbortController();
    controller.abort(new Error('aborted first'));
    await expect(
      requestSaveDeviceBinding(emitter, registry, binding, controller.signal)
    ).rejects.toThrow('aborted first');
    expect(requests).toHaveLength(0);
  });

  it('does not let superseded cleanup cancel a newer binding request', async () => {
    const { emitter, registry, requests } = setup();
    const first = requestSaveDeviceBinding(emitter, registry, binding);
    const firstSettled = expect(first).resolves.toEqual({ saved: false, reason: 'skipped' });
    const second = requestSaveDeviceBinding(emitter, registry, binding);
    await firstSettled;
    expect(registry.hasPending()).toBe(true);
    registry.resolve(UI_RESPONSE.RECEIVE_SAVE_DEVICE_BINDING, {
      requestId: requests[1].requestId,
      saved: true,
    });
    await expect(second).resolves.toEqual({ saved: true });
  });

  it('reports rather than throws when the host has no persistence listener', async () => {
    const emitter = new TypedEventEmitter<HardwareEventMap>();
    const registry = new UiRequestRegistry();
    const status = jest.fn();
    emitter.on(UI_REQUEST.DEVICE_BINDING_STATUS, status);
    await expect(requestSaveDeviceBinding(emitter, registry, binding)).resolves.toEqual({
      saved: false,
      reason: 'skipped',
    });
    expect(status).toHaveBeenCalledWith({
      type: UI_REQUEST.DEVICE_BINDING_STATUS,
      payload: { selectionRequestId: 'selection-fixture', status: 'failed' },
    });
    expect(registry.hasPending()).toBe(false);
  });

  it('cleans up when a host listener throws synchronously', async () => {
    const { emitter, registry } = setup();
    emitter.on(UI_REQUEST.REQUEST_SAVE_DEVICE_BINDING, () => {
      throw new Error('host failure');
    });
    await expect(requestSaveDeviceBinding(emitter, registry, binding)).resolves.toEqual({
      saved: false,
      reason: 'skipped',
    });
    expect(registry.hasPending()).toBe(false);
  });
});
