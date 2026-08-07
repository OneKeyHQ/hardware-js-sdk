import { LedgerConnectorBase } from '@onekeyfe/hwk-ledger-adapter';

import type { LedgerDeviceManager } from '@onekeyfe/hwk-ledger-adapter';
import type { DeviceDescriptor, IConnector } from '@onekeyfe/hwk-adapter-core';
import type { DeviceManagementKit, TransportFactory } from '@ledgerhq/device-management-kit';

type WebHidRawDevice = {
  vendorId?: number;
  productId?: number;
  productName?: string;
  serialNumber?: string;
};

type WebHidTransportDiscoveredDevice = {
  id?: string;
  name?: string;
};

type WebHidTransportWithMapper = {
  mapHIDDeviceToTransportDiscoveredDevice?: (
    device: WebHidRawDevice
  ) => WebHidTransportDiscoveredDevice;
};

type WebHidMetadata = {
  vendor?: number;
  product?: number;
  productName?: string;
  serialNumber?: string;
};

const webHidMetadataByPath = new Map<string, WebHidMetadata>();

function patchLedgerWebHidTransportMetadata(transport: unknown): unknown {
  const target = transport as WebHidTransportWithMapper;
  const original = target.mapHIDDeviceToTransportDiscoveredDevice;
  if (typeof original !== 'function') {
    return transport;
  }

  target.mapHIDDeviceToTransportDiscoveredDevice = function patchedMapHidDevice(
    this: WebHidTransportWithMapper,
    device: WebHidRawDevice
  ) {
    const mappedDevice = original.call(this, device);
    if (mappedDevice.id) {
      webHidMetadataByPath.set(mappedDevice.id, {
        vendor: device.vendorId,
        product: device.productId,
        productName: device.productName,
        serialNumber: device.serialNumber,
      });
    }
    return mappedDevice;
  };

  return transport;
}

export interface LedgerWebHidConnectorOptions {
  /**
   * Pre-built DMK instance. If not provided, a DMK will be created
   * lazily on first use via `@ledgerhq/device-management-kit` and
   * `@ledgerhq/device-transport-kit-web-hid`.
   */
  dmk?: DeviceManagementKit;
}

/**
 * IConnector implementation for Ledger hardware wallets via WebHID.
 *
 * Extends LedgerConnectorBase with the WebHID transport factory.
 */
export class LedgerWebHidConnector extends LedgerConnectorBase implements IConnector {
  constructor(options?: LedgerWebHidConnectorOptions) {
    super(
      async () => {
        const { webHidTransportFactory } = await import('@ledgerhq/device-transport-kit-web-hid');
        return ((args: Parameters<TransportFactory>[0]) =>
          patchLedgerWebHidTransportMetadata(webHidTransportFactory(args))) as TransportFactory;
      },
      { connectionType: 'usb', dmk: options?.dmk }
    );
  }

  protected override async _discoverDescriptors(
    dm: LedgerDeviceManager
  ): Promise<DeviceDescriptor[]> {
    const descriptors = await super._discoverDescriptors(dm);
    return descriptors.map(d => {
      const metadata = webHidMetadataByPath.get(d.path);
      return {
        ...d,
        vendor: metadata?.vendor ?? d.vendor,
        product: metadata?.product ?? d.product,
        productName: metadata?.productName ?? d.productName,
        serialNumber: metadata?.serialNumber ?? d.serialNumber,
      };
    });
  }
}
