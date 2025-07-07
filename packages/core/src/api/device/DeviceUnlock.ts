import { LockDevice } from '@onekeyfe/hd-transport';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { BaseMethod } from '../BaseMethod';
import { toHardened } from '../helpers/pathUtils';

export default class DeviceUnlock extends BaseMethod<LockDevice> {
  init() {
    this.useDevicePassphraseState = false;
  }

  async run() {
    const { type } = await this.device.commands.typedCall('GetAddress', 'Address', {
      address_n: [toHardened(44), toHardened(1), toHardened(0), 0, 0],
      coin_name: 'Testnet',
      script_type: 'SPENDADDRESS',
      show_display: false,
    });

    // @ts-expect-error
    if (type === 'CallMethodError') {
      throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Get the passphrase state error');
    }
    const res = await this.device.commands.typedCall('GetFeatures', 'Features');
    return Promise.resolve(res.message);
  }
}
