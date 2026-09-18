import { BaseMethod } from '../BaseMethod';
import { UI_REQUEST } from '../../constants/ui-request';

const FACTORY_LOCK_CHECK_A = 'a55a5aa5';
const FACTORY_LOCK_CHECK_B = '5aa5a55a';

export default class DeviceFactoryPermanentLock extends BaseMethod {
  getSupportedProtocols() {
    return ['V2'] as const;
  }

  init() {
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.unlockPolicy = 'none';
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.BOOTLOADER];
  }

  async run() {
    const res = await this.device.commands.typedCall('DeviceFactoryPermanentLock', 'Success', {
      check_a: FACTORY_LOCK_CHECK_A,
      check_b: FACTORY_LOCK_CHECK_B,
    });
    return res.message;
  }
}
