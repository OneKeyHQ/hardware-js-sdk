import semver from 'semver';
import {
  ERRORS,
  HardwareErrorCode,
  createDeviceNotSupportMethodError,
  createNeedUpgradeFirmwareHardwareError,
} from '@onekeyfe/hd-shared';

import { createDeviceMessage } from '../events/device';
import { UI_REQUEST } from '../constants/ui-request';
import { DEVICE, FIRMWARE, createFirmwareMessage, createUiMessage } from '../events';
import { getHDPath, toHardened } from './helpers/pathUtils';
import { getBleFirmwareReleaseInfo, getFirmwareReleaseInfo } from './firmware/releaseHelper';
import { LoggerNames, getFirmwareType, getLogger, isMethodVersionRangeUnsupported } from '../utils';
import { generateInstanceId } from '../utils/tracing';
import { DeviceModelToTypes } from '../types';

import type { Device } from '../device/Device';
import type DeviceConnector from '../device/DeviceConnector';
import type { DeviceFirmwareRange, KnownDevice } from '../types';
import type { CoreMessage } from '../events';
import type { RequestContext } from '../utils/tracing';
import type { CoreContext } from '../core';

export type UnlockPolicy = 'none' | 'retry-on-locked';

const Log = getLogger(LoggerNames.Method);

const isEvmLedgerLegacyPathWithHighIndex = (path: unknown) => {
  let addressN: number[] | undefined;
  if (typeof path === 'string') {
    try {
      addressN = getHDPath(path);
    } catch {
      return false;
    }
  } else if (Array.isArray(path)) {
    addressN = path.map((item: unknown) => Number(item));
  }

  return (
    Array.isArray(addressN) &&
    addressN.length === 4 &&
    addressN[0] === toHardened(44) &&
    addressN[1] === toHardened(60) &&
    addressN[2] === toHardened(0) &&
    addressN[3] > 1 &&
    addressN[3] < toHardened(0)
  );
};

const EVM_LEDGER_LEGACY_METHODS = ['evmGetAddress', 'evmGetPublicKey'];

export abstract class BaseMethod<Params = undefined> {
  abortSignal?: AbortSignal;

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

  instanceId!: string;

  sdkInstanceId?: string;

  requestContext?: RequestContext;

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
   * 允许的设备模式。当前设备模式在该数组中，则可以允许运行。
   * eg. NOT_INITIALIZE, BOOTLOADER, SEEDLESS
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

  /**
   * skip force update check
   * @default false
   */
  skipForceUpdateCheck = false;

  /** Allow skipping Initialize (sign methods only; never getAddress/getPublicKey). @default false */
  allowUsePreInitialize = false;

  /** Pre-warm signal method (fire-and-forget; core dedups + hangs up). @default false */
  isPreWarmSignal = false;

  /** Pre-warm dedup TTL (ms) */
  preWarmTtl = 60 * 1000;

  /** Pre-warm dedup key: connectId + passphraseState + method name */
  getPreWarmKey(): string {
    const payload = (this.payload ?? {}) as {
      connectId?: string;
      passphraseState?: string;
    };
    return [
      this.connectId ?? payload.connectId ?? '',
      payload.passphraseState ?? '',
      this.name,
    ].join('|');
  }

  /**
   * 严格检查设备是否支持该方法，不支持则抛出错误
   * @experiment 默认不严格检查，如果需要严格检查，则需要设置为 true
   * @default false
   */
  strictCheckDeviceSupport = false;

  /**
   * 方法是否仅支持 Protocol V2 设备（Pro2）。
   * core 调度在设备协议确定（acquire + initialize）后统一守卫，
   * 非 V2 设备直接抛出 NotSupport 错误，方法内部不必重复判断。
   * @default false
   */
  requireProtocolV2 = false;

  /** Protocol V2 业务方法锁定时默认由 Core 自动解锁并重试一次。 */
  unlockPolicy: UnlockPolicy = 'retry-on-locked';

  protected throwIfAborted() {
    if (this.abortSignal?.aborted) {
      throw ERRORS.TypedError(
        HardwareErrorCode.CallQueueActionCancelled,
        'Hardware operation cancelled'
      );
    }
  }

  // @ts-expect-error: strictPropertyInitialization
  postMessage: (message: CoreMessage) => void;

  context?: CoreContext;

  temporarySafetyCheckPrompted = false;

  constructor(message: { id?: number; payload: any }) {
    const { payload } = message;
    this.name = payload.method;
    this.payload = payload;
    this.responseID = message.id || 0;
    this.connectId = payload.connectId || '';
    this.deviceId = payload.deviceId || '';
    this.useDevice = true;
    this.allowDeviceMode = [UI_REQUEST.NOT_INITIALIZE];
    this.requireDeviceMode = [];
  }

  abstract init(): void;

  abstract run(): Promise<any>;

  getVersionRange(): DeviceFirmwareRange {
    return {};
  }

