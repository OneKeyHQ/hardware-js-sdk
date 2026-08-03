import { createCoreApi, createProtocolAwareCall } from '../src/inject';

import type { CoreApi } from '../src/types/api';

describe('SDK protocol binding', () => {
  test('exposes a minimal API that returns the actively detected protocol', async () => {
    const response = { success: true as const, payload: 'V2' as const };
    const rawCall = jest.fn().mockResolvedValue(response);
    const api = createCoreApi(rawCall as CoreApi['call']);

    await expect(api.detectDeviceConnectProtocol('USB_DEVICE_A')).resolves.toBe(response);
    expect(rawCall).toHaveBeenCalledWith({
      connectId: 'USB_DEVICE_A',
      forceProtocolDetection: true,
      method: 'detectDeviceConnectProtocol',
    });
  });

  test('injects a strict protocol into every later call and isolates devices', async () => {
    const rawCall = jest.fn(params => Promise.resolve({ success: true, payload: params }));
    const protocolAwareCall = createProtocolAwareCall(rawCall as CoreApi['call']);
    const api = createCoreApi(protocolAwareCall.call);

    protocolAwareCall.setDeviceConnectProtocol('USB_DEVICE_A', 'V2');
    protocolAwareCall.setDeviceConnectProtocol('ble-device-b', 'V1');

    await api.deviceWipe('usb_device_a');
    await api.deviceSupportFeatures('BLE-DEVICE-B');
    await api.getFeatures('USB_DEVICE_A', { connectProtocol: 'V1' });
    await api.getDeviceState('USB_DEVICE_A', { forceProtocolDetection: true });
    await protocolAwareCall.call({
      connectId: 'USB_DEVICE_A',
      method: 'deviceUpdateReboot',
    });

    expect(rawCall).toHaveBeenNthCalledWith(1, {
      connectId: 'usb_device_a',
      method: 'deviceWipe',
      connectProtocol: 'V2',
    });
    expect(rawCall).toHaveBeenNthCalledWith(2, {
      connectId: 'BLE-DEVICE-B',
      method: 'deviceSupportFeatures',
      connectProtocol: 'V1',
    });
    expect(rawCall).toHaveBeenNthCalledWith(3, {
      connectId: 'USB_DEVICE_A',
      method: 'getFeatures',
      connectProtocol: 'V1',
    });
    expect(rawCall).toHaveBeenNthCalledWith(4, {
      connectId: 'USB_DEVICE_A',
      method: 'getDeviceState',
      forceProtocolDetection: true,
    });
    expect(rawCall).toHaveBeenNthCalledWith(5, {
      connectId: 'USB_DEVICE_A',
      method: 'deviceUpdateReboot',
      connectProtocol: 'V2',
    });
  });

  test('keeps bindings local to one SDK instance and supports clearing them', async () => {
    const firstRawCall = jest.fn(() => Promise.resolve({ success: true, payload: {} }));
    const secondRawCall = jest.fn(() => Promise.resolve({ success: true, payload: {} }));
    const first = createProtocolAwareCall(firstRawCall as CoreApi['call']);
    const second = createProtocolAwareCall(secondRawCall as CoreApi['call']);

    first.setDeviceConnectProtocol('same-device', 'V2');
    await first.call({ connectId: 'same-device', method: 'deviceWipe' });
    await second.call({ connectId: 'same-device', method: 'deviceWipe' });
    first.setDeviceConnectProtocol('same-device', undefined);
    await first.call({ connectId: 'same-device', method: 'deviceWipe' });

    expect(firstRawCall).toHaveBeenNthCalledWith(1, {
      connectId: 'same-device',
      method: 'deviceWipe',
      connectProtocol: 'V2',
    });
    expect(secondRawCall).toHaveBeenCalledWith({
      connectId: 'same-device',
      method: 'deviceWipe',
    });
    expect(firstRawCall).toHaveBeenNthCalledWith(2, {
      connectId: 'same-device',
      method: 'deviceWipe',
    });
  });
});
