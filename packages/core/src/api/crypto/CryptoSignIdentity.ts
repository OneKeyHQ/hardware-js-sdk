import { SignIdentity } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';

export default class CryptoSignIdentity extends BaseMethod<SignIdentity> {
  hasBundle = false;

  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

    // init params
    this.params = {
      identity: this.payload.identity,
      challenge_hidden: this.payload.challenge_hidden,
      challenge_visual: this.payload.challenge_visual,
      ecdsa_curve_name: this.payload.ecdsa_curve_name,
    };
  }

  async run() {
    return this.device.commands.typedCall('SignIdentity', 'ECDHSessionKey', this.params);
  }
}
