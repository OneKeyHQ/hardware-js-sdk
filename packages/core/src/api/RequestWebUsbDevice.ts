import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { BaseMethod } from './BaseMethod';
import TransportManager from '../data-manager/TransportManager';
import { DataManager } from '../data-manager';
import { DevicePool } from '../device/DevicePool';

export default class RequestWebUsbDevice extends BaseMethod {
  init() {
    this.useDevice = false;
  }

  async run() {
    await TransportManager.configure();

    const env = DataManager.getSettings('env');
    if (env !== 'webusb') {
      return Promise.reject(
        ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Not webusb environment')
      );
    }

    const transport = TransportManager.getTransport();

    try {
      const device = (await transport.requestDevice()) as any;
      if (!device) {
        return await Promise.reject(
          ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Please select the device to connect')
        );
      }

      const deviceDiff = await this.connector?.enumerate();
      const devicesDescriptor = deviceDiff?.descriptors ?? [];
      const { deviceList } = await DevicePool.getDevices(devicesDescriptor);
      const _device = deviceList.find(d => d.originalDescriptor.path === device.serialNumber);
      if (_device) {
        return { device: _device.toMessageObject() };
      }

      return await Promise.reject(
        ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Please select the device to connect')
      );
    } catch (error) {
      console.log(error);
      return Promise.reject(
        ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Please select the device to connect')
      );
    }
  }
}
