import { BaseMethod } from '../BaseMethod';
import {
  PROTOCOL_V2_FIRMWARE_UPDATE_OPTIONS,
  PROTOCOL_V2_FIRMWARE_UPDATE_RESPONSE_TYPES,
  isProtocolV2DeviceDisconnectedError,
  normalizeFirmwareTargets,
} from './helpers';
import { UI_REQUEST, createUiMessage } from '../../events/ui-request';

import type { KnownDevice } from '../../types';
import type { MessageFromOneKey } from '@onekeyfe/hd-transport';
import type { DeviceFirmwareUpdateParams } from './helpers';

export default class DeviceFirmwareUpdate extends BaseMethod<DeviceFirmwareUpdateParams> {
  init() {
    // Protocol V2 (Pro2) 专属方法，core 调度层统一做非 V2 设备守卫
    this.requireProtocolV2 = true;
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
      const res = await this.device.commands.typedCall(
        'DevFirmwareUpdate',
        PROTOCOL_V2_FIRMWARE_UPDATE_RESPONSE_TYPES,
        {
          targets,
        },
        {
          ...PROTOCOL_V2_FIRMWARE_UPDATE_OPTIONS,
          onIntermediateResponse: (response: MessageFromOneKey) => {
            if (response.type !== 'DevFirmwareInstallProgress') return;
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
    } catch (error) {
      if (isProtocolV2DeviceDisconnectedError(error)) {
        return Promise.resolve({
          message: 'Device firmware update started',
        });
      }
      throw error;
    }
  }
}
