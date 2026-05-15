import { Platform } from 'react-native';
import { LedgerConnectorBase } from '@onekeyfe/hwk-ledger-adapter';

import type { LedgerDeviceManager } from '@onekeyfe/hwk-ledger-adapter';
import type { DeviceDescriptor } from '@onekeyfe/hwk-adapter-core';
import type { DeviceManagementKit, TransportFactory } from '@ledgerhq/device-management-kit';

type RnBleRawDevice = {
  id?: string;
  name?: string | null;
  localName?: string | null;
  rssi?: number | null;
  serviceUUIDs?: string[] | null;
  isConnectable?: boolean | null;
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

type RnBleMetadata = {
  bleName?: string;
  localName?: string;
  rssi?: number | null;
  serviceUUIDs?: string[] | null;
  isConnectable?: boolean | null;
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
        // RN BLE exposes the raw advertisement name separately from localName.
        // Keep both for diagnostics/display, but do not use either as connectId.
        bleName: device.name ?? undefined,
        localName: device.localName ?? undefined,
        rssi: device.rssi,
        serviceUUIDs: device.serviceUUIDs,
        isConnectable: device.isConnectable,
      });
    }

    const result = original.call(this, device, services);
    if (!result.map) {
      return result;
    }
    return result.map((mappedDevice: RnBleTransportDiscoveredDevice) => ({
      ...mappedDevice,
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
      {
        connectionType: 'ble',
        dmk: options?.dmk,
        // iOS Core Bluetooth wedges ~30s on connect to non-advertising peripherals.
        requirePreFlightScan: Platform.OS === 'ios',
      }
    );
    this._livenessProbeTimeoutMs = options?.livenessProbeTimeoutMs ?? 800;
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
        modelName: d.deviceModel.name,
        name: metadata?.localName || d.name,
        bleName: metadata?.bleName || d.name,
        localName: metadata?.localName,
        serviceUUIDs: metadata?.serviceUUIDs,
        isConnectable: metadata?.isConnectable,
        transport: d.transport,
        rssi: d.rssi,
      };
    });
  }
}
