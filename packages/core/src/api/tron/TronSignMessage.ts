import {
  TronSignMessage as HardwareTronSignMessage,
  TronMessageType,
} from '@onekeyfe/hd-transport';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { stripHexPrefix } from '../helpers/hexUtils';

export default class TronSignMessage extends BaseMethod<HardwareTronSignMessage> {
  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];

    // check payload
    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'messageHex', type: 'hexString', required: true },
      { name: 'messageType', type: 'string' },
    ]);

    const { path, messageHex } = this.payload;
    const addressN = validatePath(path, 3);

    if (this.payload.messageType === 'V1' || this.payload.messageType == null) {
      throw ERRORS.TypedError(
        HardwareErrorCode.DeviceNotSupportMethod,
        'not support tron message v1'
      );
    }

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
      model_mini: {
        min: '2.5.0',
      },
    };
  }

  getMessageV2VersionRange() {
    return {
      pro: {
        min: '4.16.0',
      },
      classic1s: {
        min: '3.13.0',
      },
    };
  }

  async run() {
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
