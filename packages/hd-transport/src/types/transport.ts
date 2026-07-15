import type EventEmitter from 'events';

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
};

export type MessageFromOneKey = { type: string; message: Record<string, any> };

export type TransportCallOptions = {
  timeoutMs?: number;
  expectedTypes?: string[];
  intermediateTypes?: string[];
  onIntermediateResponse?: (response: MessageFromOneKey) => void;
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
  release(session: string, onclose: boolean): Promise<void>;
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
  stop(): void;

  configured: boolean;
  version: string;
  name: string;
  activeName?: string;

  isOutdated: boolean;
};

export type LowLevelDevice = OneKeyDeviceInfoBase & { id: string; name: string };
export type LowlevelTransportSharedPlugin = {
  enumerate: () => Promise<LowLevelDevice[]>;
  send: (uuid: string, data: string) => Promise<void>;
  receive: (uuid?: string) => Promise<string>;
  connect: (uuid: string) => Promise<void>;
  disconnect: (uuid: string) => Promise<void>;

  init: () => Promise<void>;
  version: string;
};
