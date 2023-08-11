export type Device = { id: string; name: string };
export type LowlevelTransportSharedPlugin = {
  enumerate: () => Promise<Device[]>;
  send: (uuid: string, data: string) => Promise<void>;
  receive: () => Promise<string>;
  connect: (uuid: string) => Promise<void>;
  disconnect: (uuid: string) => Promise<void>;

  init: () => Promise<void>;
  version: string;
};

export type LowLevelAcquireInput = {
  uuid: string;
};
