import { BaseMethod } from '../BaseMethod';

export default class ProtocolInfoRequest extends BaseMethod {
  getSupportedProtocols() {
    return ['V2'] as const;
  }

  init() {
    // Protocol V2 (Pro2) only; Core rejects non-V2 devices.
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = undefined;
  }

  async run() {
    const res = await this.device.commands.typedCall('ProtocolInfoRequest', 'ProtocolInfo', {
      eventless_wallet_session: true,
    });
    return Promise.resolve(res.message);
  }
}
