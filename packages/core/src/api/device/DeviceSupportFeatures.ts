import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import {
  supportInputPinOnSoftware,
  supportModifyHomescreen,
} from '../../utils/deviceFeaturesUtils';
import { BaseMethod } from '../BaseMethod';

export default class DeviceSupportFeatures extends BaseMethod {
  init() {
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  run() {
    if (!this.device.features)
      return Promise.reject(
        ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Device not initialized')
      );

    const inputPinOnSoftware = supportInputPinOnSoftware(this.device.features);
    const modifyHomescreen = supportModifyHomescreen(this.device.features);
    return Promise.resolve({
      inputPinOnSoftware,
      modifyHomescreen,
      device: this.device.toMessageObject(),
    });
  }
}
