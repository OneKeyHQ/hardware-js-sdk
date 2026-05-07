import { BaseMethod } from '../BaseMethod';
import { PROTOCOL_V2_FIRMWARE_UPDATE_OPTIONS, normalizeFirmwareTargets } from './helpers';

import type { DevFirmwareUpdateParams } from './helpers';

export default class DevFirmwareUpdate extends BaseMethod<DevFirmwareUpdateParams> {
  init() {
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = {
      targets: this.payload.targets,
      targetId: this.payload.targetId,
      target_id: this.payload.target_id,
      path: this.payload.path,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall(
      'DevFirmwareUpdate',
      'Success',
      {
        targets: normalizeFirmwareTargets(this.params),
      },
      PROTOCOL_V2_FIRMWARE_UPDATE_OPTIONS
    );
    return Promise.resolve(res.message);
  }
}
