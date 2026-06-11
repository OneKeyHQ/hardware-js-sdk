import { ERRORS, HardwareError, HardwareErrorCode, wait } from '@onekeyfe/hd-shared';
import {
  DevRebootType,
  PROTOCOL_V2_BLE_FILE_CHUNK_SIZE,
  PROTOCOL_V2_WEBUSB_FILE_CHUNK_SIZE,
} from '@onekeyfe/hd-transport';

import { FirmwareUpdateTipMessage, UI_REQUEST } from '../events/ui-request';
import { validateParams } from './helpers/paramsValidator';
import { LoggerNames, getFirmwareType, getLogger } from '../utils';
import { getBinary, getSysResourceBinary } from './firmware/getBinary';
import { DataManager } from '../data-manager';
import { FirmwareUpdateBaseMethod } from './firmware/FirmwareUpdateBaseMethod';
import { DevicePool } from '../device/DevicePool';
import {
  PROTOCOL_V2_VERSIONS_DEVICE_INFO_REQUEST,
  ProtocolV2FirmwareTargetType,
  protocolV2FileNameToTargetId,
} from '../protocols/protocol-v2';
import { requestProtocolV2DeviceInfo } from '../protocols/protocol-v2/features';
import { buildProfileFromProtocolV2 } from '../deviceProfile';
import {
  PROTOCOL_V2_FIRMWARE_UPDATE_RESPONSE_TYPES,
  getProtocolV2UnknownErrorText,
  isProtocolV2DeviceDisconnectedError,
} from './protocol-v2/helpers';

import type { FirmwareUpdateV4Params } from '../types/api/firmwareUpdate';
import type { EFirmwareType } from '@onekeyfe/hd-shared';
import type { PROTO } from '../constants';
import type { TypedResponseMessage } from '../device/DeviceCommands';
import type { Features } from '../types';

const Log = getLogger(LoggerNames.Method);

const SESSION_ERROR = 'session not found';
const PROTOCOL_V2_BOOTLOADER_RECONNECT_TIMEOUT = 60 * 1000;
const PROTOCOL_V2_SHORT_RESPONSE_TIMEOUT = 5 * 1000;
const PROTOCOL_V2_INSTALL_TIMEOUT = 5 * 60 * 1000;
const PROTOCOL_V2_TARGET_STATUS_FINISHED = 0;
const PROTOCOL_V2_TARGET_STATUS_IN_PROGRESS = 1;
const PROTOCOL_V2_TARGET_STATUS_FAILED = 2;
const PROTOCOL_V2_CONNECT_PROTOCOL = 'V2';
const PROTOCOL_V2_FIRMWARE_STAGING_VOLUME = 'vol1:';
const PROTOCOL_V2_MIN_FILE_CHUNK_SIZE = 64;

type ProtocolV2FirmwareUpdateStatusTarget = {
  target_id: number;
  status: number;
};

type ProtocolV2FirmwareUpdateStartResponse =
  | TypedResponseMessage<'Success'>
  | TypedResponseMessage<'DevFirmwareUpdateStatus'>
  | undefined;

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
    (message.includes('response timeout') && message.includes('devicegetfirmwareupdatestatus')) ||
    message.includes('device not found') ||
    message.includes('transportnotfound')
  );
};

/**
 * FirmwareUpdateV4 is the complete Protocol V2 firmware update flow.
 *
 * It intentionally does not fall back to FirmwareUpdateV3/V1 behavior:
 * - upload uses FilesystemFileWrite
 * - install uses DevFirmwareUpdate
 * - completion reboots to normal, then polls Ping
 */
