import EventEmitter from 'events';
import { OneKeyDeviceInfoWithSession as DeviceDescriptor } from '@onekeyfe/hd-transport';
import DeviceConnector from './DeviceConnector';
import { DeviceCommands } from './DeviceCommands';
import { initLog, versionCompare, Deferred, create as createDeferred } from '../utils';
import { parseCapabilities } from '../utils/deviceFeaturesUtils';
import { getFirmwareStatus, getRelease } from '../data-manager/FirmwareInfo';
import type { Features, DeviceFirmwareStatus, ReleaseInfo } from '../types';
import { getBLEFirmwareStatus, getBLERelease } from '../data-manager/BLEFirmwareInfo';
import { UI_REQUEST } from '../constants/ui-request';
import { ERRORS } from '../constants';

type RunOptions = {
  keepSession?: boolean;
  useEmptyPassphrase?: boolean;
};

const parseRunOptions = (options?: RunOptions): RunOptions => {
  if (!options) options = {};
  return options;
};

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

  runPromise?: Deferred<void> | null;

  instance = 0;

  internalState: string[] = [];

  loaded = false;

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
      Log.debug('Expected session id:', sessionID);
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

  getInternalState() {
    return this.internalState[this.instance];
  }

  async initialize() {
    let payload: any;
    if (this.features) {
      const internalState = this.getInternalState();
      payload = {};
      if (internalState) {
        payload.session_id = internalState;
      }
    }

    const { message } = await this.commands.typedCall('Initialize', 'Features', payload);
    this._updateFeatures(message);
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

  async run(fn?: () => Promise<void>, options?: RunOptions) {
    if (this.runPromise) {
      Log.error('[Device] run error:', 'Device is running');
      throw ERRORS.TypedError('Device_CallInProgress');
    }

    options = parseRunOptions(options);

    this.runPromise = createDeferred(this._runInner.bind(this, fn, options));
    return this.runPromise.promise;
  }

  async _runInner<T>(fn: (() => Promise<T>) | undefined, options: RunOptions) {
    if (!this.isUsedHere() || this.commands.dispose) {
      await this.acquire();
      try {
        if (fn) {
          await this.initialize();
        }
      } catch (error) {
        this.runPromise = null;
        return Promise.reject(
          ERRORS.TypedError(
            'Device_InitializeFailed',
            `Initialize failed: ${error.message as string}, code: ${error.code as string}`
          )
        );
      }
    }

    if (options.keepSession) {
      this.keepSession = true;
    }

    if (fn) {
      await fn();
    }

    // reload features
    if (this.loaded && this.features) {
      await this.getFeatures();
    }

    if (
      (!this.keepSession && typeof options.keepSession !== 'boolean') ||
      options.keepSession === false
    ) {
      this.keepSession = false;
      await this.release();
    }

    if (this.runPromise) {
      this.runPromise.resolve();
    }

    this.runPromise = null;

    if (!this.loaded) {
      this.loaded = true;
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

  isBootloader() {
    return this.features && !!this.features.bootloader_mode;
  }

  isInitialized() {
    return this.features && !!this.features.initialized;
  }

  isSeedless() {
    return this.features && !!this.features.no_backup;
  }

  isT1() {
    return this.features ? this.features.major_version === 1 : false;
  }

  hasUnexpectedMode(allow: string[], require: string[]) {
    // both allow and require cases might generate single unexpected mode
    if (this.features) {
      // allow cases
      if (this.isBootloader() && !allow.includes(UI_REQUEST.BOOTLOADER)) {
        return UI_REQUEST.BOOTLOADER;
      }
      if (!this.isInitialized() && !allow.includes(UI_REQUEST.INITIALIZE)) {
        return UI_REQUEST.INITIALIZE;
      }
      if (this.isSeedless() && !allow.includes(UI_REQUEST.SEEDLESS)) {
        return UI_REQUEST.SEEDLESS;
      }

      // require cases
      if (!this.isBootloader() && require.includes(UI_REQUEST.BOOTLOADER)) {
        return UI_REQUEST.NOT_IN_BOOTLOADER;
      }
    }
    return null;
  }
}

export default Device;
