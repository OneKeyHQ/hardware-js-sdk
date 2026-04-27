import { BaseMethod } from './BaseMethod';

export type DirListParams = {
  path: string;
};

export default class DirList extends BaseMethod<DirListParams> {
  init() {
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = { path: this.payload.path };
  }

  async run() {
    const res = await (this.device.commands as any).call('DirList', { path: this.params.path });
    return Promise.resolve(res.message);
  }
}
