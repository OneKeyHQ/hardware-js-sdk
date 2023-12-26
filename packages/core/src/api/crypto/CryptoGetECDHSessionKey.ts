import { GetECDHSessionKey } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { BaseMethod } from '../BaseMethod';

export default class CryptoGetECDHSessionKey extends BaseMethod<GetECDHSessionKey> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

    // init params
    this.params = {
      identity: this.payload.identity,
      peer_public_key: this.payload.peer_public_key,
      ecdsa_curve_name: this.payload.ecdsa_curve_name,
    };
  }

  async run() {
    return this.device.commands.typedCall('GetECDHSessionKey', 'ECDHSessionKey', this.params);
  }
}
