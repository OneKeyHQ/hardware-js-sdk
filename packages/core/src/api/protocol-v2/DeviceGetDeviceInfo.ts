import { BaseMethod } from '../BaseMethod';
import { buildTargets, buildTypes } from './helpers';

import type { DeviceGetDeviceInfoParams } from './helpers';

export default class DeviceGetDeviceInfo extends BaseMethod<DeviceGetDeviceInfoParams> {
  init() {
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = {
      targets: this.payload.targets,
      types: this.payload.types,
      targetHw: this.payload.targetHw,
      targetFw: this.payload.targetFw,
      targetBt: this.payload.targetBt,
      targetSe1: this.payload.targetSe1,
      targetSe2: this.payload.targetSe2,
      targetSe3: this.payload.targetSe3,
      targetSe4: this.payload.targetSe4,
      targetStatus: this.payload.targetStatus,
      includeVersion: this.payload.includeVersion,
      includeBuildId: this.payload.includeBuildId,
      includeHash: this.payload.includeHash,
      includeSpecific: this.payload.includeSpecific,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('DeviceGetDeviceInfo', 'DeviceInfo', {
      targets: buildTargets(this.params),
      types: buildTypes(this.params),
    });
    return Promise.resolve(res.message);
  }
}
