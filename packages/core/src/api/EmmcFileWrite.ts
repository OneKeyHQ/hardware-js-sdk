import { RebootType } from '@onekeyfe/hd-transport';
import { validateParams } from './helpers/paramsValidator';
import { UI_REQUEST } from '../events/ui-request';
import { FirmwareUpdateBaseMethod } from './firmware/FirmwareUpdateBaseMethod';
import type { PROTO } from '../constants';

/**
 * 简单封装的 EMMC 文件写入方法
 * - 仅调用 emmcCommonUpdateProcess，将指定二进制内容写入到给定 emmc 路径
 */
type EmmcFileWriteParams = PROTO.FirmwareUpload & {
  /** 目标写入路径（需以 `0:` 开头，例如 `0:updates/firmware.bin`） */
  filePath: string;
};

export default class EmmcFileWrite extends FirmwareUpdateBaseMethod<EmmcFileWriteParams> {
  init() {
    const { payload } = this;
    // 仅做基本参数校验，不引入任何接口条件判断
    validateParams(payload, [
      { name: 'payload', type: 'buffer', required: true },
      { name: 'filePath', type: 'string', required: true },
    ]);

    this.allowDeviceMode = [UI_REQUEST.BOOTLOADER, UI_REQUEST.NOT_INITIALIZE];
    this.useDevicePassphraseState = false;

    this.params = {
      payload: payload.payload,
      filePath: payload.filePath,
    };
  }

  async run() {
    const { payload, filePath } = this.params;
    await this.enterBootloaderMode();
    await this.emmcCommonUpdateProcess({ payload, filePath });
    // 写入完成后执行正常重启
    try {
      await this.reboot(RebootType.Normal);
    } catch (e) {
      // 重启失败不影响写入结果，保守记录但不抛出
    }

    return {
      filePath,
    };
  }
}
