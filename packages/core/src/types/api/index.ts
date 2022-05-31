import { on, off, removeAllListeners } from './event';
import { searchDevices } from './searchDevices';
import { getFeatures } from './getFeatures';
import { checkFirmwareRelease } from './checkFirmwareRelease';
import { init } from './init';
import { checkBLEFirmwareRelease } from './checkBLEFirmwareRelease';
import { checkTransportRelease } from './checkTransportRelease';

export type CoreApi = {
  /**
   * Inject function
   */
  init: typeof init;
  on: typeof on;
  off: typeof off;
  removeAllListeners: typeof removeAllListeners;
  dispose: () => void;
  call: (params: any) => Promise<any>;

  /**
   * Core function
   */
  searchDevices: typeof searchDevices;

  getFeatures: typeof getFeatures;

  checkFirmwareRelease: typeof checkFirmwareRelease;

  checkBLEFirmwareRelease: typeof checkBLEFirmwareRelease;

  checkTransportRelease: typeof checkTransportRelease;
};
