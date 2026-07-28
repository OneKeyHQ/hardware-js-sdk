import { BaseMethod } from './BaseMethod';
import {
  validateOptionalNonNegativeInteger,
  validateProtocolV2FilesystemPath,
} from './helpers/filesystemValidation';

export type PathInfoParams = {
  path: string;
  timeoutMs?: number | string;
};

export default class PathInfo extends BaseMethod<PathInfoParams> {
  getSupportedProtocols() {
    return ['V2'] as const;
  }

  init() {
    // Protocol V2 (Pro2) only; Core rejects non-V2 devices.
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = {
      path: validateProtocolV2FilesystemPath(this.payload.path, 'path', {
        allowVolumeRoot: true,
      }),
      timeoutMs: validateOptionalNonNegativeInteger(this.payload.timeoutMs, 'timeoutMs'),
    };
  }

  async run() {
    const timeoutMs =
      this.params.timeoutMs === undefined ? undefined : Number(this.params.timeoutMs);
    const res = await this.device.commands.typedCall(
      'FilesystemPathInfoQuery',
      'FilesystemPathInfo',
      {
        path: this.params.path,
      },
      {
        timeoutMs,
      }
    );
    return Promise.resolve(res.message);
  }
}
