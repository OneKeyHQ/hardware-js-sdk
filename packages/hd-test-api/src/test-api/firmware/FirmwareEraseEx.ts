import { CoreExtensionBaseMethod as BaseMethod } from '@onekeyfe/hd-core';

type Params = {
  binary?: ArrayBuffer;
  version?: number[];
  updateType: 'firmware' | 'ble';
};

export default class FirmwareEraseEx extends BaseMethod<Params> {
  init() {
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  async run() {
    return this.device.getCommands().typedCall('FirmwareErase_ex', 'Success');
  }
}
