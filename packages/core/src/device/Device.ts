import EventEmitter from 'events';
import { OneKeyDeviceInfoWithSession as DeviceDescriptor } from '@onekeyfe/hd-transport';
import DeviceConnector from './DeviceConnector';
import { DeviceCommands } from './DeviceCommands';
import { initLog, versionCompare } from '../utils';
import { parseCapabilities } from '../utils/deviceFeaturesUtils';
import { getFirmwareStatus, getRelease } from '../data-manager/FirmwareInfo';
import type { Features, DeviceFirmwareStatus, ReleaseInfo } from '../types';
import { getBLEFirmwareStatus, getBLERelease } from '../data-manager/BLEFirmwareInfo';

const Log = initLog('Device');
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

  /**
   * 固件命令
   */
  // @ts-expect-error: strictPropertyInitialization
  commands: DeviceCommands;

  /**
   * 设备信息
   */
  features?: Features;

  /**
   * 是否需要更新设备信息
   */
  featuresNeedsReload = false;

  /**
   * 固件状态
   */
  firmwareStatus?: DeviceFirmwareStatus;

  /**
   * 固件版本信息
   */
  firmwareRelease?: ReleaseInfo;

  /**
   * 蓝牙固件状态
   */
  bleFirmwareStatus?: DeviceFirmwareStatus;

  /**
   * 蓝牙固件版本信息
   * TODO: 完善蓝牙固件类型
   */
  bleFirmwareRelease?: any;

  /**
   * 执行 API 方法后是否保留 SessionID
   */
  keepSession = false;

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

  /**
   * Device connect
   * @returns {Promise<boolean>}
   */
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

  async acquire() {
    try {
      const sessionID = await this.deviceConnector?.acquire(
        this.originalDescriptor.path,
        this.originalDescriptor.session
      );
      console.log('Expected session id:', sessionID);
      this.activitySessionID = sessionID;
      this.updateDescriptor({ session: sessionID } as DeviceDescriptor);
      if (this.commands) {
        this.commands.dispose();
      }

      this.commands = new DeviceCommands(this, sessionID ?? '');
    } catch (error) {
      throw new Error(error);
    }
  }

  async release() {
    if (this.isUsedHere() && !this.keepSession && this.activitySessionID) {
      if (this.commands) {
        this.commands.dispose();
        if (this.commands.callPromise) {
          try {
            await this.commands.callPromise;
          } catch (error) {
            this.commands.callPromise = undefined;
          }
        }
      }
      try {
        await this.deviceConnector?.release(this.activitySessionID, false);
      } catch (err) {
        Log.error('[Device] release error: ', err);
      }
    }
  }

  async getFeatures() {
    const { message } = await this.commands.typedCall('GetFeatures', 'Features', {});
    this._updateFeatures(message);
  }

  _updateFeatures(feat: Features) {
    const capabilities = parseCapabilities(feat);
    feat.capabilities = capabilities;
    const version = [feat.major_version, feat.minor_version, feat.patch_version];
    const capabilitiesDidChange =
      this.features &&
      this.features.capabilities &&
      this.features.capabilities.join('') !== capabilities.join('');
    if (versionCompare(version, this.getVersion()) !== 0 || capabilitiesDidChange) {
      this.firmwareStatus = getFirmwareStatus(feat);
      this.firmwareRelease = getRelease(feat);
      this.bleFirmwareStatus = getBLEFirmwareStatus(feat);
      this.bleFirmwareRelease = getBLERelease(feat);
    }

    // GetFeatures doesn't return 'session_id'
    if (this.features && this.features.session_id && !feat.session_id) {
      feat.session_id = this.features.session_id;
    }
    feat.unlocked = feat.unlocked || true;

    this.features = feat;
    this.featuresNeedsReload = false;
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

  getVersion(): number[] {
    if (!this.features) return [];
    return [this.features.major_version, this.features.minor_version, this.features.patch_version];
  }

  getMode() {
    if (this.features?.bootloader_mode) return 'bootloader';
    if (!this.features?.initialized) return 'initialize';
    if (this.features?.no_backup) return 'seedless';
    return 'normal';
  }

  isUsed() {
    return typeof this.originalDescriptor.session === 'string';
  }

  isUsedHere() {
    return this.isUsed() && this.originalDescriptor.session === this.activitySessionID;
  }
}
