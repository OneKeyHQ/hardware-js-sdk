import { on, off, removeAllListeners } from './event';
import { searchDevices } from './searchDevices';
import { init } from './init';

export type CoreApi = {
  call: (params: any) => Promise<any>;

  dispose: () => void;

  searchDevices: typeof searchDevices;

  init: typeof init;

  on: typeof on;

  off: typeof off;

  removeAllListeners: typeof removeAllListeners;
};
