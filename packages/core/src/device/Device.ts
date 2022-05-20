import EventEmitter from 'events';
import { OneKeyDeviceInfoWithSession as DeviceDescriptor } from '@onekeyfe/hd-transport';
import DeviceConnector from './DeviceConnector';

export class Device extends EventEmitter {
  /**
   * 设备标识对象
   */
  originalDescriptor: DeviceDescriptor;

  /**
   * 当前 Session ID
   */
  activitySessionID?: string | null;

  /**
   * 通信管道，向设备发送请求
   */
  deviceConnector: DeviceConnector | null = null;

  constructor(descriptor: DeviceDescriptor) {
    super();
    this.originalDescriptor = descriptor;
  }

  static fromDescriptor(originalDescriptor: DeviceDescriptor) {
    const descriptor = { ...originalDescriptor, session: null };
    return new Device(descriptor);
  }

  // TODO: Device TO Message Object 返回给前端
  // eslint-disable-next-line class-methods-use-this
  toMessageObject() {
    // empty
  }

  connect() {
    let device;
    // 不存在 Session ID 创建连接
    if (!this.activitySessionID) {
      return false;
    }
    // 存在 Session ID 不可用则获取新的 Session I
    if (!this.isUsedHere() && this.originalDescriptor) {
      // TODO: acquire
    }
    // 存在 Session ID 当前是否可用
    if (this.isUsedHere()) {
      return true;
    }
    return false;
  }

  isUsed() {
    return typeof this.originalDescriptor.session === 'string';
  }

  isUsedHere() {
    return this.isUsed() && this.originalDescriptor.session === this.activitySessionID;
  }
}
