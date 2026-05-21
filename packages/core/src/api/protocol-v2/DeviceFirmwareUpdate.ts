import { BaseMethod } from '../BaseMethod';
import {
  PROTOCOL_V2_FIRMWARE_UPDATE_OPTIONS,
  PROTOCOL_V2_FIRMWARE_UPDATE_RESPONSE_TYPES,
  normalizeFirmwareTargets,
} from './helpers';

import type { DeviceFirmwareUpdateParams } from './helpers';

export default class DeviceFirmwareUpdate extends BaseMethod<DeviceFirmwareUpdateParams> {
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
    const targets = normalizeFirmwareTargets(this.params);
    const res = await this.device.commands.typedCall(
      'DeviceFirmwareUpdate',
      PROTOCOL_V2_FIRMWARE_UPDATE_RESPONSE_TYPES,
      {
        targets,
      },
      PROTOCOL_V2_FIRMWARE_UPDATE_OPTIONS
    );
    return Promise.resolve(res.message);
  }
}
