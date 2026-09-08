import type EventEmitter from 'events';

export const TRANSPORT_EVENT = {
  DEVICE_DISCONNECT: 'transport-device-disconnect',
} as const;

export type TransportDeviceDisconnectEvent = {
  id: string;
  connectId: string;
  name: string | null;
};

export type ProtocolType = 'V1' | 'V2';

export type OneKeyDeviceCommType =
  | 'usb'
  | 'webusb'
  | 'ble'
  | 'webble'
  | 'electron-ble'
  | 'bridge'
  | 'emulator';

export type OneKeyUsbDeviceInfo = {
  path: string;
};

export type OneKeyDeviceInfoWithSession = OneKeyUsbDeviceInfo & {
  session?: string | null;
  debugSession?: string | null;
  debug: boolean;
};

export type OneKeyMobileDeviceInfo = {
  id: string;
  name: string | null;
};

export type OneKeyDeviceInfoBase = {
  commType: OneKeyDeviceCommType;
};

// TODO: sorting type by communication type
export type OneKeyDeviceInfo = OneKeyDeviceInfoBase &
  OneKeyDeviceInfoWithSession &
  OneKeyMobileDeviceInfo & {
    protocolType?: ProtocolType;
  };

export type AcquireInput = {
  path?: string;
  previous?: string | null;
  uuid?: string;
  forceCleanRunPromise?: boolean;
  expectedProtocol?: ProtocolType;
  protocolHint?: ProtocolType;
  /**
   * Explicit recovery/discovery (e.g. detectDeviceConnectProtocol): the
   * transport must probe the protocol on the wire, bypassing any cached result.
   */
  forceProtocolDetection?: boolean;
  /** Reuse expectedProtocol only when this transport previously confirmed it for the same endpoint. */
  skipProtocolProbe?: boolean;
};

export type MessageFromOneKey = { type: string; message: Record<string, any> };

export type TransportWriteMetrics = {
  elapsedMs: number;
  frameBytes: number;
};

export type TransportCallOptions = {
  timeoutMs?: number;
  expectedTypes?: string[];
  intermediateTypes?: string[];
  onIntermediateResponse?: (response: MessageFromOneKey) => void;
  /** Called after the complete request frame has been submitted to the transport. */
  onWriteCompleted?: (metrics: TransportWriteMetrics) => void;
  /** Resolve after the complete request frame is written without waiting for a response. */
  returnAfterWrite?: boolean;
  /** Observe the delayed terminal response of a write-only call while a later call is active. */
  onResponseAfterWrite?: (response: MessageFromOneKey) => void;
  /** Prefer acknowledged BLE characteristic writes for this call when supported. */
  writeWithResponse?: boolean;
};

type ITransportInitFn = (
  logger?: any,
  emitter?: EventEmitter,
  plugin?: LowlevelTransportSharedPlugin
) => Promise<string>;

export type Transport = {
  enumerate(): Promise<Array<OneKeyDeviceInfo>>;
  listen(old?: Array<OneKeyDeviceInfo>): Promise<Array<OneKeyDeviceInfo>>;
  acquire(input: AcquireInput): Promise<string>;
  /**
   * `keepSession` tells a transport that the caller intends to keep using this
   * device across calls (firmware update, batched signing). Transports that
   * hold the link open may use it to pick a longer idle window; the rest ignore it.
   */
  release(session: string, onclose: boolean, keepSession?: boolean): Promise<void>;
  configure(signedData: JSON | string): Promise<void>;
  configureProtocolV2?: (signedData: JSON | string) => Promise<void> | void;
  call(
    session: string,
    name: string,
    data: Record<string, any>,
    options?: TransportCallOptions
  ): Promise<MessageFromOneKey>;
  post(session: string, name: string, data: Record<string, any>): Promise<void>;
  read(session: string): Promise<MessageFromOneKey>;
  cancel(): Promise<void>;

  // reset the session of the transport
  // used to reset the session of the transport when the session is not valid
  disconnect?: (session: string) => Promise<void>;

  // Returns the protocol type for a given device path.
  // Single-protocol transports (HTTP, emulator, etc.) return 'V1'.
  // Protocol V2-capable transports return the probed protocol for each device,
  // or undefined before protocol detection succeeds.
  getProtocolType: (path: string) => ProtocolType | undefined;

  // web-usb, web-bluetooth request device
  promptDeviceAccess?: () => Promise<USBDevice | BluetoothDevice | null>;

  // resolves when the transport can be used; rejects when it cannot
  init: ITransportInitFn;
  stop(): void | Promise<void>;

  configured: boolean;
  version: string;
  name: string;
  activeName?: string;

  isOutdated: boolean;
};

export type LowLevelDevice = OneKeyDeviceInfoBase & { id: string; name: string };
export type LowlevelTransportSharedPlugin = {
  enumerate: () => Promise<LowLevelDevice[]>;
  send: (uuid: string, data: string, options?: { withoutResponse?: boolean }) => Promise<void>;
  receive: (uuid?: string) => Promise<string>;
  connect: (uuid: string) => Promise<void>;
  disconnect: (uuid: string) => Promise<void>;
  /** Maximum Protocol V2 bytes accepted by one BLE characteristic write. */
  getProtocolV2PacketCapacity?: (uuid: string) => number | undefined | Promise<number | undefined>;

  init: () => Promise<void>;
  version: string;
};
