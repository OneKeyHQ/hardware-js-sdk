import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { supportInputPinOnSoftware, supportModifyHomescreen } from '../utils/deviceFeaturesUtils';
import { createDeviceMessage } from '../events/device';
import { UI_REQUEST } from '../constants/ui-request';
import { Device } from '../device/Device';
import DeviceConnector from '../device/DeviceConnector';
import { DeviceFirmwareRange, KnownDevice } from '../types';
import { CoreMessage, createFirmwareMessage, createUiMessage, DEVICE, FIRMWARE } from '../events';
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
   * 不允许的设备模式。如果当前设备模式在该数组中，则抛出异常。
   */
  notAllowDeviceMode: string[];

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

  /**
   * skip force update check
   * @default false
   */
  skipForceUpdateCheck = false;

  /**
   * 取消标志，比如还没有搜索到设备，用户取消了操作
   */
  private canceled = false;

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
    this.notAllowDeviceMode = [UI_REQUEST.INITIALIZE];
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
        device: this.device.toMessageObject(),
      })
    );
    const bleReleaseInfo = getBleFirmwareReleaseInfo(this.device.features);
    this.postMessage(
      createFirmwareMessage(FIRMWARE.BLE_RELEASE_INFO, {
        ...bleReleaseInfo,
        device: this.device.toMessageObject(),
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
    let checkFlag = false;
    // 3 - Ropsten, 4 - Rinkeby, 5 - Goerli, 420 - Optimism Goerli, 11155111 - zkSync Sepolia
    if (
      this.name === 'evmSignTransaction' &&
      [3, 4, 5, 420, 11155111].includes(Number(this.payload?.transaction?.chainId))
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

  hasCanceled() {
    return this.canceled;
  }

  inspectHasCanceled() {
    if (this.hasCanceled()) {
      throw ERRORS.TypedError(HardwareErrorCode.DeviceInterruptedFromUser);
    }
  }

  cancel() {
    this.canceled = true;
    this.dispose();
  }

  // Reusable events
  postPreviousAddressMessage = (data: { address?: string; path?: string }) => {
    this.postMessage(
      createUiMessage(UI_REQUEST.PREVIOUS_ADDRESS_RESULT, {
        device: this.device.toMessageObject() as KnownDevice,
        data,
      })
    );
  };
}
