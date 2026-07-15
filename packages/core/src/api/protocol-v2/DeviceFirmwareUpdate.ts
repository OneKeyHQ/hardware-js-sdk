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
        'DeviceFirmwareUpdateRequest',
        PROTOCOL_V2_FIRMWARE_UPDATE_RESPONSE_TYPES,
        {
          targets,
        },
        {
          ...PROTOCOL_V2_FIRMWARE_UPDATE_OPTIONS,
          onIntermediateResponse: (response: MessageFromOneKey) => {
            if (response.type !== 'DeviceFirmwareUpdateStatus') return;
            this.postMessage(
              createUiMessage(UI_REQUEST.FIRMWARE_PROGRESS, {
                device: this.device.toMessageObject() as KnownDevice,
                progress: 99,
                progressType: 'installingFirmware',
              })
            );
          },
        }
      );
      return res.message;
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
