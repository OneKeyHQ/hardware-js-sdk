import { BaseMethod } from '../BaseMethod';
import { isProtocolV2DeviceDisconnectedError, normalizeFirmwareTargets } from './helpers';

import type { DeviceFirmwareUpdateParams } from './helpers';

export default class DeviceFirmwareUpdate extends BaseMethod<DeviceFirmwareUpdateParams> {
  getSupportedProtocols() {
    return ['V2'] as const;
  }

  init() {
    // Protocol V2 (Pro2) only; Core rejects non-V2 devices.
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
    try {
      await this.device.commands.typedCall('DeviceFirmwareUpdateStage', 'Success', { targets });
      await this.device.commands.call(
        'DeviceFirmwareUpdateRequest',
        {},
        { returnAfterWrite: true }
      );
      return { message: 'Device firmware update started' };
    } catch (error) {
      if (isProtocolV2DeviceDisconnectedError(error)) {
        return {
          message: 'Device firmware update started',
        };
      }
      throw error;
    }
  }
}
