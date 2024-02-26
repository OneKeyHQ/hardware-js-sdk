import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { FirmwareUpload } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';

export default class FirmwareUploadTest extends BaseMethod<FirmwareUpload> {
  init() {
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
    this.params = {
      payload: new ArrayBuffer(0),
    };
  }

  async run() {
    return this.device.getCommands().typedCall('FirmwareUpload', 'Success', this.params);
  }
}
