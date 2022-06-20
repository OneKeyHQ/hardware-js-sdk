import { UI_REQUEST } from '../constants/ui-request';
import { Device } from '../device/Device';
import DeviceConnector from '../device/DeviceConnector';
import { DeviceFirmwareRange } from '../types';

export abstract class BaseMethod<Params = undefined> {
  responseID: number;

  // @ts-expect-error
  device: Device;

  // @ts-expect-error
  params: Params;

  /**
   * USB: onekey_serial or serial_no
   * iOS: uuid
   * Android: MAC address
   */
  connectId?: string;

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
    this.connectId = payload.connectId || '';
    this.useDevice = true;
    this.allowDeviceMode = [UI_REQUEST.INITIALIZE];
    this.requireDeviceMode = [];
  }

  abstract init(): void;

  abstract run(): Promise<any>;

  getVersionRange(): DeviceFirmwareRange {
    return {};
  }

  setDevice(device: Device) {
    this.device = device;
    this.connectId = device.originalDescriptor.path;
  }

  dispose() {}
}
