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
  const run = () =>
    requestBleDeviceSelection({
      emitter,
      registry,
      scan,
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
