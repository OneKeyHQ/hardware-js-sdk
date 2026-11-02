import { TransportWebUSB } from '@keystonehq/hw-transport-webusb';
import { Actions, USBTimeout } from '@keystonehq/hw-transport-usb';

import { KeystoneUsbConnectorBase } from '../KeystoneUsbConnectorBase';

import type { IConnector } from '@onekeyfe/hwk-adapter-core';
import type { TransportHID } from '@keystonehq/hw-transport-usb';

export function createKeystoneWebUsbConnector(options?: { timeoutMs?: number }): IConnector {
  const disconnectListenerCleanupByTransport = new WeakMap<object, () => void>();
  const connectExactDevice = (
    device: USBDevice,
    config?: ConstructorParameters<typeof TransportWebUSB>[1]
  ) => {
    const requestTransport = new TransportWebUSB(device, config);
    // Device information needs no confirmation; use the vendor's shorter transfer timeout.
    const infoTransport = new TransportWebUSB(device, {
      ...config,
      timeout: Math.min(config?.timeout ?? USBTimeout, USBTimeout),
    });
    const transport: TransportHID = {
      send: <T>(action: Actions, data: unknown) =>
        (action === Actions.CMD_GET_DEVICE_VERSION ? infoTransport : requestTransport).send<T>(
          action,
          data
        ),
      receive: (action, requestId) => requestTransport.receive(action, requestId),
      open: () => requestTransport.open(),
      close: () => requestTransport.close(),
    };
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

/** Opens the WebUSB device picker; must be called from a user-gesture handler. */
export async function requestKeystoneUsbPermission(): Promise<void> {
  await TransportWebUSB.requestPermission();
}
