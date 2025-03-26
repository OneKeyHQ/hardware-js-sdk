import { Deferred } from '@onekeyfe/hd-shared';
import { validateParams } from './helpers/paramsValidator';
import { BaseMethod } from './BaseMethod';
import { UI_REQUEST } from '../constants/ui-request';

export default class FirmwareUpdateEmmc extends BaseMethod<{
  path: string;
}> {
  checkPromise: Deferred<any> | null = null;

  init() {
    this.skipForceUpdateCheck = true;
    this.notAllowDeviceMode = [UI_REQUEST.BOOTLOADER, UI_REQUEST.INITIALIZE];
    this.requireDeviceMode = [];
    this.useDevicePassphraseState = false;

    const { payload } = this;

    validateParams(payload, [{ name: 'path', type: 'string' }]);

    this.params = {
      path: payload.path,
    };
  }

  async run() {
    return this.device.getCommands().typedCall('FirmwareUpdateEmmc', 'Success', {
      path: '0:updates',
      reboot_on_success: true,
    });

    // TODO: 每三秒轮询一次，init
  }
}
