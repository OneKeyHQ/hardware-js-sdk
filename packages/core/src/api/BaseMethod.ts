import {
  supportInputPinOnSoftware,
  supportModifyHomescreen,
  getDeviceType,
} from '../utils/deviceFeaturesUtils';
import { createDeviceMessage } from '../events/device';
import { UI_REQUEST } from '../constants/ui-request';
import { Device } from '../device/Device';
import DeviceConnector from '../device/DeviceConnector';
import { DeviceFirmwareRange } from '../types';
import { CoreMessage, createFirmwareMessage, DEVICE, FIRMWARE } from '../events';
import { getBleFirmwareReleaseInfo, getFirmwareReleaseInfo } from './firmware/releaseHelper';
import { getLogger, LoggerNames } from '../utils';

const Log = getLogger(LoggerNames.Method);

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

  /**
   * device id
   */
  deviceId?: string;

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

  /**
   * 是否需要轮询确认设备已连接
   */
  shouldEnsureConnected = true;

  /**
   * 是否需要校验 features 的 deviceId 是否一致
   */
  checkDeviceId = false;

  /**
   * 该方法是否需要校验 passphrase state
   */
  useDevicePassphraseState = true;

  // @ts-expect-error: strictPropertyInitialization
  postMessage: (message: CoreMessage) => void;

  constructor(message: { id?: number; payload: any }) {
    const { payload } = message;
    this.name = payload.method;
    this.payload = payload;
    this.responseID = message.id || 0;
    this.connectId = payload.connectId || '';
    this.deviceId = payload.deviceId || '';
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

  checkFirmwareRelease() {
    if (!this.device || !this.device.features) return;
    const releaseInfo = getFirmwareReleaseInfo(this.device.features);
    this.postMessage(
      createFirmwareMessage(FIRMWARE.RELEASE_INFO, {
        ...releaseInfo,
        features: this.device.features,
      })
    );
    const bleReleaseInfo = getBleFirmwareReleaseInfo(this.device.features);
    this.postMessage(
      createFirmwareMessage(FIRMWARE.BLE_RELEASE_INFO, {
        ...bleReleaseInfo,
        features: this.device.features,
      })
    );
  }

  checkDeviceSupportFeature() {
    if (!this.device || !this.device.features) return;
    const inputPinOnSoftware = supportInputPinOnSoftware(this.device.features);
    const modifyHomescreen = supportModifyHomescreen(this.device.features);
    this.postMessage(
      createDeviceMessage(DEVICE.SUPPORT_FEATURES, {
        inputPinOnSoftware,
        modifyHomescreen,
        device: this.device.toMessageObject(),
      })
    );
  }

  /**
   * Automatic check safety_check level for Kovan, Ropsten, Rinkeby, Goerli test networks.
   * @returns {void}
   */
  async checkSafetyLevelOnTestNet() {
    const deviceType = getDeviceType(this.device.features);
    if (deviceType !== 'touch') return;
    let checkFlag = false;
    if (
      this.name === 'evmSignTransaction' &&
      [3, 4, 5, 42].includes(Number(this.payload?.transaction?.chainId))
    ) {
      checkFlag = true;
    }
    if (checkFlag && this.device.features?.safety_checks === 'Strict') {
      Log.debug('will change safety_checks level');
      await this.device.commands.typedCall('ApplySettings', 'Success', {
        safety_checks: 'PromptTemporarily',
      });
    }
  }

  dispose() {}
}
