import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { supportInputPinOnSoftware } from '../../utils/deviceFeaturesUtils';
import { BaseMethod } from '../BaseMethod';

export default class DeviceSupportFeatures extends BaseMethod {
  init() {}

  run() {
    if (!this.device.features)
      return Promise.reject(
        ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Device not initialized')
      );

    const inputPinOnSoftware = supportInputPinOnSoftware(this.device.features);
    return Promise.resolve({
      inputPinOnSoftware,
      device: this.device.toMessageObject(),
    });
  }
}
