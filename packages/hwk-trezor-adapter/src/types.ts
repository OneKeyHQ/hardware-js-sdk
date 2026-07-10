import type { ConnectorDevice } from '@onekeyfe/hwk-adapter-core';

export interface TrezorBleDescriptor {
  id?: string;
  path?: string;
  name?: string;
  localName?: string;
  model?: string;
  firmwareVersion?: string;
  battery?: number;
  deviceId?: string;
  serviceUUIDs?: string[] | null;
  advertisedServiceUuids?: string[] | null;
  serviceUuids?: string[] | null;
}

export interface TrezorConnectedDevice extends TrezorBleDescriptor {
  id: string;
}

export interface TrezorBleTransport {
  scan(): Promise<TrezorBleDescriptor[]>;
  connect(connectId: string): Promise<TrezorConnectedDevice>;
  disconnect(connectId: string): Promise<void>;
  write?(connectId: string, data: Uint8Array): Promise<void>;
  read?(connectId: string, timeoutMs?: number): Promise<Uint8Array>;
  exchange?(connectId: string, data: Uint8Array, timeoutMs?: number): Promise<Uint8Array>;
  onDisconnect?(connectId: string, handler: () => void): () => void;
  cancel?(connectId: string): Promise<void>;
  reset?(): void;
}

export type TrezorBleTransportFactory = () => Promise<TrezorBleTransport>;

export type TrezorConnectorDevice = ConnectorDevice;
