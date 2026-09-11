import { UI_REQUEST, UI_RESPONSE } from '../events/ui-request';
import { TypedEventEmitter } from '../utils/TypedEventEmitter';
import { UiRequestRegistry } from '../utils/UiRequestRegistry';
import { requestBleDeviceSelection } from '../utils/requestBleDeviceSelection';

import type { DeviceInfo } from '../types/device';
import type { DeviceSelectionRequest, HardwareEventMap } from '../types/wallet';

const candidate: DeviceInfo = {
  vendor: 'trezor',
  model: 'safe7',
  firmwareVersion: 'test',
  deviceId: 'fixture',
  connectId: 'ble-fixture',
  connectionType: 'ble',
};

function setup(devices: DeviceInfo[] = []) {
  const emitter = new TypedEventEmitter<HardwareEventMap>();
  const registry = new UiRequestRegistry();
  const controller = new AbortController();
  const requests: DeviceSelectionRequest[] = [];
  emitter.on(UI_REQUEST.REQUEST_SELECT_DEVICE, event => requests.push(event.payload));
  const scan = jest.fn<Promise<DeviceInfo[]>, []>().mockResolvedValue([candidate]);
  const run = (allowUsbFallback = false) =>
    requestBleDeviceSelection({
      emitter,
      registry,
      scan,
      allowUsbFallback,
      signal: controller.signal,
      request: {
        devices,
        context: { kind: 'bind-connection', transport: 'ble', reason: 'missing-binding' },
      },
    });
  const select = (requestId: string) =>
    registry.resolve(UI_RESPONSE.RECEIVE_SELECT_DEVICE, {
      requestId,
      sdkConnectId: candidate.connectId,
    });
  return { emitter, registry, controller, requests, scan, run, select };
}

describe('SDK-owned BLE binding discovery', () => {
  const usbCandidate: DeviceInfo = {
    ...candidate,
    connectId: 'usb-fixture',
    connectionType: 'usb',
  };

  it('returns a newly discovered USB candidate without a BLE selection or publishing it as BLE', async () => {
    const { run, scan, registry, requests } = setup([candidate]);
    scan.mockResolvedValue([usbCandidate, candidate]);
    await expect(run(true)).resolves.toMatchObject({ device: usbCandidate });
    expect(requests).toHaveLength(1);
    expect(requests[0].devices).toEqual([candidate]);
    expect(registry.hasPending()).toBe(false);
  });

  it('drains USB discovery but does not override a BLE selection that already won', async () => {
    const { run, scan, select, requests, registry } = setup([candidate]);
    let finishScan!: (devices: DeviceInfo[]) => void;
    scan.mockReturnValue(
      new Promise(resolve => {
        finishScan = resolve;
      })
    );
    let settled = false;
    const pending = run(true).finally(() => {
      settled = true;
    });
    await new Promise<void>(resolve => setImmediate(resolve));
    select(requests[0].requestId);
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(settled).toBe(false);
    finishScan([usbCandidate]);
    await expect(pending).resolves.toMatchObject({ device: candidate });
    expect(registry.hasPending()).toBe(false);
  });

  it('ignores USB discovered after cancellation and drains its scan', async () => {
    const { run, scan, controller, registry } = setup();
    let finishScan!: (devices: DeviceInfo[]) => void;
    scan.mockReturnValue(
      new Promise(resolve => {
        finishScan = resolve;
      })
    );
    let settled = false;
    const pending = run(true).finally(() => {
      settled = true;
    });
    const rejected = expect(pending).rejects.toMatchObject({ _tag: 'UiRequestCancelled' });
    await new Promise<void>(resolve => setImmediate(resolve));
    controller.abort();
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(settled).toBe(false);
    finishScan([usbCandidate]);
    await rejected;
    expect(registry.hasPending()).toBe(false);
  });

  it('does not let a late BLE response resolve a newer request after USB fallback', async () => {
    const { run, scan, select, requests, registry } = setup();
    scan.mockResolvedValue([usbCandidate]);
    await run(true);
    const nextRequestId = registry.createRequestId();
    const next = registry.wait(UI_REQUEST.REQUEST_SELECT_DEVICE, { requestId: nextRequestId });
    select(requests[0].requestId);
    expect(registry.hasPending()).toBe(true);
    select(nextRequestId);
    await expect(next).resolves.toMatchObject({ requestId: nextRequestId });
  });

  it('streams from an empty initial snapshot and still requires explicit selection', async () => {
    const { run, requests, select, registry } = setup();
    const pending = run();
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(requests[0].devices).toEqual([]);
    expect(requests[1].devices).toEqual([candidate]);
    expect(requests[0].requestId).toBe(requests[1].requestId);
    expect(registry.hasPending()).toBe(true);
    select(requests[1].requestId);
    await expect(pending).resolves.toMatchObject({ device: candidate });
    expect(registry.hasPending()).toBe(false);
  });

  it('does not race a connection against an in-flight discovery', async () => {
    const { run, requests, scan, select } = setup([candidate]);
    let finishScan!: (devices: DeviceInfo[]) => void;
    scan.mockReturnValue(
      new Promise(resolve => {
        finishScan = resolve;
      })
    );
    let selected = false;
    const pending = run().then(result => {
      selected = true;
      return result;
    });
    await new Promise<void>(resolve => setImmediate(resolve));
    select(requests[0].requestId);
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(selected).toBe(false);
    finishScan([candidate]);
    await expect(pending).resolves.toMatchObject({ device: candidate });
    expect(scan).toHaveBeenCalledTimes(1);
  });

  it('accepts a selection from the displayed snapshot after a newer scan omits it', async () => {
    const { run, requests, scan, select } = setup([candidate]);
    scan.mockResolvedValue([]);
    const pending = run();
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(requests[1].devices).toEqual([]);
    select(requests[0].requestId);
    await expect(pending).resolves.toMatchObject({ device: candidate });
  });

  it('cleans up the scan loop on cancellation', async () => {
    const { run, controller, registry, scan } = setup();
    const pending = run();
    const rejected = expect(pending).rejects.toMatchObject({ _tag: 'UiRequestCancelled' });
    await new Promise<void>(resolve => setImmediate(resolve));
    controller.abort();
    await rejected;
    expect(registry.hasPending()).toBe(false);
    expect(scan).toHaveBeenCalledTimes(1);
  });

  it('surfaces a discovery error and removes its unanswered UI request', async () => {
    const { run, scan, registry } = setup();
    scan.mockRejectedValue(new Error('scan failed'));
    await expect(run()).rejects.toThrow('scan failed');
    expect(registry.hasPending()).toBe(false);
  });
});