export default class FirmwareUpdateV4 extends FirmwareUpdateBaseMethod<FirmwareUpdateV4Params> {
  init() {
    this.allowDeviceMode = [UI_REQUEST.BOOTLOADER, UI_REQUEST.NOT_INITIALIZE];
    this.requireDeviceMode = [];
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;

    const { payload } = this;

    validateParams(payload, [
      { name: 'bleVersion', type: 'array' },
      { name: 'bleBinary', type: 'buffer' },
      { name: 'chunkSize', type: 'number' },
      { name: 'firmwareVersion', type: 'array' },
      { name: 'firmwareBinary', type: 'buffer' },
      { name: 'resourceBinary', type: 'buffer' },
      { name: 'forcedUpdateRes', type: 'boolean' },
      { name: 'bootloaderVersion', type: 'array' },
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
      bleBinary: payload.bleBinary,
      chunkSize: payload.chunkSize,
      firmwareBinary: payload.firmwareBinary,
      forcedUpdateRes: payload.forcedUpdateRes,
      bleVersion: payload.bleVersion,
      bootloaderVersion: payload.bootloaderVersion,
      bootloaderBinary: payload.bootloaderBinary,
      romloaderBinary: payload.romloaderBinary,
      applicationP1Binary: payload.applicationP1Binary,
      applicationP2Binary: payload.applicationP2Binary,
      coprocessorBinary: payload.coprocessorBinary,
      se01Binary: payload.se01Binary,
      se02Binary: payload.se02Binary,
      se03Binary: payload.se03Binary,
      se04Binary: payload.se04Binary,
      firmwareVersion: payload.firmwareVersion,
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
    const legacyFeatures = await this.getProtocolV2LegacyFeatures();
    const deviceFirmwareType = getFirmwareType(legacyFeatures);
    const firmwareType = this.params.firmwareType ?? deviceFirmwareType;

    let resourceBinary: ArrayBuffer | null = null;
    let fwBinaryMap: { fileName: string; binary: ArrayBuffer; targetId?: number }[] = [];
    let bootloaderBinary: ArrayBuffer | null = null;
    try {
      this.postTipMessage(FirmwareUpdateTipMessage.StartDownloadFirmware);
      resourceBinary = await this.prepareResourceBinary(firmwareType, legacyFeatures);
      fwBinaryMap = await this.prepareFirmwareAndBleBinary(firmwareType, legacyFeatures);
      bootloaderBinary = await this.prepareBootloaderBinary(firmwareType, legacyFeatures);
      // 按 DevFirmwareTargetType 拆分的目标二进制（显式 target_id，不走文件名推断）
      fwBinaryMap.push(...this.collectExplicitTargetBinaries());
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

    // TODO: 当前 firmware-pro2 子模块的 reboot/bootloader 流程还未稳定，先暂停自动进 bootloader。
    // await this.enterProtocolV2BootloaderMode();

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

  private async getProtocolV2LegacyFeatures() {
    if (typeof this.device.getFeatures === 'function') {
      return this.device.getFeatures();
    }
    if (this.device.features) {
      return this.device.features;
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

  private async prepareBootloaderBinary(
    firmwareType: EFirmwareType,
    features: Features
  ): Promise<ArrayBuffer | null> {
    if (this.params.bootloaderBinary) {
      return this.params.bootloaderBinary;
    }

    if (this.params.bootloaderVersion) {
      const bootResourceUrl = DataManager.getBootloaderResource(features, firmwareType);
      if (bootResourceUrl) {
        const bootBinary = (await getSysResourceBinary(bootResourceUrl)).binary;
        return bootBinary;
      }
    }
    return null;
  }

  private isProtocolV2BootloaderMode() {
    if (typeof this.device.isBootloader === 'function') {
      return this.device.isBootloader();
    }
    const profile = this.device.profile;
    if (profile?.status?.mode === 'bootloader' || profile?.status?.bootloaderMode === true) {
      return true;
    }
    return !!this.device.features?.bootloader_mode;
  }

  async enterProtocolV2BootloaderMode() {
    if (this.isProtocolV2BootloaderMode()) {
      return false;
    }

    try {
      this.postTipMessage(FirmwareUpdateTipMessage.AutoRebootToBootloader);
      await this.protocolV2Reboot(DevRebootType.Bootloader);
      this.postTipMessage(FirmwareUpdateTipMessage.GoToBootloaderSuccess);
      this.checkDeviceToBootloader(this.payload.connectId);
      await this.checkPromise?.promise;
      this.checkPromise = null;
      await wait(1500);
      await this.device.acquire?.();
      return true;
    } catch (error) {
      if (error instanceof HardwareError) {
        throw error;
      }
      Log.log('Protocol V2 auto go to bootloader mode failed: ', error);
      throw ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateAutoEnterBootFailure);
    }
  }

  /**
   * 收集按 DevFirmwareTargetType 拆分的显式目标二进制。
   * 文件名仅用于 staging 路径展示，target_id 已显式给定。
   */
  private collectExplicitTargetBinaries() {
    const entries: { fileName: string; binary: ArrayBuffer; targetId: number }[] = [];
    const push = (binary: ArrayBuffer | undefined, fileName: string, targetId: number) => {
      if (binary) entries.push({ fileName, binary, targetId });
    };

    push(
      this.params.romloaderBinary,
      'romloader.bin',
      ProtocolV2FirmwareTargetType.TARGET_MAIN_BOOT
    );
    push(
      this.params.applicationP1Binary,
      'application_p1.bin',
      ProtocolV2FirmwareTargetType.TARGET_MAIN_APP
    );
    push(
      this.params.applicationP2Binary,
      'application_p2.bin',
      ProtocolV2FirmwareTargetType.TARGET_MAIN_APP
    );
    push(
      this.params.coprocessorBinary,
      'coprocessor.bin',
      ProtocolV2FirmwareTargetType.TARGET_BT
    );
    push(this.params.se01Binary, 'se01.bin', ProtocolV2FirmwareTargetType.TARGET_SE1);
    push(this.params.se02Binary, 'se02.bin', ProtocolV2FirmwareTargetType.TARGET_SE2);
    push(this.params.se03Binary, 'se03.bin', ProtocolV2FirmwareTargetType.TARGET_SE3);
    push(this.params.se04Binary, 'se04.bin', ProtocolV2FirmwareTargetType.TARGET_SE4);
    return entries;
  }

  private async prepareFirmwareAndBleBinary(firmwareType: EFirmwareType, features: Features) {
    const fwBinaryMap: { fileName: string; binary: ArrayBuffer; targetId?: number }[] = [];
    if (this.params.firmwareBinary) {
      fwBinaryMap.push({
        fileName: 'firmware.bin',
        binary: this.params.firmwareBinary,
      });
    } else if (this.params.firmwareVersion) {
      const firmwareBinary = (
        await getBinary({
          features,
          version: this.params.firmwareVersion,
          updateType: 'firmware',
          isUpdateBootloader: false,
          firmwareType,
        })
      ).binary;
      fwBinaryMap.push({
        fileName: 'firmware.bin',
        binary: firmwareBinary,
      });
    }

    if (this.params.bleBinary) {
      fwBinaryMap.push({
        fileName: 'ble-firmware.bin',
        binary: this.params.bleBinary,
      });
    } else if (this.params.bleVersion) {
      const bleBinary = await getBinary({
        features,
        version: this.params.bleVersion,
        updateType: 'ble',
        firmwareType,
      });
      fwBinaryMap.push({
        fileName: 'ble-firmware.bin',
        binary: bleBinary.binary,
      });
    }

    return fwBinaryMap;
  }

  private async executeProtocolV2Update({
    resourceBinary,
    fwBinaryMap,
    bootloaderBinary,
  }: {
    resourceBinary: ArrayBuffer | null;
    fwBinaryMap: { fileName: string; binary: ArrayBuffer; targetId?: number }[];
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
        target_id: ProtocolV2FirmwareTargetType.TARGET_RESOURCE,
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
        target_id: ProtocolV2FirmwareTargetType.TARGET_MAIN_BOOT,
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
        target_id: fwbinary.targetId ?? protocolV2FileNameToTargetId(fwbinary.fileName),
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
      'DevGetFirmwareUpdateStatus',
      'DevFirmwareUpdateStatus',
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
        expectedTargetIds.has(target.target_id) &&
        target.status === PROTOCOL_V2_TARGET_STATUS_FAILED
    );
    if (failedTarget) {
      throw ERRORS.TypedError(
        HardwareErrorCode.FirmwareError,
        `Protocol V2 firmware target ${failedTarget.target_id} failed`
      );
    }

    const completedTargets = statusTargets.filter(
      target =>
        expectedTargetIds.has(target.target_id) &&
        target.status === PROTOCOL_V2_TARGET_STATUS_FINISHED
    );
    if (completedTargets.length === expectedTargetIds.size && expectedTargetIds.size > 0) {
      return true;
    }

    const inProgressTarget = statusTargets.find(
      target =>
        expectedTargetIds.has(target.target_id) &&
        target.status === PROTOCOL_V2_TARGET_STATUS_IN_PROGRESS
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
    if (startResponse?.type === 'Success') {
      return;
    }
    if (startResponse?.type === 'DevFirmwareUpdateStatus') {
      const statusTargets = (startResponse.message.targets ??
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
        const statusTargets = (statusRes.message.targets ??
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
    await this.protocolV2Reboot(DevRebootType.Normal);
  }

  private async waitForProtocolV2FinalFeatures() {
    const profile = await this.waitForProtocolV2ReconnectAndProfile(
      PROTOCOL_V2_BOOTLOADER_RECONNECT_TIMEOUT
    );
    this.device.updateProfile?.(profile);

    const bootloaderVersion = profile.versions.bootloader ?? '0.0.0';
    const bleVersion = profile.versions.ble ?? '0.0.0';
    const firmwareVersion = profile.versions.firmware ?? '0.0.0';
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

  private async waitForProtocolV2ReconnectAndProfile(timeout: number) {
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
        return buildProfileFromProtocolV2({
          deviceInfo,
          sources: ['deviceInfo'],
          scope: 'versions',
          fallbackSerialNo: this.device.originalDescriptor?.path,
        });
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

    const { deviceList } = await DevicePool.getDevices(devicesDescriptor, this.connectId);
    if (deviceList.length !== 1) {
      throw ERRORS.TypedError(HardwareErrorCode.DeviceNotFound);
    }

    this.device.updateFromCache(deviceList[0]);
    await this.device.acquire();
    this.device.commands.disposed = false;
    this.device.getCommands().mainId = this.device.mainId ?? '';
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
        'DevFirmwareUpdate',
        PROTOCOL_V2_FIRMWARE_UPDATE_RESPONSE_TYPES,
        {
          targets,
        },
        {
          intermediateTypes: ['DevFirmwareInstallProgress'],
          onIntermediateResponse: (response: { message?: { progress?: number } }) => {
            const progress = Number(response.message?.progress);
            if (Number.isFinite(progress)) {
              this.postProgressMessage(Math.min(progress, 99), 'installingFirmware');
            }
          },
        }
      );
    } catch (error) {
      if (isProtocolV2DeviceDisconnectedError(error)) {
        Log.log('Rebooting device');
      } else {
        throw error;
      }
    }
    this.postTipMessage(FirmwareUpdateTipMessage.FirmwareUpdating);
    return response;
  }

  private async protocolV2Reboot(rebootType: DevRebootType) {
    const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());
    try {
      const res = await typedCall('DevReboot', 'Success', {
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
