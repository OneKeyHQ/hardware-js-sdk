import { ERRORS, HardwareError, HardwareErrorCode, wait } from '@onekeyfe/hd-shared';
import {
  DeviceRebootType,
  PROTOCOL_V2_BLE_FILE_CHUNK_SIZE,
  PROTOCOL_V2_WEBUSB_FILE_CHUNK_SIZE,
} from '@onekeyfe/hd-transport';

import { FirmwareUpdateTipMessage, UI_REQUEST } from '../events/ui-request';
import { validateParams } from './helpers/paramsValidator';
import {
  LoggerNames,
  getDeviceBLEFirmwareVersion,
  getDeviceBootloaderVersion,
  getDeviceFirmwareVersion,
  getFirmwareType,
  getLogger,
} from '../utils';
import { getSysResourceBinary } from './firmware/getBinary';
import { DataManager } from '../data-manager';
import { FirmwareUpdateBaseMethod } from './firmware/FirmwareUpdateBaseMethod';
import { DevicePool } from '../device/DevicePool';
import {
  PROTOCOL_V2_VERSIONS_DEVICE_INFO_REQUEST,
  ProtocolV2FirmwareTargetType,
} from '../protocols/protocol-v2';
import { requestProtocolV2DeviceInfo } from '../protocols/protocol-v2/features';
import {
  PROTOCOL_V2_FIRMWARE_UPDATE_RESPONSE_TYPES,
  getProtocolV2UnknownErrorText,
  isProtocolV2DeviceDisconnectedError,
} from './protocol-v2/helpers';

import type { FirmwareUpdateV4Params } from '../types/api/firmwareUpdate';
import type { EFirmwareType } from '@onekeyfe/hd-shared';
import type { PROTO } from '../constants';
import type { TypedResponseMessage } from '../device/DeviceCommands';
import type { Features, IFirmwareReleaseInfo, IProtocolV2FirmwareComponent } from '../types';

const Log = getLogger(LoggerNames.Method);

const SESSION_ERROR = 'session not found';
const PROTOCOL_V2_BOOTLOADER_RECONNECT_TIMEOUT = 60 * 1000;
const PROTOCOL_V2_SHORT_RESPONSE_TIMEOUT = 5 * 1000;
const PROTOCOL_V2_INSTALL_TIMEOUT = 5 * 60 * 1000;
const PROTOCOL_V2_TARGET_STATUS_PENDING = 0;
const PROTOCOL_V2_TARGET_STATUS_IN_PROGRESS = 1;
const PROTOCOL_V2_TARGET_STATUS_FINISHED = 2;
const PROTOCOL_V2_TARGET_STATUS_FAILED_MIN = 3;
const PROTOCOL_V2_CONNECT_PROTOCOL = 'V2';
const PROTOCOL_V2_FIRMWARE_STAGING_VOLUME = 'vol1:';
const PROTOCOL_V2_MIN_FILE_CHUNK_SIZE = 64;
const PROTOCOL_V2_CONNECT_RETRY_COUNT = 10;
const PROTOCOL_V2_CONNECT_POLL_INTERVAL = 500;
const PROTOCOL_V2_CONNECT_SINGLE_TIMEOUT = 75 * 1000;
const PROTOCOL_V2_DEVICE_INFO_READY_TIMEOUT = 60 * 1000;

type ProtocolV2FirmwareUpdateStatusTarget = {
  target_id: number | string;
  status?: number | string;
  payload_version?: number;
  path?: string;
};

type ProtocolV2FirmwareUpdateStartResponse =
  | TypedResponseMessage<'Success'>
  | TypedResponseMessage<'DeviceFirmwareUpdateStatus'>
  | undefined;

type ProtocolV2TargetBinary = { fileName: string; binary: ArrayBuffer; targetId: number };

type ProtocolV2RemoteComponentTarget = {
  fileName: string;
  targetId: number;
  kind: 'bootloader' | 'firmware' | 'resource';
};

const PROTOCOL_V2_REMOTE_COMPONENT_TARGETS: Readonly<
  Record<string, ProtocolV2RemoteComponentTarget>
> = {
  ROMLOADER: {
    fileName: 'romloader.bin',
    targetId: ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_ROMLOADER,
    kind: 'firmware',
  },
  BOOTLOADER: {
    fileName: 'bootloader.bin',
    targetId: ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_BOOTLOADER,
    kind: 'bootloader',
  },
  APPLICATION_P1: {
    fileName: 'application_p1.bin',
    targetId: ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_APPLICATION_P1,
    kind: 'firmware',
  },
  APPLICATION_P2: {
    fileName: 'application_p2.bin',
    targetId: ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_APPLICATION_P2,
    kind: 'firmware',
  },
  COPROCESSOR: {
    fileName: 'coprocessor.bin',
    targetId: ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_COPROCESSOR,
    kind: 'firmware',
  },
  SE01: {
    fileName: 'se01.bin',
    targetId: ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE01,
    kind: 'firmware',
  },
  SE02: {
    fileName: 'se02.bin',
    targetId: ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE02,
    kind: 'firmware',
  },
  SE03: {
    fileName: 'se03.bin',
    targetId: ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE03,
    kind: 'firmware',
  },
  SE04: {
    fileName: 'se04.bin',
    targetId: ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE04,
    kind: 'firmware',
  },
  RESOURCE: {
    fileName: 'resource.bin',
    targetId: ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_RESOURCE,
    kind: 'resource',
  },
};

