import { Buffer } from 'buffer';
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
  isTrezorSafe7BleDescriptor,
  resolveTrezorBleConnectId,
} from '@onekeyfe/hwk-trezor-adapter';

import { createRNBlePlxTrezorTransport } from './RNBlePlxTrezorTransport';

import type { ConnectorDevice } from '@onekeyfe/hwk-adapter-core';
import type { TrezorBleDescriptor, TrezorBleTransportFactory } from '@onekeyfe/hwk-trezor-adapter';
import type { RNBlePlxTrezorTransportOptions } from './RNBlePlxTrezorTransport';

const isStandardHwkError = (error: unknown): error is { code: number } =>
  typeof (error as { code?: unknown })?.code === 'number';

export interface TrezorRnBleConnectorOptions {
  transportFactory?: TrezorBleTransportFactory;
  transportOptions?: RNBlePlxTrezorTransportOptions;
  thp?: TrezorConnectorBaseOptions['thp'];
  deviceSessionFactory?: TrezorConnectorBaseOptions['deviceSessionFactory'];
}

export class TrezorRnBleConnector extends TrezorConnectorBase {
  private readonly _transportFactory: TrezorBleTransportFactory;

  private readonly _logger?: TrezorDebugLogger;

  private _transport: Awaited<ReturnType<TrezorBleTransportFactory>> | undefined;

  constructor(options?: TrezorRnBleConnectorOptions) {
    super({
      connectionType: 'ble',
      chunkSize: 244,
      thp: options?.thp,
      deviceSessionFactory: options?.deviceSessionFactory,
    });
    this._transportFactory =
      options?.transportFactory ?? (() => createRNBlePlxTrezorTransport(options?.transportOptions));
    this._logger = options?.transportOptions?.logger;
  }

  protected async enumerateDevices(): Promise<ConnectorDevice[]> {
    const transport = await this._ensureTransport();
    const descriptors = await transport.scan();
    const filtered = descriptors.filter(isTrezorSafe7BleDescriptor);
    if (filtered.length !== descriptors.length) {
      this._log('info', 'ble.connector.enumerate.filtered', {
        transport: 'rn-ble',
        descriptorCount: descriptors.length,
        filteredCount: filtered.length,
        dropped: descriptors
          .filter(descriptor => !isTrezorSafe7BleDescriptor(descriptor))
          .map(toRnBleFilterLogSample),
        kept: filtered.map(toRnBleFilterLogSample),
      });
    }

    return filtered.map(descriptor => {
      const connectId = resolveTrezorBleConnectId(descriptor);
      // Stash the full BLE descriptor (rssi, manufacturerData, advertised
      // services, etc.) into `raw` so the UI / debug logs see everything
      // react-native-ble-plx returned.
      return {
        connectId,
        deviceId: '',
        name: descriptor.name ?? 'Trezor Safe 7',
        model: descriptor.model ?? 'T3W1',
        rssi: (descriptor as { rssi?: number | null }).rssi ?? null,
        isConnectable: (descriptor as { isConnectable?: boolean | null }).isConnectable ?? null,
        capabilities: { persistentDeviceIdentity: false },
        raw: {
          transport: 'rn-ble',
          descriptor,
        },
      };
    });
  }

  protected async createByteTransport(
    device: ConnectorDevice
  ): Promise<TrezorConnectorByteTransport> {
    const transport = await this._ensureTransport();
    try {
      await transport.connect(device.connectId);
    } catch (error) {
      // Rethrowing the caught error (typed `unknown`) as-is is intentional.
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      if (isStandardHwkError(error)) throw error;
      const reason = error instanceof Error ? error.message : String(error);
      // Raw connect failure loses the cause — generic BleConnectFailed unless
      // it's a clear "device not found".
      if (/device not found/i.test(reason)) {
        throw createHwkError({
          code: HardwareErrorCode.DeviceNotFound,
          message: `Trezor BLE device not found: ${device.connectId}`,
          params: {
            connectId: device.connectId,
            originalError: { message: reason },
          },
        });
      }
      throw createHwkError({
        code: HardwareErrorCode.BleConnectFailed,
        message: `Trezor BLE connect failed: ${device.connectId} (${reason})`,
        params: {
          connectId: device.connectId,
          originalError: { message: reason },
        },
      });
    }

    return {
      write: async (chunk: Buffer) => {
        if (!transport.write) {
          throw new Error('Trezor RN BLE transport.write is required');
        }
        await transport.write(device.connectId, Uint8Array.from(chunk));
      },
      read: async () => {
        if (!transport.read) {
          throw new Error('Trezor RN BLE transport.read is required');
        }
        return Buffer.from(await transport.read(device.connectId));
      },
      close: () => transport.disconnect(device.connectId),
      onDisconnect: transport.onDisconnect
        ? (handler: () => void) => transport.onDisconnect!(device.connectId, handler)
        : undefined,
    };
  }

  protected resolveUnlistedDevice(deviceId: string): ConnectorDevice | undefined {
    const connectId = deviceId.trim();
    if (!connectId) return undefined;

    return {
      connectId,
      deviceId: '',
      name: 'Trezor Safe 7',
      model: 'T3W1',
      capabilities: { persistentDeviceIdentity: false },
    };
  }

  private async _ensureTransport(): Promise<Awaited<ReturnType<TrezorBleTransportFactory>>> {
    if (!this._transport) {
      this._transport = await this._transportFactory();
    }
    return this._transport;
  }

  private _log(level: TrezorDebugLogLevel, event: string, data?: Record<string, unknown>): void {
    const entry = filterTrezorDebugLogEntry({ level, scope: 'trezor-rn-ble', event, data });
    if (!entry) return;

    try {
      this._logger?.(entry);
    } catch {
      // Debug logging must not affect BLE connector behavior.
    }
  }
}

function readStringArrayField(source: TrezorBleDescriptor, key: string): string[] | undefined {
  const value = (source as unknown as Record<string, unknown>)[key];
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === 'string');
}

function toRnBleFilterLogSample(descriptor: TrezorBleDescriptor): Record<string, unknown> {
  return {
    id: descriptor.id,
    path: descriptor.path,
    deviceId: descriptor.deviceId,
    name: descriptor.name,
    model: descriptor.model,
    keys: Object.keys(descriptor).sort(),
    matchesTrezorService: isTrezorSafe7BleDescriptor(descriptor),
    serviceUUIDs: readStringArrayField(descriptor, 'serviceUUIDs'),
    serviceUuids: readStringArrayField(descriptor, 'serviceUuids'),
    advertisedServiceUuids: readStringArrayField(descriptor, 'advertisedServiceUuids'),
  };
}
