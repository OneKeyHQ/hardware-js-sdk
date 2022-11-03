import { AptosSignMessage as HardwareAptosSignMessage } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { AptosMessageSignature, AptosSignMessageParams } from '../../types';

export default class AptosSignMessage extends BaseMethod<HardwareAptosSignMessage> {
  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.INITIALIZE];

    // check payload
    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'payload', type: 'object', required: true },
    ]);

    const { path, payload } = this.payload as AptosSignMessageParams;
    const addressN = validatePath(path, 3);

    validateParams(payload, [
      { name: 'address', type: 'string' },
      { name: 'chainId', type: 'string' },
      { name: 'application', type: 'string' },
      { name: 'nonce', type: 'string', required: true },
      { name: 'message', type: 'string', required: true },
    ]);

    // init params
    this.params = {
      address_n: addressN,
      payload: {
        address: payload.address,
        chain_id: payload.chainId,
        application: payload.application,
        nonce: payload.nonce,
        message: payload.message,
      },
    };
  }

  getVersionRange() {
    return {
      model_mini: {
        min: '2.6.0',
      },
    };
  }

  async run() {
    let fullMessage = 'APTOS\n';
    if (this.params.payload.address) {
      fullMessage += `address: ${this.params.payload.address}\n`;
    }
    if (this.params.payload.application) {
      fullMessage += `application: ${this.params.payload.application}\n`;
    }
    if (this.params.payload.chain_id) {
      fullMessage += `chainId: ${this.params.payload.chain_id}\n`;
    }
    fullMessage += `message: ${this.params.payload.message}\n`;
    fullMessage += `nonce: ${this.params.payload.nonce}`;

    const res = await this.device.commands.typedCall('AptosSignMessage', 'AptosMessageSignature', {
      ...this.params,
    });

    const { address, signature } = res.message;

    return Promise.resolve<AptosMessageSignature>({
      path: serializedPath(this.params.address_n),
      address,
      signature,
      fullMessage,
    });
  }
}
