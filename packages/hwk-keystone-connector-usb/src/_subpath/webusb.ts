import { TransportWebUSB } from '@keystonehq/hw-transport-webusb';

import { KeystoneUsbConnectorBase } from '../KeystoneUsbConnectorBase';

import type { IConnector } from '@onekeyfe/hwk-adapter-core';

export function createKeystoneWebUsbConnector(options?: { timeoutMs?: number }): IConnector {
  const disconnectListenerCleanupByTransport = new WeakMap<object, () => void>();
  const connectExactDevice = (
    device: USBDevice,
    config?: ConstructorParameters<typeof TransportWebUSB>[1]
  ) => {
    const transport = new TransportWebUSB(device, config);
    let listenerAttached = true;
    function onDisconnect(event: USBConnectionEvent) {
      if (event.device !== device) return;
      cleanup();
      config?.disconnectListener?.(device);
      transport.close().catch(() => undefined);
    }
    const cleanup = () => {
      if (!listenerAttached) return;
      listenerAttached = false;
      navigator.usb.removeEventListener('disconnect', onDisconnect);
      disconnectListenerCleanupByTransport.delete(transport);
    };
    navigator.usb.addEventListener('disconnect', onDisconnect);
    disconnectListenerCleanupByTransport.set(transport, cleanup);
    return transport;
  };
  return new KeystoneUsbConnectorBase(
    {
      connect: async config => {
        await TransportWebUSB.isSupported();
        const devices = await TransportWebUSB.getKeystoneDevices();
        if (devices.length !== 1) {
          throw new Error('Keystone WebUSB default connect requires exactly one device');
        }
        return connectExactDevice(devices[0], config);
      },
      connectDevice: (device, config) =>
        Promise.resolve(connectExactDevice(device as USBDevice, config)),
      disposeTransport: transport => {
        disconnectListenerCleanupByTransport.get(transport as object)?.();
      },
      getKeystoneDevices: () => TransportWebUSB.getKeystoneDevices(),
      requestPermission: () => TransportWebUSB.requestPermission(),
      isSupported: () => TransportWebUSB.isSupported(),
    },
    options
  );
}

/**
 * Triggers the browser's WebUSB device picker. Must be called from a
 * user-gesture handler (e.g. directly inside a button's `onclick`) — same
 * requirement as any other WebUSB permission request.
 */
export async function requestKeystoneUsbPermission(): Promise<void> {
  await TransportWebUSB.requestPermission();
}
