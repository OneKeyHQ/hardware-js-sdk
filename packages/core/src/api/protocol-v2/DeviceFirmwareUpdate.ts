import { BaseMethod } from '../BaseMethod';
import {
  PROTOCOL_V2_FIRMWARE_UPDATE_OPTIONS,
  PROTOCOL_V2_FIRMWARE_UPDATE_RESPONSE_TYPES,
  normalizeFirmwareTargets,
} from './helpers';
import { UI_REQUEST, createUiMessage } from '../../events/ui-request';
import type { KnownDevice } from '../../types';

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
      {
        ...PROTOCOL_V2_FIRMWARE_UPDATE_OPTIONS,
        onIntermediateResponse: response => {
          if (response.type !== 'DeviceFirmwareInstallProgress') return;
          const progress = Number(response.message?.progress);
          if (!Number.isFinite(progress)) return;
          this.postMessage(
            createUiMessage(UI_REQUEST.FIRMWARE_PROGRESS, {
              device: this.device.toMessageObject() as KnownDevice,
              progress: Math.min(Math.max(progress, 0), 100),
              progressType: 'installingFirmware',
            })
          );
        },
      }
    );
    return Promise.resolve(res.message);
  }
}
