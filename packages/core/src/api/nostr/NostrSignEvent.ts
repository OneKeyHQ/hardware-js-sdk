import { NostrSignEvent as SignEvent } from '@onekeyfe/hd-transport';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { UI_REQUEST } from '../../constants/ui-request';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { validateEvent } from './helper';

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
      event: payload.event,
    };
  }

  getVersionRange() {
    return {
      model_mini: {
        min: '2.9.0',
      },
    };
  }

  async run() {
    const { message } = await this.device.commands.typedCall(
      'NostrSignEvent',
      'NostrSignedEvent',
      this.params
    );

    return {
      path: serializedPath(this.params.address_n),
      signature: message.event,
    };
  }
}
