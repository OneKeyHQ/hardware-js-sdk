import { BaseMethod } from '../BaseMethod';

export default class DeviceGetFirmwareUpdateStatus extends BaseMethod {
  init() {
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = undefined;
  }

  async run() {
    const res = await this.device.commands.typedCall(
      'DevGetFirmwareUpdateStatus',
      'DevFirmwareUpdateStatus',
      {}
    );
    return Promise.resolve(res.message);
  }
}