// hd-transport 的历史 decode 行为会把单值 enum 输出为枚举名字符串；
// Protocol V2 沿用这个 SDK 语义，内部比较前再映射回固件协议数值。
const PROTOCOL_V2_TARGET_ID_BY_DECODED_NAME = new Map<string, number>(
  Object.entries(ProtocolV2FirmwareTargetType).map(([key, value]) => [key, value])
);
const PROTOCOL_V2_TARGET_STATUS_BY_DECODED_NAME = new Map<string, number>([
  ['FW_MGMT_UPDATER_TASK_STATUS_PENDING', PROTOCOL_V2_TARGET_STATUS_PENDING],
  ['FW_MGMT_UPDATER_TASK_STATUS_IN_PROGRESS', PROTOCOL_V2_TARGET_STATUS_IN_PROGRESS],
  ['FW_MGMT_UPDATER_TASK_STATUS_FINISHED', PROTOCOL_V2_TARGET_STATUS_FINISHED],
  ['FW_MGMT_UPDATER_TASK_STATUS_FAILED_FILE_NOT_FOUND', 3],
  ['FW_MGMT_UPDATER_TASK_STATUS_FAILED_FILE_READ', 4],
  ['FW_MGMT_UPDATER_TASK_STATUS_FAILED_FILE_WRITE', 5],
  ['FW_MGMT_UPDATER_TASK_STATUS_FAILED_VERIFY', 6],
  ['FW_MGMT_UPDATER_TASK_STATUS_FAILED_INSTALL', 7],
  ['FW_MGMT_UPDATER_TASK_STATUS_FAILED_ABORT', 8],
  ['FW_MGMT_UPDATER_TASK_STATUS_FAILED_BUSY', 9],
  ['FW_MGMT_UPDATER_TASK_STATUS_FAILED_ENTRY_OUT_OF_BOUNDS', 10],
]);

const isProtocolV2ReconnectProbeError = (error: unknown) => {
  const message = getProtocolV2UnknownErrorText(error).toLowerCase();
  return (
    (message.includes('device protocol mismatch') && message.includes('expected v2')) ||
    message.includes('did not respond to expected protocol')
  );
};

const isProtocolV2PollingTransientError = (error: unknown) => {
  const message = getProtocolV2UnknownErrorText(error).toLowerCase();
  return (
    isProtocolV2DeviceDisconnectedError(error) ||
    isProtocolV2ReconnectProbeError(error) ||
    message.includes('libusb_transfer_timed_out') ||
    (message.includes('response timeout') && message.includes('devicefirmwareupdatestatusget')) ||
    message.includes('device not found') ||
    message.includes('transportnotfound')
  );
};

const isProtocolV2StartUpdateTransientError = (error: unknown) => {
  const message = getProtocolV2UnknownErrorText(error).toLowerCase();
  return (
    isProtocolV2DeviceDisconnectedError(error) ||
    isProtocolV2ReconnectProbeError(error) ||
    message.includes('libusb_transfer_timed_out') ||
    (message.includes('response timeout') && message.includes('devicefirmwareupdaterequest'))
  );
};

const isProtocolV2TargetStatusFinished = (status: ProtocolV2FirmwareUpdateStatusTarget['status']) =>
  normalizeProtocolV2TargetStatus(status) === PROTOCOL_V2_TARGET_STATUS_FINISHED;

const isProtocolV2TargetStatusInProgress = (
  status: ProtocolV2FirmwareUpdateStatusTarget['status']
) =>
  normalizeProtocolV2TargetStatus(status) === PROTOCOL_V2_TARGET_STATUS_PENDING ||
  normalizeProtocolV2TargetStatus(status) === PROTOCOL_V2_TARGET_STATUS_IN_PROGRESS;

const isProtocolV2TargetStatusFailed = (status: ProtocolV2FirmwareUpdateStatusTarget['status']) => {
  const normalizedStatus = normalizeProtocolV2TargetStatus(status);
  return (
    typeof normalizedStatus === 'number' && normalizedStatus >= PROTOCOL_V2_TARGET_STATUS_FAILED_MIN
  );
};

const normalizeProtocolV2TargetId = (targetId: number | string) => {
  if (typeof targetId === 'number') {
    return targetId;
  }
  return PROTOCOL_V2_TARGET_ID_BY_DECODED_NAME.get(targetId);
};

