import { BaseMethod } from './BaseMethod';

export type PathInfoParams = {
  path: string;
};

export default class PathInfo extends BaseMethod<PathInfoParams> {
  init() {
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = { path: this.payload.path };
  }

  async run() {
    const res = await (this.device.commands as any).call('FilesystemPathInfoQuery', {
      path: this.params.path,
    });
    return Promise.resolve(res.message);
  }
}
