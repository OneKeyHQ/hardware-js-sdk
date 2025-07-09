import { LockDevice } from '@onekeyfe/hd-transport';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import semver from 'semver';
import { BaseMethod } from '../BaseMethod';
import { toHardened } from '../helpers/pathUtils';
import { DeviceFirmwareRange } from '../../types';
import { getDeviceFirmwareVersion, getMethodVersionRange } from '../../utils';

export default class DeviceUnlock extends BaseMethod<LockDevice> {
  init() {
    this.useDevicePassphraseState = false;
  }

  supportUnlockVersionRange(): DeviceFirmwareRange {
    return {
      pro: {
        min: '4.15.0',
      },
    };
  }

  async run() {
    const firmwareVersion = getDeviceFirmwareVersion(this.device.features)?.join('.');
    const versionRange = getMethodVersionRange(
      this.device.features,
      type => this.supportUnlockVersionRange()[type]
    );

    if (versionRange && semver.gte(firmwareVersion, versionRange.min)) {
      const res = await this.device.commands.typedCall('UnLockDevice', 'UnLockDeviceResponse');
      if (this.device.features) {
        this.device.features.unlocked = res.message.unlocked == null ? null : res.message.unlocked;
        this.device.features.unlocked_attach_pin =
          res.message.unlocked_attach_pin == null ? undefined : res.message.unlocked_attach_pin;
        this.device.features.passphrase_protection =
          res.message.passphrase_protection == null ? null : res.message.passphrase_protection;

        return Promise.resolve(this.device.features);
      }

      const featuresRes = await this.device.commands.typedCall('GetFeatures', 'Features');
      return Promise.resolve(featuresRes.message);
    }

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
