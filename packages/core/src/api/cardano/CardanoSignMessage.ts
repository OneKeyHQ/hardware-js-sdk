import { BaseMethod } from '../BaseMethod';
import { PROTO } from '../../constants';
import { UI_REQUEST } from '../../constants/ui-request';
import { validateParams } from '../helpers/paramsValidator';
import { validatePath } from '../helpers/pathUtils';
import { CardanoSignMessageParams } from '../../types/api/cardanoSignMessage';

export default class CardanoSignMessage extends BaseMethod<CardanoSignMessageParams> {
  hasBundle?: boolean;

  isCheck?: boolean;

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];

    const { payload } = this;
    validateParams(payload, [
      { name: 'path', type: 'string', required: true },
      { name: 'message', type: 'string', required: true },
      { name: 'derivationType', type: 'number' },
      { name: 'networkId', type: 'number', required: true },
      { name: 'addressType', type: 'number' },
    ]);

    const addressN = validatePath(payload.path, 3);

    this.params = {
      address_n: addressN,
      message: payload.message,
      derivation_type:
        typeof payload.derivationType !== 'undefined'
          ? payload.derivationType
          : PROTO.CardanoDerivationType.ICARUS,
      network_id: payload.networkId,
      address_type: payload.addressType,
    };
  }

  getVersionRange() {
    return {
      model_touch: {
        min: '4.10.0',
      },
    };
  }

  getAddressTypeVersionRange() {
    return {
      pro: {
        min: '4.9.3',
      },
    };
  }

  async run() {
    this.checkFeatureVersionLimit(
      () => this.params.address_type !== null && this.params.address_type !== undefined,
      () => this.getAddressTypeVersionRange()
    );

    const res = await this.device.commands.typedCall(
      'CardanoSignMessage',
      'CardanoMessageSignature',
      this.params
    );

    return res.message;
  }
}
