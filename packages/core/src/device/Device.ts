import EventEmitter from 'events';
import { Transport, OneKeyDeviceInfoWithSession as DeviceDescriptor } from '@onekeyfe/hd-transport';
import DeviceConnector from './DeviceConnector';

export class Device extends EventEmitter {
  /**
   * 通信管道
   */
  transport: Transport;
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
  deviceConnector: DeviceConnector;

  constructor(transport: Transport, descriptor: DeviceDescriptor) {
    super();
    this.transport = transport;
    this.originalDescriptor = descriptor;
    // TODO: Connector 可以设计成单例，重复创建有点啰嗦
    this.deviceConnector = new DeviceConnector(this.transport);
  }

  static fromDescriptor(transport: Transport, originalDescriptor: DeviceDescriptor) {
    const descriptor = { ...originalDescriptor, session: null };
    return new Device(transport, descriptor);
  }

  async connect() {
    let device;
    // 不存在 Session ID 创建连接
    if (!this.activitySessionID) {
      const devices = await this.deviceConnector.enumerate();
      device = devices?.connected?.find(k => k.path === this.originalDescriptor.path);
      if (!device) {
        return false;
      }
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
