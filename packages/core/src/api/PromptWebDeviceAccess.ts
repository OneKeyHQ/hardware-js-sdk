import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { BaseMethod } from './BaseMethod';
import TransportManager from '../data-manager/TransportManager';
import { DataManager } from '../data-manager';
import { DevicePool } from '../device/DevicePool';
import { LoggerNames, getLogger } from '../utils';

import type { OneKeyDeviceInfo } from '@onekeyfe/hd-transport';

const Log = getLogger(LoggerNames.Method);

export default class PromptWebDeviceAccess extends BaseMethod {
  init() {
    this.useDevice = false;
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  async run() {
    const { deviceSerialNumberFromUI } = this.payload;
    await TransportManager.configure();
    const isWebUsbEnv = DataManager.getSettings('env') === 'webusb';
    if (!isWebUsbEnv) {
      return Promise.reject(
        ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Not webusb environment')
      );
    }

    try {
      let device;
      let devicesDescriptor;

      // If serial number is provided, skip prompting user
      if (deviceSerialNumberFromUI) {
        // Manually construct device descriptor using provided serial number
        devicesDescriptor = [
          {
            path: deviceSerialNumberFromUI,
            device: { serialNumber: deviceSerialNumberFromUI },
            debug: true,
          },
        ];
      } else {
        // Otherwise prompt user to select a device
        device = await this.connector?.promptDeviceAccess();
        if (!device) {
          return await Promise.reject(
            ERRORS.TypedError(HardwareErrorCode.WebDevicePromptAccessError)
          );
        }

        if (isWebUsbEnv) {
          devicesDescriptor = [
            {
              path: (device as USBDevice).serialNumber ?? '',
              device,
              debug: true,
            },
          ];
        }
      }
      const { deviceList } = await DevicePool.getDevices(
        devicesDescriptor as unknown as OneKeyDeviceInfo[]
      );
      if (deviceList.length > 0) {
        return { device: deviceList[0].toMessageObject() };
      }
      return { device: null };
    } catch (error) {
      Log.debug(error);
      return Promise.reject(
        ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Please select the device to connect')
      );
    }
  }
}
