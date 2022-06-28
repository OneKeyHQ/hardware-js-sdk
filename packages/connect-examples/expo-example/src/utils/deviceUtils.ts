import {
  IDeviceType,
  SearchDevice,
  Success,
  Unsuccessful,
  getDeviceType,
  Features,
} from '@onekeyfe/hd-core';

import { getHardwareSDKInstance } from './hardwareInstance';

/**
 * will delete packages/kit/src/utils/device
 * so declare it here
 */

type IPollFn<T> = (time?: number) => T;

const MAX_SEARCH_TRY_COUNT = 15;
const MAX_CONNECT_TRY_COUNT = 5;
const POLL_INTERVAL = 1000;
const POLL_INTERVAL_RATE = 1.5;

export enum DeviceErrors {
  ConnectTimeout = 'ConnectTimeout',
  NeedOneKeyBridge = 'NeedOneKeyBridge',
}

class DeviceUtils {
  connectedDeviceType: IDeviceType = 'classic';

  scanning = false;

  tryCount = 0;

  async getSDKInstance() {
    return getHardwareSDKInstance();
  }

  startDeviceScan(callback: (searchResponse: Unsuccessful | Success<SearchDevice[]>) => void) {
    const searchDevices = async () => {
      const HardwareSDK = await this.getSDKInstance();
      const searchResponse = await HardwareSDK?.searchDevices();
      callback(searchResponse);

      this.tryCount += 1;
      return searchResponse;
    };

    const poll: IPollFn<void> = async (time = POLL_INTERVAL) => {
      if (!this.scanning) {
        return;
      }
      if (this.tryCount > MAX_SEARCH_TRY_COUNT) {
        this.stopScan();
        return;
      }

      const response = await searchDevices();

      if (!response.success) {
        return Promise.reject(response);
      }

      return new Promise((resolve: (p: void) => void) =>
        // eslint-disable-next-line no-promise-executor-return
        setTimeout(() => resolve(poll(time * POLL_INTERVAL_RATE)), time)
      );
    };

    this.scanning = true;
    poll();
  }

  stopScan() {
    this.scanning = false;
    this.tryCount = 0;
  }

  async connect(connectId: string) {
    const result = await this.getFeatures(connectId);
    return result !== null;
  }

  async getFeatures(connectId: string) {
    const HardwareSDK = await this.getSDKInstance();
    const response = await HardwareSDK?.getFeatures(connectId);

    if (response.success) {
      this.connectedDeviceType = getDeviceType(response.payload);
      return response.payload;
    }
    return null;
  }

  async ensureConnected(connectId: string) {
    let tryCount = 0;
    let connected = false;
    const poll: IPollFn<Promise<Features>> = async (time = POLL_INTERVAL) => {
      if (connected) {
        return Promise.resolve({} as Features);
      }
      tryCount += 1;
      const feature = await this.getFeatures(connectId);
      if (feature) {
        connected = true;
        return Promise.resolve(feature);
      }

      if (tryCount > MAX_CONNECT_TRY_COUNT) {
        return Promise.reject(DeviceErrors.ConnectTimeout);
      }
      return new Promise((resolve: (p: Promise<Features>) => void) =>
        // eslint-disable-next-line no-promise-executor-return
        setTimeout(() => resolve(poll(time * POLL_INTERVAL_RATE)), time)
      );
    };

    return poll();
  }
}

const deviceUtils = new DeviceUtils();

export default deviceUtils;
