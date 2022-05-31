export type OneKeyDeviceInfo = {
  path: string;
};

export type OneKeyDeviceInfoWithSession = OneKeyDeviceInfo & {
  session?: string | null;
  debugSession?: string | null;
  debug: boolean;
};

export type AcquireInput = {
  path: string;
  previous?: string | null;
};

export type MessageFromOneKey = { type: string; message: Record<string, any> };

export type Transport = {
  enumerate(): Promise<Array<OneKeyDeviceInfoWithSession>>;
  listen(old?: Array<OneKeyDeviceInfoWithSession>): Promise<Array<OneKeyDeviceInfoWithSession>>;
  acquire(input: AcquireInput): Promise<string>;
  release(session: string, onclose: boolean): Promise<void>;
  configure(signedData: JSON | string): Promise<void>;
  call(session: string, name: string, data: Record<string, any>): Promise<MessageFromOneKey>;
  post(session: string, name: string, data: Record<string, any>): Promise<void>;
  read(session: string): Promise<MessageFromOneKey>;

  // resolves when the transport can be used; rejects when it cannot
  init(): Promise<string>;
  stop(): void;

  configured: boolean;
  version: string;
  name: string;
  activeName?: string;

  // webusb has a different model, where you have to
  // request device connection
  requestDevice: () => Promise<void>;
  requestNeeded: boolean;

  isOutdated: boolean;
};
