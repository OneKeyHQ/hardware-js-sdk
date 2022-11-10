import axios from 'axios';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { BaseMethod } from './BaseMethod';

export default class CheckBridgeStatus extends BaseMethod {
  init() {
    this.useDevice = false;
    this.useDevicePassphraseState = false;
  }

  async run() {
    return new Promise<boolean>((resolve, reject) => {
      axios
        .request({
          url: 'http://localhost:21320',
          method: 'POST',
          withCredentials: false,
          timeout: 3000,
        })
        .then(() => resolve(true))
        .catch(e => {
          if (e.code === 'ECONNABORTED') {
            reject(ERRORS.TypedError(HardwareErrorCode.BridgeTimeoutError));
          } else {
            resolve(false);
          }
        });
    });
  }
}
