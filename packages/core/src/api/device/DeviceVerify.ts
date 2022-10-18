import { sha256 } from '@noble/hashes/sha256';
import { BixinVerifyDeviceRequest } from '@onekeyfe/hd-transport';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { bytesToHex } from '@noble/hashes/utils';
import { formatAnyHex } from '../helpers/hexUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { getDeviceType } from '../../utils';
import type { DeviceVerifySignature } from '../../types';

export default class DeviceVerify extends BaseMethod<BixinVerifyDeviceRequest> {
  init() {
    this.useDevicePassphraseState = false;

    // check payload
    validateParams(this.payload, [{ name: 'dataHex', type: 'hexString' }]);

    // init params
    this.params = {
      data: formatAnyHex(this.payload.dataHex),
    };
  }

  async run() {
    // For Classic、Mini device we use EthereumSignTypedData
    const deviceType = getDeviceType(this.device.features);
    let response: DeviceVerifySignature | undefined;

    if (deviceType === 'classic') {
      const res = await this.device.commands.typedCall(
        'BixinVerifyDeviceRequest',
        'BixinVerifyDeviceAck',
        {
          ...this.params,
          data: bytesToHex(sha256(this.params.data)),
        }
      );
      response = res.message;
    } else {
      const signatureRes = await this.device.commands.typedCall(
        'SESignMessage',
        'SEMessageSignature',
        {
          message: this.params.data,
        }
      );
      const certRes = await this.device.commands.typedCall('ReadSEPublicCert', 'SEPublicCert');
      response = {
        cert: certRes.message.public_cert,
        signature: signatureRes.message.signature,
      };
    }

    if (response) return Promise.resolve(response);

    return Promise.reject(
      ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Device not support verify')
    );
  }
}
