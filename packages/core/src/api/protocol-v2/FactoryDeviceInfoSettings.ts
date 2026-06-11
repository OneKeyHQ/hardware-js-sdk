import { BaseMethod } from '../BaseMethod';

import type { FactoryDeviceInfoSettingsParams } from './helpers';

export default class FactoryDeviceInfoSettings extends BaseMethod<FactoryDeviceInfoSettingsParams> {
  init() {
    // Protocol V2 (Pro2) 专属方法，core 调度层统一做非 V2 设备守卫
    this.requireProtocolV2 = true;
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = {
      serial_no: this.payload.serial_no,
      serialNo: this.payload.serialNo,
      cpu_info: this.payload.cpu_info,
      cpuInfo: this.payload.cpuInfo,
      pre_firmware: this.payload.pre_firmware,
      preFirmware: this.payload.preFirmware,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('FactoryDeviceInfoSettings', 'Success', {
      serial_no: this.params.serial_no ?? this.params.serialNo,
      cpu_info: this.params.cpu_info ?? this.params.cpuInfo,
      pre_firmware: this.params.pre_firmware ?? this.params.preFirmware,
    });
    return Promise.resolve(res.message);
  }
}
