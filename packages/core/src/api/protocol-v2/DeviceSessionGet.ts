import { BaseMethod } from '../BaseMethod';

export type DeviceSessionGetParams = {
  sessionId?: string;
};

export default class DeviceSessionGet extends BaseMethod<DeviceSessionGetParams> {
  init() {
    this.requireProtocolV2 = true;
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
    this.params = {
      sessionId: this.payload.sessionId,
    };
  }

  async run() {
    const payload = this.params.sessionId ? { session_id: this.params.sessionId } : {};
    const { message } = await this.device.commands.typedCall(
      'DeviceSessionGet',
      'DeviceSession',
      payload
    );
    return message;
  }
}
