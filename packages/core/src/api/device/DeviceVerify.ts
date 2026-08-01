import { sha256 } from '@noble/hashes/sha256';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { bytesToHex } from '@noble/hashes/utils';

import { formatAnyHex } from '../helpers/hexUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams, validateResult } from '../helpers/paramsValidator';
import { DeviceModelToTypes } from '../../types';

import type { BixinVerifyDeviceRequest } from '@onekeyfe/hd-transport';
import type { DeviceVerifySignature } from '../../types';
import { UI_REQUEST } from '../../events';

export default class DeviceVerify extends BaseMethod<BixinVerifyDeviceRequest> {
  init() {
    this.useDevicePassphraseState = false;
    this.notAllowDeviceMode = [UI_REQUEST.BOOTLOADER, UI_REQUEST.INITIALIZE];

    // check payload
    validateParams(this.payload, [{ name: 'dataHex', type: 'hexString' }]);

    // init params
    this.params = {
      data: formatAnyHex(this.payload.dataHex),
    };
  }

  async run() {
    // For Classic、Mini device we use EthereumSignTypedData
    const deviceType = this.device.getCurrentDeviceType();
    let response: DeviceVerifySignature | undefined;

    if (DeviceModelToTypes.model_classic.includes(deviceType)) {
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

    validateResult(response, ['cert', 'signature']);

    if (response) return Promise.resolve(response);

    return Promise.reject(
      ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Device not support verify')
    );
  }
}
