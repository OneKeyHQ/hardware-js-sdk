import { UI_REQUEST } from '../constants/ui-request';
import { Device } from '../device/Device';
import type { FirmwareRange } from '../types';
import { versionCompare } from '../utils';
import { getDeviceType } from '../utils/deviceFeaturesUtils';

export abstract class BaseMethod<Params = undefined> {
  // @ts-expect-error
  device: Device;

  // @ts-expect-error
  params: Params;

  devicePath?: string;

  deviceState?: string;

  /**
   * method name
   */
  name: string;

  /**
   * 请求携带参数
   */
  payload: Record<string, any>;

  firmwareRange: FirmwareRange;

  /**
   * 许可的设备模式
   */
  allowDeviceMode: string[];

  /**
   * 依赖的设备模式
   */
  requireDeviceMode: string[];

  constructor(payload: Record<string, any>) {
    this.name = payload.method;
    this.payload = payload;
    this.devicePath = payload.device?.path;
    this.allowDeviceMode = [];
    this.requireDeviceMode = [];
    this.firmwareRange = {
      '1': { min: '1.0.0', max: '0' },
      '2': { min: '2.0.0', max: '0' },
    };
  }

  // eslint-disable-next-line class-methods-use-this
  run() {
    return Promise.resolve({ code: 200 });
  }

  setDevice(device: Device) {
    this.device = device;
    this.devicePath = device.originalDescriptor.path;
  }

  checkFirmwareRange() {
    const { device } = this;
    if (!device.features) return;
    const version = device.getVersion();
    const model = version[0] as 1 | 2;
    const range = this.firmwareRange[model];

    if (device.firmwareStatus === 'none') {
      return UI_REQUEST.FIRMWARE_NOT_INSTALLED;
    }

    if (range.min === '0') {
      return UI_REQUEST.FIRMWARE_NOT_SUPPORTED;
    }

    if (device.firmwareStatus === 'required' || versionCompare(version, range.min) < 0) {
      return UI_REQUEST.FIRMWARE_OLD;
    }

    if (range.max !== '0' && versionCompare(version, range.max) > 0) {
      return UI_REQUEST.FIRMWARE_NOT_COMPATIBLE;
    }
  }

  checkDeviceType() {
    const { device } = this;
    if (!device.features) return;
    const deviceType = getDeviceType(device.features);
    if (!['mini', 'classic'].includes(deviceType)) {
      return UI_REQUEST.NOT_USE_ONEKEY_DEVICE;
    }
  }

  // eslint-disable-next-line class-methods-use-this
  dispose() {}
}
