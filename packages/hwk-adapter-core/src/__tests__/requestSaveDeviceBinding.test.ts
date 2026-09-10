import { UI_REQUEST, UI_RESPONSE } from '../events/ui-request';
import { HardwareErrorCode } from '../types/errors';
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
    await expect(pending).resolves.toBe(true);
    expect(registry.hasPending()).toBe(false);
  });

  it.each([false, undefined, 'true'])('rejects an unsuccessful save: %s', async saved => {
    const { emitter, registry, requests } = setup();
    const pending = requestSaveDeviceBinding(emitter, registry, binding);
    registry.resolve(UI_RESPONSE.RECEIVE_SAVE_DEVICE_BINDING, {
      requestId: requests[0].requestId,
      saved,
    });
    await expect(pending).rejects.toMatchObject({ code: HardwareErrorCode.UnknownError });
  });

  it('cancels the pending wait when the operation is aborted', async () => {
    const { emitter, registry } = setup();
    const controller = new AbortController();
    const pending = requestSaveDeviceBinding(emitter, registry, binding, controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ _tag: 'UiRequestCancelled' });
    expect(registry.hasPending()).toBe(false);
  });

  it('does not let superseded cleanup cancel a newer binding request', async () => {
    const { emitter, registry, requests } = setup();
    const first = requestSaveDeviceBinding(emitter, registry, binding);
    const firstRejected = expect(first).rejects.toMatchObject({ _tag: 'UiRequestPreempted' });
    const second = requestSaveDeviceBinding(emitter, registry, binding);
    await firstRejected;
    expect(registry.hasPending()).toBe(true);
    registry.resolve(UI_RESPONSE.RECEIVE_SAVE_DEVICE_BINDING, {
      requestId: requests[1].requestId,
      saved: true,
    });
    await expect(second).resolves.toBe(true);
  });

  it('preserves the legacy notification path when the host has not migrated', async () => {
    const emitter = new TypedEventEmitter<HardwareEventMap>();
    const registry = new UiRequestRegistry();
    await expect(requestSaveDeviceBinding(emitter, registry, binding)).resolves.toBe(false);
    expect(registry.hasPending()).toBe(false);
  });

  it('cleans up when a host listener throws synchronously', async () => {
    const { emitter, registry } = setup();
    emitter.on(UI_REQUEST.REQUEST_SAVE_DEVICE_BINDING, () => {
      throw new Error('host failure');
    });
    await expect(requestSaveDeviceBinding(emitter, registry, binding)).rejects.toThrow(
      'host failure'
    );
    expect(registry.hasPending()).toBe(false);
  });
});