const normalizeProtocolV2TargetStatus = (
  status: ProtocolV2FirmwareUpdateStatusTarget['status']
) => {
  if (typeof status === 'number') {
    return status;
  }
  if (typeof status === 'string') {
    return PROTOCOL_V2_TARGET_STATUS_BY_DECODED_NAME.get(status);
  }
  return undefined;
};

/**
 * FirmwareUpdateV4 is the complete Protocol V2 firmware update flow.
 *
 * It intentionally does not fall back to FirmwareUpdateV3/V1 behavior:
 * - upload uses FilesystemFileWrite
 * - install uses DeviceFirmwareUpdateRequest
 * - completion waits for target status to finish, reboots to normal, then polls DeviceInfo
 */
export default class FirmwareUpdateV4 extends FirmwareUpdateBaseMethod<FirmwareUpdateV4Params> {
  init() {
    this.allowDeviceMode = [UI_REQUEST.BOOTLOADER, UI_REQUEST.NOT_INITIALIZE];
    this.requireDeviceMode = [];
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;

    const { payload } = this;

    if (typeof payload.retryCount !== 'number') {
      payload.retryCount = PROTOCOL_V2_CONNECT_RETRY_COUNT;
    }
    if (typeof payload.pollIntervalTime !== 'number') {
      payload.pollIntervalTime = PROTOCOL_V2_CONNECT_POLL_INTERVAL;
    }
    if (typeof payload.timeout !== 'number') {
      payload.timeout = PROTOCOL_V2_CONNECT_SINGLE_TIMEOUT;
    }
    if (typeof payload.protocolV2DeviceInfoTimeoutMs !== 'number') {
      payload.protocolV2DeviceInfoTimeoutMs = PROTOCOL_V2_DEVICE_INFO_READY_TIMEOUT;
    }

    validateParams(payload, [
      { name: 'chunkSize', type: 'number' },
      { name: 'resourceBinary', type: 'buffer' },
      { name: 'forcedUpdateRes', type: 'boolean' },
      { name: 'bootloaderBinary', type: 'buffer' },
      { name: 'romloaderBinary', type: 'buffer' },
      { name: 'applicationP1Binary', type: 'buffer' },
      { name: 'applicationP2Binary', type: 'buffer' },
      { name: 'coprocessorBinary', type: 'buffer' },
      { name: 'se01Binary', type: 'buffer' },
      { name: 'se02Binary', type: 'buffer' },
      { name: 'se03Binary', type: 'buffer' },
      { name: 'se04Binary', type: 'buffer' },
      { name: 'firmwareType', type: 'string' },
      { name: 'platform', type: 'string' },
    ]);

    this.params = {
      chunkSize: payload.chunkSize,
      forcedUpdateRes: payload.forcedUpdateRes,
      bootloaderBinary: payload.bootloaderBinary,
      romloaderBinary: payload.romloaderBinary,
      applicationP1Binary: payload.applicationP1Binary,
      applicationP2Binary: payload.applicationP2Binary,
      coprocessorBinary: payload.coprocessorBinary,
      se01Binary: payload.se01Binary,
      se02Binary: payload.se02Binary,
      se03Binary: payload.se03Binary,
      se04Binary: payload.se04Binary,
      resourceBinary: payload.resourceBinary,
      firmwareType: payload.firmwareType,
      platform: payload.platform,
    };
  }

  private getProtocolV2FirmwareChunkSize() {
    const payloadChunkSize = Number(this.params?.chunkSize);
    const env = DataManager.getSettings('env');
    const maxChunkSize =
      this.params?.platform === 'native' || (env && DataManager.isBleConnect(env))
        ? PROTOCOL_V2_BLE_FILE_CHUNK_SIZE
        : PROTOCOL_V2_WEBUSB_FILE_CHUNK_SIZE;
    if (!Number.isFinite(payloadChunkSize) || payloadChunkSize <= 0) {
      return maxChunkSize;
    }
    return Math.min(
      Math.max(Math.floor(payloadChunkSize), PROTOCOL_V2_MIN_FILE_CHUNK_SIZE),
      maxChunkSize
    );
  }

