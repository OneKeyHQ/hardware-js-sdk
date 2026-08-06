import { Buffer } from 'buffer';
import {
  TREZOR_BLE_PACKET_SIZE,
  TREZOR_SAFE_7_MODEL,
  isTrezorBleDescriptor,
} from '@onekeyfe/hwk-trezor-adapter';
import { HardwareErrorCode, createHwkError } from '@onekeyfe/hwk-adapter-core';
import {
  TrezorConnectorBase,
  type TrezorConnectorBaseOptions,
  type TrezorConnectorByteTransport,
  type TrezorDebugLogLevel,
  type TrezorDebugLogger,
  filterTrezorDebugLogEntry,
} from '@onekeyfe/hwk-trezor-connector';

import {
  TrezorElectronBleTransport,
  type TrezorElectronBleTransportOptions,
} from './TrezorElectronBleTransport';

import type { ConnectorDevice } from '@onekeyfe/hwk-adapter-core';
import type { TrezorBleDeviceInfo } from './types/desktop-api';

const isStandardHwkError = (error: unknown): error is { code: number } =>
  typeof (error as { code?: unknown })?.code === 'number';

export interface TrezorElectronBleConnectorOptions {
  transport?: TrezorElectronBleTransport;
  transportOptions?: TrezorElectronBleTransportOptions;
  thp?: TrezorConnectorBaseOptions['thp'];
  deviceSessionFactory?: TrezorConnectorBaseOptions['deviceSessionFactory'];
}

export class TrezorElectronBleConnector extends TrezorConnectorBase {
  private _transport: TrezorElectronBleTransport | undefined;

  private readonly _transportOptions?: TrezorElectronBleTransportOptions;

  private readonly _logger?: TrezorDebugLogger;

  constructor(options?: TrezorElectronBleConnectorOptions) {
    super({
      connectionType: 'ble',
      chunkSize: TREZOR_BLE_PACKET_SIZE,
      thp: options?.thp,
      deviceSessionFactory: options?.deviceSessionFactory,
    });
    this._transport = options?.transport;
    this._transportOptions = options?.transportOptions;
    this._logger = options?.transportOptions?.logger;
  }

  protected async enumerateDevices(): Promise<ConnectorDevice[]> {
    const transport = this._ensureTransport();
    const devices = await transport.scan();
    const filtered = devices.filter(isTrezorBleDescriptor);
    if (filtered.length !== devices.length) {
      this._log('info', 'ble.connector.enumerate.filtered', {
        transport: 'electron-ble',
        descriptorCount: devices.length,
        filteredCount: filtered.length,
        dropped: devices.filter(device => !isTrezorBleDescriptor(device)).map(toBleFilterLogSample),
        kept: filtered.map(toBleFilterLogSample),
      });
    }
    return filtered.map(d => ({
      connectId: d.id,
      deviceId: '',
      name: d.name ?? d.localName ?? 'Trezor Safe 7',
      model: TREZOR_SAFE_7_MODEL,
      connectionType: 'ble' as const,
      // Promote the typed BLE fields the device surface already has slots for.
      rssi: d.rssi ?? null,
      isConnectable: d.isConnectable ?? null,
      capabilities: { persistentDeviceIdentity: false },
      // Stash the FULL scan-time advertisement so the app/debug layer sees
      // everything the OS BLE stack exposed (mirrors the WebUSB connector's
      // `raw.descriptor`). This is where a cross-transport identity, if any,
      // would surface (manufacturerData / serviceData / localName).
      raw: {
        transport: 'electron-ble',
        descriptor: d,
      },
    }));
  }

  protected async createByteTransport(
    device: ConnectorDevice
  ): Promise<TrezorConnectorByteTransport> {
    const transport = this._ensureTransport();
    try {
      await transport.connect(device.connectId);
    } catch (error) {
      // Rethrowing the caught error (typed `unknown`) as-is is intentional.
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      if (isStandardHwkError(error)) throw error;
      const reason = error instanceof Error ? error.message : String(error);
      // The device wasn't found at all → DeviceNotFound. Otherwise the connect
      // itself failed: noble drops the real CoreBluetooth reason (hardcodes
      // "connection failed" / a timeout), so we CANNOT tell a stale bond from an
      // out-of-range / unresponsive device. Surface one honest, generic
      // BleConnectFailed instead of guessing a specific cause.
      if (/device not found/i.test(reason)) {
        throw createHwkError({
          code: HardwareErrorCode.DeviceNotFound,
          message: `Trezor BLE device not found: ${device.connectId}`,
          params: { connectId: device.connectId, originalError: { message: reason } },
        });
      }
      throw createHwkError({
        code: HardwareErrorCode.BleConnectFailed,
        message: `Trezor BLE connect failed: ${device.connectId} (${reason})`,
        params: { connectId: device.connectId, originalError: { message: reason } },
      });
    }

    return {
      write: async (chunk: Buffer) => {
        await transport.write(device.connectId, Uint8Array.from(chunk));
      },
      read: async () => {
        const data = await transport.read(device.connectId);
        return Buffer.from(data);
      },
      close: () => transport.disconnect(device.connectId),
      onDisconnect: (handler: () => void) => transport.onDisconnect(device.connectId, handler),
    };
  }

  protected resolveUnlistedDevice(deviceId: string): ConnectorDevice | undefined {
    const connectId = deviceId.trim();
    if (!connectId) return undefined;
    return {
      connectId,
      deviceId: '',
      name: 'Trezor Safe 7',
      model: TREZOR_SAFE_7_MODEL,
      capabilities: { persistentDeviceIdentity: false },
    };
  }

  reset(): void {
    super.reset();
    this._transport?.reset();
    this._transport = undefined;
  }

  private _ensureTransport(): TrezorElectronBleTransport {
    if (!this._transport) {
      this._transport = new TrezorElectronBleTransport(this._transportOptions);
    }
    return this._transport;
  }

  private _log(level: TrezorDebugLogLevel, event: string, data?: Record<string, unknown>): void {
    const entry = filterTrezorDebugLogEntry({ level, scope: 'trezor-electron-ble', event, data });
    if (!entry) return;

    try {
      this._logger?.(entry);
    } catch {
      // Debug logging must not affect BLE connector behavior.
    }
  }
}

export function createTrezorElectronBleConnector(
  options?: TrezorElectronBleConnectorOptions
): TrezorElectronBleConnector {
  return new TrezorElectronBleConnector(options);
}

function readStringArrayField(source: TrezorBleDeviceInfo, key: string): string[] | undefined {
  const value = (source as unknown as Record<string, unknown>)[key];
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === 'string');
}

function toBleFilterLogSample(device: TrezorBleDeviceInfo): Record<string, unknown> {
  return {
    id: device.id,
    name: device.name,
    localName: device.localName,
    rssi: device.rssi,
    isConnectable: device.isConnectable,
    keys: Object.keys(device).sort(),
    matchesTrezorService: isTrezorBleDescriptor(device),
    serviceUUIDs: readStringArrayField(device, 'serviceUUIDs'),
    serviceUuids: readStringArrayField(device, 'serviceUuids'),
    advertisedServiceUuids: readStringArrayField(device, 'advertisedServiceUuids'),
    serviceSolicitationUuids: device.serviceSolicitationUuids,
    txPowerLevel: device.txPowerLevel,
    manufacturerDataHex: device.manufacturerDataHex,
    serviceData: device.serviceData,
    address: device.address,
    addressType: device.addressType,
    state: device.state,
  };
}
