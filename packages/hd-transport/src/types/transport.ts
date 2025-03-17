import type EventEmitter from 'events';

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

export type OneKeyDeviceInfo = OneKeyDeviceInfoWithSession & OneKeyMobileDeviceInfo;

export type AcquireInput = {
  path?: string;
  previous?: string | null;
  uuid?: string;
  forceCleanRunPromise?: boolean;
};

export type MessageFromOneKey = { type: string; message: Record<string, any> };

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
  call(session: string, name: string, data: Record<string, any>): Promise<MessageFromOneKey>;
  post(session: string, name: string, data: Record<string, any>): Promise<void>;
  read(session: string): Promise<MessageFromOneKey>;
  cancel(): Promise<void>;

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

export type LowLevelDevice = { id: string; name: string };
export type LowlevelTransportSharedPlugin = {
  enumerate: () => Promise<LowLevelDevice[]>;
  send: (uuid: string, data: string) => Promise<void>;
  receive: () => Promise<string>;
  connect: (uuid: string) => Promise<void>;
  disconnect: (uuid: string) => Promise<void>;

  init: () => Promise<void>;
  version: string;
};