  async run() {
    if (!this.device.isProtocolV2()) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'firmwareUpdateV4 requires a Protocol V2 device'
      );
    }

    Log.debug('FirmwareUpdateV4 strategy: Protocol V2');
    return this.runProtocolV2();
  }

  private async runProtocolV2() {
    const deviceFeatures = await this.getProtocolV2DeviceFeatures();
    const deviceFirmwareType = getFirmwareType(deviceFeatures);
    const firmwareType = this.params.firmwareType ?? deviceFirmwareType;

    let resourceBinary: ArrayBuffer | null = null;
    let fwBinaryMap: ProtocolV2TargetBinary[] = [];
    let bootloaderBinary: ArrayBuffer | null = null;
    try {
      this.postTipMessage(FirmwareUpdateTipMessage.StartDownloadFirmware);
      resourceBinary = await this.prepareResourceBinary(firmwareType, deviceFeatures);
      fwBinaryMap = this.collectExplicitTargetBinaries();
      bootloaderBinary = this.prepareBootloaderBinary();
      if (!this.hasExplicitProtocolV2Payload(fwBinaryMap)) {
        const remoteBinaries = await this.prepareRemoteProtocolV2Binaries(
          firmwareType,
          deviceFeatures
        );
        resourceBinary = remoteBinaries.resourceBinary ?? resourceBinary;
        bootloaderBinary = remoteBinaries.bootloaderBinary;
        fwBinaryMap = remoteBinaries.fwBinaryMap;
      }
      this.postTipMessage(FirmwareUpdateTipMessage.FinishDownloadFirmware);
    } catch (err) {
      throw ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateDownloadFailed, err.message ?? err);
    }

    if (!resourceBinary && !bootloaderBinary && fwBinaryMap.length === 0) {
      throw ERRORS.TypedError(
        HardwareErrorCode.FirmwareUpdateDownloadFailed,
        'No firmware to update'
      );
    }

    await this.enterProtocolV2BootloaderMode();

    await this.executeProtocolV2Update({
      resourceBinary,
      fwBinaryMap,
      bootloaderBinary,
    });

    await this.exitProtocolV2BootloaderToNormal();

    const versions = await this.waitForProtocolV2FinalFeatures();
    this.postTipMessage(FirmwareUpdateTipMessage.FirmwareUpdateCompleted);
    DevicePool.resetState();

    return versions;
  }

  private async getProtocolV2DeviceFeatures(): Promise<Features> {
    if (this.device.features) {
      return this.device.features;
    }
    if (typeof this.device.getFeatures === 'function') {
      const features = await this.device.getFeatures();
      if (features) return features;
    }
    throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Device features not available');
  }

  private async prepareResourceBinary(firmwareType: EFirmwareType, features: Features) {
    if (this.params.resourceBinary) {
      return this.params.resourceBinary;
    }
    const resourceUrl = DataManager.getSysResourcesLatestRelease({
      features,
      forcedUpdateRes: this.params.forcedUpdateRes,
      firmwareType,
    });

    if (resourceUrl) {
      const resource = (await getSysResourceBinary(resourceUrl)).binary;
      return resource;
    }
    Log.warn('No resource url found');
    return null;
  }

  private prepareBootloaderBinary(): ArrayBuffer | null {
    return this.params.bootloaderBinary ?? null;
  }

  private hasExplicitProtocolV2Payload(fwBinaryMap: ProtocolV2TargetBinary[]) {
    return !!this.params.resourceBinary || !!this.params.bootloaderBinary || fwBinaryMap.length > 0;
  }

  private getRemoteComponentEntries(release: IFirmwareReleaseInfo) {
    const components = release.components;
    if (!components) return [];

    const orderedKeys = [
      ...(release.installOrder ?? []),
      ...Object.keys(components).filter(key => !release.installOrder?.includes(key)),
    ];

    return orderedKeys
      .map(key => {
        const component = components[key];
        return component ? ([key, component] as const) : undefined;
      })
      .filter((entry): entry is readonly [string, IProtocolV2FirmwareComponent] => !!entry);
  }

  private async downloadRemoteProtocolV2Component(
    key: string,
    component: IProtocolV2FirmwareComponent
  ) {
    const targetName = component.target?.toUpperCase();
    const target = PROTOCOL_V2_REMOTE_COMPONENT_TARGETS[targetName];
    if (!target) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        `Unsupported Protocol V2 firmware component target: ${key}/${component.target}`
      );
    }
    if (!component.url) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        `Missing Protocol V2 firmware component url: ${key}/${component.target}`
      );
    }

    const { binary } = await getSysResourceBinary(component.url);
    return {
      ...target,
      binary,
    };
  }

  private async prepareRemoteProtocolV2Binaries(firmwareType: EFirmwareType, features: Features) {
    const release = DataManager.getFirmwareLatestRelease(features, firmwareType);
    const entries = release ? this.getRemoteComponentEntries(release) : [];

    let resourceBinary: ArrayBuffer | null = null;
    let bootloaderBinary: ArrayBuffer | null = null;
    const fwBinaryMap: ProtocolV2TargetBinary[] = [];

    for (const [key, component] of entries) {
      const remoteBinary = await this.downloadRemoteProtocolV2Component(key, component);
      if (remoteBinary.kind === 'resource') {
        resourceBinary = remoteBinary.binary;
      } else if (remoteBinary.kind === 'bootloader') {
        bootloaderBinary = remoteBinary.binary;
      } else {
        fwBinaryMap.push({
          fileName: remoteBinary.fileName,
          binary: remoteBinary.binary,
          targetId: remoteBinary.targetId,
        });
      }
    }

    return {
      resourceBinary,
      bootloaderBinary,
      fwBinaryMap,
    };
  }

  private isProtocolV2BootloaderMode() {
    if (typeof this.device.isBootloader === 'function') {
      return this.device.isBootloader();
    }
    return !!this.device.features?.bootloaderMode;
  }

  async enterProtocolV2BootloaderMode() {
    if (this.isProtocolV2BootloaderMode()) {
      return false;
    }

    try {
      this.postTipMessage(FirmwareUpdateTipMessage.AutoRebootToBootloader);
      await this.protocolV2Reboot(DeviceRebootType.Bootloader);
      this.postTipMessage(FirmwareUpdateTipMessage.GoToBootloaderSuccess);
      await wait(1000);
      await this.waitForProtocolV2BootloaderMode();
      return true;
    } catch (error) {
      if (error instanceof HardwareError) {
        throw error;
      }
      Log.log('Protocol V2 auto go to bootloader mode failed: ', error);
      throw ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateAutoEnterBootFailure);
    }
  }

  private async waitForProtocolV2BootloaderMode(
    timeout = PROTOCOL_V2_BOOTLOADER_RECONNECT_TIMEOUT,
    retryInterval = 1000
  ) {
    const startTime = Date.now();
    let lastError: unknown;

    while (Date.now() - startTime < timeout) {
      try {
        await this.reconnectProtocolV2Device();
        const deviceInfo = await requestProtocolV2DeviceInfo({
          commands: this.device.getCommands(),
          timeoutMs: PROTOCOL_V2_SHORT_RESPONSE_TIMEOUT,
        });
        const features = this.device.updateProtocolV2Features(deviceInfo);
        if (features?.bootloaderMode) {
          return features;
        }
        lastError = new Error('Protocol V2 device is reachable but is not in bootloader mode');
      } catch (error) {
        lastError = error;
        Log.log('Protocol V2 bootloader mode not ready, polling reconnect: ', error);
      }
      await wait(retryInterval);
    }

    throw ERRORS.TypedError(
      HardwareErrorCode.FirmwareUpdateAutoEnterBootFailure,
      `Protocol V2 bootloader not ready within ${timeout / 1000}s: ${this.normalizeErrorMessage(
        lastError
      )}`
    );
  }

  /**
   * 收集按 DeviceFirmwareTargetType 拆分的显式目标二进制。
   * 文件名仅用于 staging 路径展示，target_id 已显式给定。
   */
  private collectExplicitTargetBinaries() {
    const entries: ProtocolV2TargetBinary[] = [];
    const push = (binary: ArrayBuffer | undefined, fileName: string, targetId: number) => {
      if (binary) entries.push({ fileName, binary, targetId });
    };

    push(
      this.params.romloaderBinary,
      'romloader.bin',
      ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_ROMLOADER
    );
    push(
      this.params.applicationP1Binary,
      'application_p1.bin',
      ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_APPLICATION_P1
    );
    push(
      this.params.applicationP2Binary,
      'application_p2.bin',
      ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_APPLICATION_P2
    );
    push(
      this.params.coprocessorBinary,
      'coprocessor.bin',
      ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_COPROCESSOR
    );
    push(this.params.se01Binary, 'se01.bin', ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE01);
    push(this.params.se02Binary, 'se02.bin', ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE02);
    push(this.params.se03Binary, 'se03.bin', ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE03);
    push(this.params.se04Binary, 'se04.bin', ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE04);
    return entries;
  }

  private async executeProtocolV2Update({
    resourceBinary,
    fwBinaryMap,
    bootloaderBinary,
  }: {
    resourceBinary: ArrayBuffer | null;
    fwBinaryMap: ProtocolV2TargetBinary[];
    bootloaderBinary: ArrayBuffer | null;
  }) {
    let totalSize = 0;
    let processedSize = 0;

    if (resourceBinary) totalSize += resourceBinary.byteLength;
    for (const fwbinary of fwBinaryMap) totalSize += fwbinary.binary.byteLength;
    if (bootloaderBinary) totalSize += bootloaderBinary.byteLength;

    this.postTipMessage(FirmwareUpdateTipMessage.StartTransferData);

    const targets: Array<{ target_id: number; path: string }> = [];

    if (resourceBinary) {
      // resource 仅支持单文件 .bin：整文件一次上传，target path 指向该文件
      const resourceFilePath = `${PROTOCOL_V2_FIRMWARE_STAGING_VOLUME}resource.bin`;
      processedSize = await this.protocolV2CommonUpdateProcess({
        payload: resourceBinary,
        filePath: resourceFilePath,
        processedSize,
        totalSize,
      });
      targets.push({
        target_id: ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_RESOURCE,
        path: resourceFilePath,
      });
    }

    if (bootloaderBinary) {
      const bootloaderPath = `${PROTOCOL_V2_FIRMWARE_STAGING_VOLUME}bootloader.bin`;
      processedSize = await this.protocolV2CommonUpdateProcess({
        payload: bootloaderBinary,
        filePath: bootloaderPath,
        processedSize,
        totalSize,
      });
      targets.push({
        target_id: ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_BOOTLOADER,
        path: bootloaderPath,
      });
    }

    for (const fwbinary of fwBinaryMap) {
      const firmwarePath = `${PROTOCOL_V2_FIRMWARE_STAGING_VOLUME}${fwbinary.fileName}`;
      processedSize = await this.protocolV2CommonUpdateProcess({
        payload: fwbinary.binary,
        filePath: firmwarePath,
        processedSize,
        totalSize,
      });
      targets.push({
        target_id: fwbinary.targetId,
        path: firmwarePath,
      });
    }

    if (totalSize > 0) {
      this.postProgressMessage(100, 'transferData');
    }

    this.postTipMessage(FirmwareUpdateTipMessage.ConfirmOnDevice);
    const startResponse = await this.protocolV2StartFirmwareUpdate({ targets });
    await this.waitForProtocolV2FirmwareUpdateComplete(targets, startResponse);
  }

  private async queryProtocolV2FirmwareUpdateStatus() {
    const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());
    return typedCall(
      'DeviceFirmwareUpdateStatusGet',
      'DeviceFirmwareUpdateStatus',
      {},
      {
        timeoutMs: PROTOCOL_V2_SHORT_RESPONSE_TIMEOUT,
      }
    );
  }

  private async pingProtocolV2Device() {
    const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());
    await typedCall(
      'Ping',
      'Success',
      { message: 'firmware-update' },
      {
        timeoutMs: PROTOCOL_V2_SHORT_RESPONSE_TIMEOUT,
      }
    );
  }

  private assertProtocolV2TargetStatus(
    statusTargets: ProtocolV2FirmwareUpdateStatusTarget[],
    expectedTargetIds: Set<number>
  ) {
    const failedTarget = statusTargets.find(
      target =>
        expectedTargetIds.has(normalizeProtocolV2TargetId(target.target_id) ?? -1) &&
        isProtocolV2TargetStatusFailed(target.status)
    );
    if (failedTarget) {
      throw ERRORS.TypedError(
        HardwareErrorCode.FirmwareError,
        `Protocol V2 firmware target ${failedTarget.target_id} failed`
      );
    }

    const completedTargets = statusTargets.filter(
      target =>
        expectedTargetIds.has(normalizeProtocolV2TargetId(target.target_id) ?? -1) &&
        isProtocolV2TargetStatusFinished(target.status)
    );
    if (completedTargets.length === expectedTargetIds.size && expectedTargetIds.size > 0) {
      return true;
    }

    const inProgressTarget = statusTargets.find(
      target =>
        expectedTargetIds.has(normalizeProtocolV2TargetId(target.target_id) ?? -1) &&
        isProtocolV2TargetStatusInProgress(target.status)
    );
    if (inProgressTarget) {
      this.postProgressMessage(99, 'installingFirmware');
    }

    return false;
  }

  private async waitForProtocolV2FirmwareUpdateComplete(
    targets: Array<{ target_id: number; path: string }>,
    startResponse?: ProtocolV2FirmwareUpdateStartResponse
  ) {
    const expectedTargetIds = new Set(targets.map(target => target.target_id));
    if (startResponse?.type === 'DeviceFirmwareUpdateStatus') {
      const statusTargets = (startResponse.message.records ??
        []) as ProtocolV2FirmwareUpdateStatusTarget[];
      if (this.assertProtocolV2TargetStatus(statusTargets, expectedTargetIds)) {
        return;
      }
    }

    const startTime = Date.now();
    let lastError: unknown;

    while (Date.now() - startTime < PROTOCOL_V2_INSTALL_TIMEOUT) {
      try {
        const statusRes = await this.queryProtocolV2FirmwareUpdateStatus();
        const statusTargets = (statusRes.message.records ??
          []) as ProtocolV2FirmwareUpdateStatusTarget[];
        if (this.assertProtocolV2TargetStatus(statusTargets, expectedTargetIds)) {
          return;
        }
      } catch (error) {
        lastError = error;
        if (error instanceof HardwareError && error.errorCode === HardwareErrorCode.FirmwareError) {
          throw error;
        }
        Log.log('Protocol V2 firmware install status polling failed: ', error);
        if (isProtocolV2PollingTransientError(error)) {
          try {
            await this.reconnectProtocolV2Device();
          } catch (reconnectError) {
            lastError = reconnectError;
            Log.log(
              'Protocol V2 firmware install reconnect/status polling failed: ',
              reconnectError
            );
          }
          try {
            await this.pingProtocolV2Device();
            Log.log('Protocol V2 firmware status unavailable, Ping is ready');
            return;
          } catch (pingError) {
            lastError = pingError;
            Log.log('Protocol V2 firmware install Ping polling failed: ', pingError);
          }
        }
      }
      await wait(1000);
    }

    throw ERRORS.TypedError(
      HardwareErrorCode.RuntimeError,
      `Protocol V2 firmware update status timeout: ${this.normalizeErrorMessage(lastError)}`
    );
  }

  private async exitProtocolV2BootloaderToNormal() {
    this.postTipMessage(FirmwareUpdateTipMessage.SwitchFirmwareReconnectDevice);
    await this.protocolV2Reboot(DeviceRebootType.Normal);
  }

  private async waitForProtocolV2FinalFeatures() {
    const features = await this.waitForProtocolV2ReconnectAndFeatures(
      PROTOCOL_V2_BOOTLOADER_RECONNECT_TIMEOUT
    );

    const bootloaderVersion = getDeviceBootloaderVersion(features).join('.');
    const bleVersion = getDeviceBLEFirmwareVersion(features).join('.');
    const firmwareVersion = getDeviceFirmwareVersion(features).join('.');
    if (firmwareVersion === '0.0.0') {
      Log.warn(
        'Protocol V2 firmware update finished but app firmware version is still 0.0.0. This is allowed for Pro2 debug BLE-only update flows.'
      );
    }

    return {
      bootloaderVersion,
      bleVersion,
      firmwareVersion,
    };
  }

  private async waitForProtocolV2ReconnectAndFeatures(timeout: number) {
    const startTime = Date.now();
    let lastError: unknown;

    while (Date.now() - startTime < timeout) {
      try {
        await this.reconnectProtocolV2Device();
        const deviceInfo = await requestProtocolV2DeviceInfo({
          commands: this.device.getCommands(),
          timeoutMs: PROTOCOL_V2_SHORT_RESPONSE_TIMEOUT,
          // 更新完成判定只需要各 target 版本号；scope 与请求内容保持一致
          request: PROTOCOL_V2_VERSIONS_DEVICE_INFO_REQUEST,
        });
        const features = this.device.updateProtocolV2Features(deviceInfo);
        if (features.bootloaderMode || features.mode === 'bootloader') {
          throw ERRORS.TypedError(
            HardwareErrorCode.DeviceNotFound,
            'Protocol V2 device is still in bootloader mode'
          );
        }
        return features;
      } catch (error) {
        lastError = error;
        Log.log('Protocol V2 normal mode not ready, polling Ping: ', error);
        await wait(1000);
      }
    }

    throw ERRORS.TypedError(
      HardwareErrorCode.DeviceNotFound,
      `Protocol V2 final features not ready within ${timeout / 1000}s: ${this.normalizeErrorMessage(
        lastError
      )}`
    );
  }

  private async reconnectProtocolV2Device() {
    if (this.isBleReconnect()) {
      await this.acquireProtocolV2BleDevice();
      return;
    }

    const deviceDiff = await this.device.deviceConnector?.enumerate();
    const devicesDescriptor = deviceDiff?.descriptors ?? [];

    if (
      DataManager.isBrowserWebUsb(DataManager.getSettings('env')) &&
      devicesDescriptor.length === 1
    ) {
      this.device.updateDescriptor(
        {
          ...devicesDescriptor[0],
          protocolType: PROTOCOL_V2_CONNECT_PROTOCOL,
        },
        true
      );
      await this.device.acquire(PROTOCOL_V2_CONNECT_PROTOCOL, { throwOnRunPromiseError: true });
      this.device.commands.disposed = false;
      this.device.getCommands().mainId = this.device.mainId ?? '';
      await this.device.initialize();
      return;
    }

    const { deviceList } = await DevicePool.getDevices(devicesDescriptor, this.connectId);
    if (deviceList.length !== 1) {
      throw ERRORS.TypedError(HardwareErrorCode.DeviceNotFound);
    }

    this.device.updateFromCache(deviceList[0]);
    await this.device.acquire(PROTOCOL_V2_CONNECT_PROTOCOL, { throwOnRunPromiseError: true });
    this.device.commands.disposed = false;
    this.device.getCommands().mainId = this.device.mainId ?? '';
    await this.device.initialize();
  }

  private async protocolV2CommonUpdateProcess({
    payload,
    filePath,
    processedSize,
    totalSize,
  }: PROTO.FirmwareUpload & {
    filePath: string;
    processedSize?: number;
    totalSize?: number;
  }) {
    const chunkSize = this.getProtocolV2FirmwareChunkSize();
    let offset = 0;
    const getUploadProgress = (fileOffset: number) => {
      if (totalSize !== undefined && processedSize !== undefined) {
        return Math.min(Math.ceil(((processedSize + fileOffset) / totalSize) * 100), 99);
      }
      return Math.min(Math.ceil((fileOffset / payload.byteLength) * 100), 99);
    };

    while (offset < payload.byteLength) {
      const chunkEnd = Math.min(offset + chunkSize, payload.byteLength);
      const chunkLength = chunkEnd - offset;
      const chunk = payload.slice(offset, chunkEnd);
      const overwrite = offset === 0;
      const progress = getUploadProgress(chunkEnd);

      const writeRes = await this.fileWriteWithRetry(
        filePath,
        payload.byteLength,
        offset,
        chunk,
        overwrite,
        progress
      );
      const processedByte = Number(writeRes.message.processed_byte);
      const nextOffset =
        Number.isFinite(processedByte) && processedByte > offset
          ? processedByte
          : offset + chunkLength;
      if (nextOffset <= offset || nextOffset > payload.byteLength) {
        throw ERRORS.TypedError(
          HardwareErrorCode.EmmcFileWriteFirmwareError,
          `invalid processed_byte ${writeRes.message.processed_byte} for offset ${offset}`
        );
      }
      offset = nextOffset;
      this.postProgressMessage(getUploadProgress(offset), 'transferData');
    }

    return totalSize !== undefined ? (processedSize ?? 0) + payload.byteLength : 0;
  }

  private async fileWriteWithRetry(
    filePath: string,
    totalFileSize: number,
    offset: number,
    chunk: ArrayBuffer | Buffer,
    overwrite: boolean,
    progress: number | null
  ): Promise<TypedResponseMessage<'FilesystemFile'>> {
    const writeFunc = async () => {
      const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());
      const writeRes = await typedCall('FilesystemFileWrite', 'FilesystemFile', {
        file: {
          path: filePath,
          offset,
          total_size: totalFileSize,
          data: chunk,
        },
        overwrite,
        append: false,
        ui_percentage: progress ?? undefined,
      });
      if (writeRes.type !== 'FilesystemFile') {
        if ((writeRes as any).type === 'CallMethodError') {
          if (((writeRes as any).message.error ?? '').indexOf(SESSION_ERROR) > -1) {
            throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, SESSION_ERROR);
          }
        }
        throw ERRORS.TypedError(
          HardwareErrorCode.EmmcFileWriteFirmwareError,
          'transfer data error'
        );
      }
      return writeRes;
    };

    let retryCount = 10;
    while (retryCount > 0) {
      try {
        const result = await writeFunc();
        return result;
      } catch (error) {
        Log.error(`fileWrite error: `, error);
        retryCount--;
        if (retryCount === 0) {
          throw ERRORS.TypedError(
            HardwareErrorCode.EmmcFileWriteFirmwareError,
            'transfer data error'
          );
        }
        const env = DataManager.getSettings('env');
        if (DataManager.isBleConnect(env)) {
          await wait(3000);
          await this.acquireProtocolV2BleDevice();
          await this.device.initialize();
        }
        await wait(2000);
      }
    }
    throw ERRORS.TypedError(HardwareErrorCode.EmmcFileWriteFirmwareError, 'transfer data error');
  }

  private async acquireProtocolV2BleDevice() {
    await this.device.deviceConnector?.acquire(
      this.device.originalDescriptor.id,
      null,
      true,
      PROTOCOL_V2_CONNECT_PROTOCOL
    );
  }

  private async protocolV2StartFirmwareUpdate({
    targets,
  }: {
    targets: Array<{ target_id: number; path: string }>;
  }) {
    const commands = this.device.getCommands();
    let response: ProtocolV2FirmwareUpdateStartResponse;
    try {
      response = await commands.typedCall(
        'DeviceFirmwareUpdateRequest',
        PROTOCOL_V2_FIRMWARE_UPDATE_RESPONSE_TYPES,
        {
          targets,
        },
        {
          intermediateTypes: ['DeviceFirmwareUpdateStatus'],
          timeoutMs: PROTOCOL_V2_INSTALL_TIMEOUT,
          onIntermediateResponse: (response: { type?: string }) => {
            if (response.type === 'DeviceFirmwareUpdateStatus') {
              this.postProgressMessage(99, 'installingFirmware');
            }
          },
        }
      );
    } catch (error) {
      if (isProtocolV2StartUpdateTransientError(error)) {
        Log.log(
          'Protocol V2 firmware update request did not return; continue status polling',
          error
        );
      } else {
        throw error;
      }
    }
    this.postTipMessage(FirmwareUpdateTipMessage.FirmwareUpdating);
    return response;
  }

  private async protocolV2Reboot(rebootType: DeviceRebootType) {
    const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());
    try {
      const res = await typedCall('DeviceReboot', 'Success', {
        reboot_type: rebootType,
      });
      return res.message;
    } catch (error) {
      if (isProtocolV2DeviceDisconnectedError(error) || isProtocolV2ReconnectProbeError(error)) {
        return { message: 'Device rebooted successfully' };
      }
      throw error;
    }
  }

  private normalizeErrorMessage(error: unknown): string {
    if (!error) {
      return '';
    }
    return getProtocolV2UnknownErrorText(error);
  }
}
