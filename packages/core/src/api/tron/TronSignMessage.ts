import { TronMessageType } from '@onekeyfe/hd-transport';
import { createDeviceNotSupportMethodError } from '@onekeyfe/hd-shared';

import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { stripHexPrefix } from '../helpers/hexUtils';

import type { TronSignMessage as HardwareTronSignMessage } from '@onekeyfe/hd-transport';

export default class TronSignMessage extends BaseMethod<HardwareTronSignMessage> {
  private isLegacyMessageType = false;

  getSupportedProtocols() {
    return ['V1', 'V2'] as const;
  }

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];
    this.allowUsePreInitialize = true;

    // check payload
    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'messageHex', type: 'hexString', required: true },
      { name: 'messageType', type: 'string' },
    ]);

    const { path, messageHex } = this.payload;
    const addressN = validatePath(path, 3);

    this.isLegacyMessageType =
      this.payload.messageType === 'V1' || this.payload.messageType == null;

    const messageType = TronMessageType.V2;

    // init params
    this.params = {
      address_n: addressN,
      message: stripHexPrefix(messageHex),
      message_type: messageType,
    };
  }

  getVersionRange() {
    return {
      pro2: {
        min: '0.0.0',
      },
      model_mini: {
        min: '2.5.0',
      },
    };
  }

  getMessageV2VersionRange() {
    return {
      pro2: {
        min: '0.0.0',
      },
      pro: {
        min: '4.16.0',
      },
      touch: {
        min: '4.12.0',
      },
      classic1s: {
        min: '3.13.0',
      },
      classic: {
        min: '3.12.0',
      },
    };
  }

  async run() {
    if (this.isLegacyMessageType) {
      throw createDeviceNotSupportMethodError(
        'TronSignMessage',
        this.device.getCurrentFirmwareType()
      );
    }

    this.checkFeatureVersionLimit(
      () => this.params.message_type === TronMessageType.V2,
      () => this.getMessageV2VersionRange(),
      {
        strictCheckDeviceSupport: true,
      }
    );

    const response = await this.device.commands.typedCall(
      'TronSignMessage',
      'TronMessageSignature',
      {
        ...this.params,
      }
    );

    return Promise.resolve(response.message);
  }
}
