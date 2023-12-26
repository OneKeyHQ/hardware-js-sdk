import { BaseMethod } from '../BaseMethod';
import { updateResource } from '../firmware/uploadFirmware';

export default class ResourceUpdate extends BaseMethod<any> {
  init() {
    this.useDevicePassphraseState = false;

    this.params = {
      name: this.payload.name,
      data: this.payload.data,
    };
  }

  async run() {
    await updateResource(
      this.device.commands.typedCall.bind(this.device.commands),
      this.payload.name,
      this.payload.data
    );
    return Promise.resolve(true);
  }
}