  setContext(context: CoreContext) {
    this.sdkInstanceId = context.sdkInstanceId;
    this.instanceId = generateInstanceId('Method', this.sdkInstanceId);
    Log.debug(
      `[BaseMethod] Created: ${this.instanceId}, method: ${this.name}, SDK: ${this.sdkInstanceId}`
    );
  }

  setDevice(device: Device) {
    this.device = device;

    if (!device.sdkInstanceId && this.sdkInstanceId) {
      device.sdkInstanceId = this.sdkInstanceId;
      device.instanceId = generateInstanceId('Device', this.sdkInstanceId);
    }

    if (this.requestContext) {
      this.requestContext.deviceInstanceId = device.instanceId;
      this.requestContext.commandsInstanceId = device.commands?.instanceId;
      this.requestContext.sdkInstanceId = this.sdkInstanceId;
    }

    if (device.commands && this.sdkInstanceId) {
      device.commands.instanceId = generateInstanceId('DeviceCommands', this.sdkInstanceId);
    }

    if (device.commands) {
      device.commands.currentResponseID = this.responseID;
    }

    Log.debug(
      `[${this.instanceId}] setDevice: ${device.instanceId}, commands: ${device.commands?.instanceId}`
    );
  }

  checkFirmwareRelease() {
    // 固件 release 元数据（DataManager remote config）目前只覆盖 Protocol V1 设备；
    // Pro2 的更新流程由 firmwareUpdateV4 自行管理，这里显式跳过而不是依赖 features 为空。
    if (!this.device || this.device.isProtocolV2()) return;
    if (!this.device.features) return;
    const firmwareType = getFirmwareType(this.device.features);
    const releaseInfo = getFirmwareReleaseInfo(this.device.features, firmwareType);
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
    if (!this.device || this.device.isUnacquired()) return;
    const inputPinOnSoftware = this.device.supportInputPinOnSoftware();
    const modifyHomescreen = this.device.supportModifyHomescreen();

    this.postMessage(
      createDeviceMessage(DEVICE.SUPPORT_FEATURES, {
        inputPinOnSoftware,
        modifyHomescreen,
        device: this.device.toMessageObject(),
      })
    );
  }

  protected checkFeatureVersionLimit(
    checkCondition: () => boolean,
    getVersionRange: () => DeviceFirmwareRange,
    options?: {
      strictCheckDeviceSupport?: boolean;
    }
  ) {
    if (!checkCondition()) {
      return;
    }

    const firmwareVersion = this.device.getCurrentFirmwareVersionString() ?? '0.0.0';
    const versionRange = this.device.getCurrentMethodVersionRange(type => getVersionRange()[type]);

    if (isMethodVersionRangeUnsupported(versionRange)) {
      throw createDeviceNotSupportMethodError(this.name, this.device.getCurrentFirmwareType());
    }

    if (!versionRange) {
      if (options?.strictCheckDeviceSupport) {
        throw createDeviceNotSupportMethodError(this.name, this.device.getCurrentFirmwareType());
      }
      // Equipment that does not need to be repaired
      return;
    }

    if (semver.valid(firmwareVersion) && semver.lt(firmwareVersion, versionRange.min)) {
      throw createNeedUpgradeFirmwareHardwareError({
        currentVersion: firmwareVersion,
        requireVersion: versionRange.min,
        methodName: this.name,
        firmwareType: this.device.getCurrentFirmwareType(),
      });
    }
  }

  private shouldPromptSafetyCheckForEvmLedgerLegacyPath() {
    if (!EVM_LEDGER_LEGACY_METHODS.includes(this.name)) {
      return false;
    }

    const deviceType = this.device.getCurrentDeviceType();
    if (!DeviceModelToTypes.model_touch.includes(deviceType)) {
      return false;
    }

    const paths = Array.isArray(this.payload?.bundle)
      ? this.payload.bundle.map((item: { path?: unknown }) => item?.path)
      : [this.payload?.path];

    return paths.some(isEvmLedgerLegacyPathWithHighIndex);
  }

  /**
   * Automatic check safety_check level for selected calls that require temporary relaxed checks.
   * @returns whether a temporary safety check prompt was applied.
   */
  async checkSafetyLevelOnTestNet() {
    if (this.temporarySafetyCheckPrompted) {
      return false;
    }

    let checkFlag = false;
    // 3 - Ropsten, 4 - Rinkeby, 5 - Goerli, 420 - Optimism Goerli, 11155111 - zkSync Sepolia
    if (
      this.name === 'evmSignTransaction' &&
      [3, 4, 5, 420, 11155111].includes(Number(this.payload?.transaction?.chainId))
    ) {
      checkFlag = true;
    }
    if (this.shouldPromptSafetyCheckForEvmLedgerLegacyPath()) {
      checkFlag = true;
    }
    if (checkFlag && this.device.getCurrentSafetyChecks() === 'Strict') {
      Log.debug('will change safety_checks level');
      await this.device.commands.typedCall('ApplySettings', 'Success', {
        safety_checks: 'PromptTemporarily',
      });
      this.temporarySafetyCheckPrompted = true;
      return true;
    }

    return false;
  }

  dispose() {}

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
