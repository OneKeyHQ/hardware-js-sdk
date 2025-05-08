import { Features, MessageKey } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../constants/ui-request';
import { getSupportMessageVersion } from '../utils/deviceFeaturesUtils';
import { BaseMethod } from './BaseMethod';
import { cherryPickFeaturesParams } from '../device/utils';

export default class GetOnekeyFeatures extends BaseMethod {
  init() {
    this.notAllowDeviceMode = [
      ...this.notAllowDeviceMode,
      UI_REQUEST.INITIALIZE,
      UI_REQUEST.BOOTLOADER,
    ];
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  async run() {
    const { messageVersion } = getSupportMessageVersion(this.device.features);
    let message: Features;
    if (messageVersion === 'latest') {
      const v2Res = await this.device.commands.typedCall('GetFeatures', 'Features', {
        ok_dev_info_req: cherryPickFeaturesParams({ factory: true, normal: true }),
      });
      message = v2Res.message;
    } else {
      const v1Res = (await this.device.commands.typedCall(
        'OnekeyGetFeatures' as MessageKey,
        'OnekeyFeatures' as MessageKey
      )) as any;
      message = v1Res.message;
    }
    return Promise.resolve(message);
  }
}
