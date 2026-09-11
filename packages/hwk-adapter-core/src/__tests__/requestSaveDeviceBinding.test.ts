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
    await expect(pending).resolves.toBeUndefined();
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

  it('reports a host-declined mismatch as a device mismatch, not an unknown error', async () => {
    const { emitter, registry, requests } = setup();
    const pending = requestSaveDeviceBinding(emitter, registry, binding);
    registry.resolve(UI_RESPONSE.RECEIVE_SAVE_DEVICE_BINDING, {
      requestId: requests[0].requestId,
      saved: false,
      reason: 'mismatch',
    });
    await expect(pending).rejects.toMatchObject({
      code: HardwareErrorCode.DeviceMismatch,
      origin: 'device',
    });
  });

  it('keeps a host-side skip an unknown host error', async () => {
    const { emitter, registry, requests } = setup();
    const pending = requestSaveDeviceBinding(emitter, registry, binding);
    registry.resolve(UI_RESPONSE.RECEIVE_SAVE_DEVICE_BINDING, {
      requestId: requests[0].requestId,
      saved: false,
      reason: 'skipped',
    });
    await expect(pending).rejects.toMatchObject({
      code: HardwareErrorCode.UnknownError,
      origin: 'host',
    });
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
    await expect(second).resolves.toBeUndefined();
  });

  it('refuses to bind when the host has no persistence listener', async () => {
    const emitter = new TypedEventEmitter<HardwareEventMap>();
    const registry = new UiRequestRegistry();
    const status = jest.fn();
    emitter.on(UI_REQUEST.DEVICE_BINDING_STATUS, status);
    await expect(requestSaveDeviceBinding(emitter, registry, binding)).rejects.toMatchObject({
      code: HardwareErrorCode.InvalidParams,
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
    await expect(requestSaveDeviceBinding(emitter, registry, binding)).rejects.toThrow(
      'host failure'
    );
    expect(registry.hasPending()).toBe(false);
  });
});
