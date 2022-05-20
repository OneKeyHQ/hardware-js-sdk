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
  deviceConnector?: DeviceConnector | null = null;

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
    // eslint-disable-next-line no-async-promise-executor
    return new Promise<boolean>(async resolve => {
      // 不存在 Session ID 或存在 Session ID 但设备在别处使用，都需要 acquire 获取最新 sessionID
      if (!this.activitySessionID || (!this.isUsedHere() && this.originalDescriptor)) {
        try {
          await this.acquire();
          resolve(true);
        } catch (error) {
          resolve(error);
        }
        return;
      }
      if (this.isUsedHere()) {
        resolve(true);
        return;
      }
      resolve(false);
    });
  }

  isUsed() {
    return typeof this.originalDescriptor.session === 'string';
  }

  isUsedHere() {
    return this.isUsed() && this.originalDescriptor.session === this.activitySessionID;
  }

  async acquire() {
    try {
      const sessionID = await this.deviceConnector?.acquire(
        this.originalDescriptor.path,
        this.originalDescriptor.session
      );
      console.log('Expected session id:', sessionID);
      this.activitySessionID = sessionID;
      this.updateDescriptor({ session: sessionID } as DeviceDescriptor);
    } catch (error) {
      throw new Error(error);
    }
  }

  /**
   * 暂时只在 acquire 后更新 Session ID
   * 后续看是否有需要依据 listen 返回结果更新
   * @param descriptor
   */
  updateDescriptor(descriptor: DeviceDescriptor) {
    const originalSession = this.originalDescriptor.session;
    const upcomingSession = descriptor.session;

    if (originalSession !== upcomingSession) {
      this.originalDescriptor.session = upcomingSession;
    }
  }
}
