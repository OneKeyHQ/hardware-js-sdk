import { on, off, removeAllListeners } from './event';
import { searchDevices } from './searchDevices';
import { getFeatures } from './getFeatures';
import { init } from './init';

export type CoreApi = {
  /**
   * inject function
   */
  init: typeof init;
  on: typeof on;
  off: typeof off;
  removeAllListeners: typeof removeAllListeners;
  dispose: () => void;
  call: (params: any) => Promise<any>;

  /**
   * core function
   */
  searchDevices: typeof searchDevices;

  getFeatures: typeof getFeatures;
};
