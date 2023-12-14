import { NostrSignEvent as SignEvent } from '@onekeyfe/hd-transport';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { UI_REQUEST } from '../../constants/ui-request';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { validateEvent } from './helper';
import { bytesToHex, hexToBytes } from '../helpers/hexUtils';

export default class NostrSignEvent extends BaseMethod<SignEvent> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

    const { payload } = this;
    if (!validateEvent(payload.event)) {
      throw ERRORS.TypedError(
        HardwareErrorCode.CallMethodInvalidParameter,
        `Can't serialize event with wrong or missing properties`
      );
    }
    validateParams(payload, [{ name: 'path', required: true }]);
    const addressN = validatePath(payload.path, 5);

    this.params = {
      address_n: addressN,
      event: bytesToHex(Buffer.from(JSON.stringify(payload.event, null, 0), 'utf-8')),
    };
  }

  getVersionRange() {
    return {
      model_mini: {
        min: '3.6.0',
      },
      model_touch: {
        min: '4.6.0',
      },
    };
  }

  async run() {
    const { message } = await this.device.commands.typedCall(
      'NostrSignEvent',
      'NostrSignedEvent',
      this.params
    );

    try {
      const signedEvent = Buffer.from(hexToBytes(message.event)).toString('utf-8');
      const event = JSON.parse(signedEvent);
      return {
        path: serializedPath(this.params.address_n),
        rawTx: message.event,
        event,
      };
    } catch (e) {
      throw ERRORS.TypedError(HardwareErrorCode.CallMethodError, 'Failed to parse signed event', e);
    }
  }
}
