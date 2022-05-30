import { UI_REQUEST } from '../constants/ui-request';
import { Device } from '../device/Device';
import DeviceConnector from '../device/DeviceConnector';
import type { FirmwareRange } from '../types';
import { versionCompare } from '../utils';
import { getDeviceType } from '../utils/deviceFeaturesUtils';

export abstract class BaseMethod<Params = undefined> {
  responseID: number;

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

  connector?: DeviceConnector;

  /**
   * 是否需要使用设备
   */
  useDevice: boolean;

  firmwareRange: FirmwareRange;

  /**
   * 许可的设备模式
   */
  allowDeviceMode: string[];

  /**
   * 依赖的设备模式
   */
  requireDeviceMode: string[];

  constructor(message: { id?: number; payload: any }) {
    const { payload } = message;
    this.name = payload.method;
    this.payload = payload;
    this.responseID = message.id || 0;
    this.devicePath = payload.device?.path;
    this.useDevice = true;
    this.allowDeviceMode = [UI_REQUEST.INITIALIZE];
    this.requireDeviceMode = [];
    this.firmwareRange = {
      '1': { min: '1.0.0', max: '0' },
      '2': { min: '2.0.0', max: '0' },
    };
  }

  abstract init(): void;

  abstract run(): Promise<any>;

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

  dispose() {}
}
