import { LedgerConnectorBase, extractBleHexId } from '@onekeyfe/hwk-ledger-adapter';

import type { LedgerDeviceManager } from '@onekeyfe/hwk-ledger-adapter';
import type { DeviceDescriptor } from '@onekeyfe/hwk-adapter-core';
import type { DeviceManagementKit, TransportFactory } from '@ledgerhq/device-management-kit';

type RnBleRawDevice = {
  id?: string;
  name?: string | null;
  localName?: string | null;
};

type RnBleTransportDiscoveredDevice = {
  id?: string;
  name?: string;
  localName?: string;
};

type RnBleMapResult = {
  map?: (
    fn: (device: RnBleTransportDiscoveredDevice) => RnBleTransportDiscoveredDevice
  ) => RnBleMapResult;
};

type RnBleTransportWithMapper = {
  _mapDeviceToTransportDiscoveredDevice?: (
    device: RnBleRawDevice,
    services?: string[]
  ) => RnBleMapResult;
};

type LedgerBleDeviceDescriptor = DeviceDescriptor & {
  bleName?: string;
  localName?: string;
};

type RnBleMetadata = {
  bleName?: string;
  localName?: string;
};

const rnBleMetadataByPath = new Map<string, RnBleMetadata>();

function patchLedgerRnBleTransportMetadata(transport: unknown): unknown {
  const target = transport as RnBleTransportWithMapper;
  const original = target._mapDeviceToTransportDiscoveredDevice;
  if (typeof original !== 'function') {
    return transport;
  }

  target._mapDeviceToTransportDiscoveredDevice = function patchedMapDevice(
    this: RnBleTransportWithMapper,
    device: RnBleRawDevice,
    services?: string[]
  ) {
    if (device.id) {
      rnBleMetadataByPath.set(device.id, {
        // On RN BLE, `name` is the stable Ledger four-character identifier
        // (for example A58F), while `localName` is the user-visible label.
        bleName: device.name ?? undefined,
        localName: device.localName ?? undefined,
      });
    }

    const result = original.call(this, device, services);
    if (!result.map) {
      return result;
    }
    return result.map((mappedDevice: RnBleTransportDiscoveredDevice) => ({
      ...mappedDevice,
      // Preserve the stable BLE identifier through DMK's DiscoveredDevice.name.
      // The UI display name is carried separately via localName below.
      name: device.name || device.localName || mappedDevice.name || '',
      localName: device.localName || mappedDevice.localName,
    }));
  };

  return transport;
}

export interface LedgerBleConnectorOptions {
  dmk?: DeviceManagementKit;
  /** Fresh-scan window for liveness probe (default 800ms; ~2+ adv intervals). */
  livenessProbeTimeoutMs?: number;
}

export class LedgerBleConnector extends LedgerConnectorBase {
  private readonly _livenessProbeTimeoutMs: number;

  constructor(options?: LedgerBleConnectorOptions) {
    super(
      async () => {
        const { RNBleTransportFactory } = await import(
          '@ledgerhq/device-transport-kit-react-native-ble'
        );
        return ((args: Parameters<TransportFactory>[0]) =>
          patchLedgerRnBleTransportMetadata(RNBleTransportFactory(args))) as TransportFactory;
      },
      { connectionType: 'ble', dmk: options?.dmk }
    );
    this._livenessProbeTimeoutMs = options?.livenessProbeTimeoutMs ?? 800;
  }

  protected override _resolveConnectId(descriptor: DeviceDescriptor): string {
    const ledgerBleDescriptor = descriptor as LedgerBleDeviceDescriptor;
    return (
      extractBleHexId(ledgerBleDescriptor.bleName) ||
      extractBleHexId(ledgerBleDescriptor.name) ||
      ''
    );
  }

  /** BLE discovery uses a fresh scan window; enumerate cache is ignored. */
  protected override async _discoverDescriptors(
    dm: LedgerDeviceManager
  ): Promise<DeviceDescriptor[]> {
    const live = await dm.getLiveDevices(this._livenessProbeTimeoutMs);
    return live.map(d => {
      const metadata = rnBleMetadataByPath.get(d.id);
      return {
        path: d.id,
        type: d.deviceModel.model,
        name: metadata?.localName || d.name,
        bleName: metadata?.bleName || d.name,
        localName: metadata?.localName,
        transport: d.transport,
        rssi: d.rssi,
      };
    });
  }
}
