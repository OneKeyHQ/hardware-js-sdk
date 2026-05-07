import { BaseMethod } from '../BaseMethod';

export default class GetProtoVersion extends BaseMethod {
  init() {
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = undefined;
  }

  async run() {
    const res = await this.device.commands.typedCall('GetProtoVersion', 'ProtoVersion', {});
    return Promise.resolve(res.message);
  }
}
