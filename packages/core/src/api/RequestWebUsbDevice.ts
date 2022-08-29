import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { BaseMethod } from './BaseMethod';
import TransportManager from '../data-manager/TransportManager';
import { DataManager } from '../data-manager';
import { DevicePool } from '../device/DevicePool';
import { getLogger, LoggerNames } from '../utils';

const Log = getLogger(LoggerNames.Method);

export default class RequestWebUsbDevice extends BaseMethod {
  init() {
    this.useDevice = false;
    this.useDevicePassphraseState = false;
  }

  async run() {
    await TransportManager.configure();

    const env = DataManager.getSettings('env');
    if (env !== 'webusb') {
      return Promise.reject(
        ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Not webusb environment')
      );
    }

    try {
      const deviceDiff = await this.connector?.enumerate();
      const devicesDescriptor = deviceDiff?.descriptors ?? [];
      const { deviceList } = await DevicePool.getDevices(devicesDescriptor);
      /**
       * get first onekey device
       */
      if (deviceList.length > 0) {
        return { device: deviceList[0].toMessageObject() };
      }

      return await Promise.reject(
        ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Please select the device to connect')
      );
    } catch (error) {
      Log.debug(error);
      return Promise.reject(
        ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Please select the device to connect')
      );
    }
  }
}
