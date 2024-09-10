import {
  type BIP32Address,
  GetPublicKeyMultiple as HardwareGetPublicKeyMultiple,
} from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';
import { validatePath } from '../helpers/pathUtils';

export default class GetPublicKeyMultiple extends BaseMethod<HardwareGetPublicKeyMultiple> {
  init() {
    this.useDevicePassphraseState = false;

    const addressesN: BIP32Address[] = this.payload.addresses.map((address: string) => ({
      address_n: validatePath(address, 3),
    }));

    this.params = {
      addresses: addressesN,
      ecdsa_curve_name: this.payload.ecdsa_curve_name,
      show_display: this.payload.show_display,
      coin_name: this.payload.coin_name,
      script_type: this.payload.script_type,
      ignore_xpub_magic: this.payload.ignore_xpub_magic,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('GetPublicKeyMultiple', 'PublicKeyMultiple', {
      ...this.params,
    });

    return Promise.resolve(res.message);
  }
}
