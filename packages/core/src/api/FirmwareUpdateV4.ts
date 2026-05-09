import { ERRORS, HardwareError, HardwareErrorCode, wait } from '@onekeyfe/hd-shared';
import { DevRebootType, PROTOCOL_V2_FILE_CHUNK_SIZE } from '@onekeyfe/hd-transport';
import JSZip from 'jszip';

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
import { getBinary, getSysResourceBinary } from './firmware/getBinary';
import { DataManager } from '../data-manager';
import { FirmwareUpdateBaseMethod } from './firmware/FirmwareUpdateBaseMethod';
import { DevicePool } from '../device/DevicePool';
import {
  ProtocolV2FirmwareTargetType,
  getProtocolV2Features,
  protocolV2FileNameToTargetId,
} from '../protocols/protocol-v2';
import { PROTOCOL_V2_FIRMWARE_UPDATE_RESPONSE_TYPES } from './protocol-v2/helpers';

import type { FirmwareUpdateV4Params } from '../types/api/firmwareUpdate';
import type { EFirmwareType } from '@onekeyfe/hd-shared';
import type { PROTO } from '../constants';
import type { TypedResponseMessage } from '../device/DeviceCommands';

const Log = getLogger(LoggerNames.Method);

const SESSION_ERROR = 'session not found';
const PROTOCOL_V2_BOOTLOADER_RECONNECT_TIMEOUT = 60 * 1000;
const PROTOCOL_V2_SHORT_RESPONSE_TIMEOUT = 5 * 1000;
const PROTOCOL_V2_INSTALL_TIMEOUT = 5 * 60 * 1000;
const PROTOCOL_V2_TARGET_STATUS_FINISHED = 0;
const PROTOCOL_V2_TARGET_STATUS_IN_PROGRESS = 1;
const PROTOCOL_V2_TARGET_STATUS_FAILED = 2;
const PROTOCOL_V2_CONNECT_PROTOCOL = 'V2';

type ProtocolV2FirmwareUpdateStatusTarget = {
  target_id: number;
  status: number;
};

const isDeviceDisconnectedError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    message.includes('device was disconnected') ||
    message.includes('transferIn') ||
    message.includes('USBDevice')
  );
};

/**
 * FirmwareUpdateV4 is the complete Protocol V2 firmware update flow.
 *
 * It intentionally does not fall back to FirmwareUpdateV3/V1 behavior:
 * - reboot uses DevReboot(Bootloader)
 * - upload uses FilesystemFileWrite
 * - install uses DevFirmwareUpdate
 * - completion uses DevGetFirmwareUpdateStatus and final DevGetDeviceInfo
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
      { name: 'firmwareVersion', type: 'array' },
      { name: 'firmwareBinary', type: 'buffer' },
      { name: 'resourceBinary', type: 'buffer' },
      { name: 'forcedUpdateRes', type: 'boolean' },
      { name: 'bootloaderVersion', type: 'array' },
      { name: 'bootloaderBinary', type: 'buffer' },
      { name: 'firmwareType', type: 'string' },
      { name: 'platform', type: 'string' },
    ]);

    this.params = {
      bleBinary: payload.bleBinary,
      firmwareBinary: payload.firmwareBinary,
      forcedUpdateRes: payload.forcedUpdateRes,
      bleVersion: payload.bleVersion,
      bootloaderVersion: payload.bootloaderVersion,
      bootloaderBinary: payload.bootloaderBinary,
      firmwareVersion: payload.firmwareVersion,
      resourceBinary: payload.resourceBinary,
      firmwareType: payload.firmwareType,
      platform: payload.platform,
    };
  }

  async run() {
    if (this.device.originalDescriptor?.protocolType !== 'V2') {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'firmwareUpdateV4 requires a Protocol V2 device'
      );
    }

    Log.debug('FirmwareUpdateV4 strategy: Protocol V2');
    return this.runProtocolV2();
  }

  private async runProtocolV2() {
    const { device } = this;
    const { features } = device;

    if (!features) {
      throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Device features not available');
    }

    const deviceFirmwareType = getFirmwareType(features);
    const firmwareType = this.params.firmwareType ?? deviceFirmwareType;

    let resourceBinary: ArrayBuffer | null = null;
    let fwBinaryMap: { fileName: string; binary: ArrayBuffer }[] = [];
    let bootloaderBinary: ArrayBuffer | null = null;
    try {
      this.postTipMessage(FirmwareUpdateTipMessage.StartDownloadFirmware);
      resourceBinary = await this.prepareResourceBinary(firmwareType);
      fwBinaryMap = await this.prepareFirmwareAndBleBinary(firmwareType);
      bootloaderBinary = await this.prepareBootloaderBinary(firmwareType);
      this.postTipMessage(FirmwareUpdateTipMessage.FinishDownloadFirmware);
    } catch (err) {
      throw ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateDownloadFailed, err.message ?? err);
    }

    if (!bootloaderBinary && fwBinaryMap.length === 0) {
      throw ERRORS.TypedError(
        HardwareErrorCode.FirmwareUpdateDownloadFailed,
        'No firmware to update'
      );
    }

    await this.enterProtocolV2Bootloader();

    await this.executeProtocolV2Update({
      resourceBinary,
      fwBinaryMap,
      bootloaderBinary,
    });

    const versions = await this.waitForProtocolV2FinalFeatures();
    this.postTipMessage(FirmwareUpdateTipMessage.FirmwareUpdateCompleted);
    DevicePool.resetState();

    return versions;
  }

  private async prepareResourceBinary(firmwareType: EFirmwareType) {
    if (this.params.resourceBinary) {
      return this.params.resourceBinary;
    }
    const { features } = this.device;
    if (!features) return null;
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

  private async prepareBootloaderBinary(firmwareType: EFirmwareType): Promise<ArrayBuffer | null> {
    if (this.params.bootloaderBinary) {
      return this.params.bootloaderBinary;
    }
    const { features } = this.device;
    if (!features) return null;

    if (this.params.bootloaderVersion) {
      const bootResourceUrl = DataManager.getBootloaderResource(features, firmwareType);
      if (bootResourceUrl) {
        const bootBinary = (await getSysResourceBinary(bootResourceUrl)).binary;
        return bootBinary;
      }
    }
    return null;
  }

  private async prepareFirmwareAndBleBinary(firmwareType: EFirmwareType) {
    const fwBinaryMap: { fileName: string; binary: ArrayBuffer }[] = [];
    if (this.params.firmwareBinary) {
      fwBinaryMap.push({
        fileName: 'firmware.bin',
        binary: this.params.firmwareBinary,
      });
    } else if (this.params.firmwareVersion) {
      const { features } = this.device;
      if (features) {
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
    }

    if (this.params.bleBinary) {
      fwBinaryMap.push({
        fileName: 'ble-firmware.bin',
        binary: this.params.bleBinary,
      });
    } else if (this.params.bleVersion) {
      const { features } = this.device;
      if (features) {
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
    }

    return fwBinaryMap;
  }

  private async enterProtocolV2Bootloader() {
    this.postTipMessage(FirmwareUpdateTipMessage.AutoRebootToBootloader);
    await this.protocolV2Reboot(DevRebootType.Bootloader);
    await this.waitForProtocolV2BootloaderReady(PROTOCOL_V2_BOOTLOADER_RECONNECT_TIMEOUT);
    this.postTipMessage(FirmwareUpdateTipMessage.GoToBootloaderSuccess);
  }

  private async waitForProtocolV2BootloaderReady(timeout: number) {
    const startTime = Date.now();
    let lastError: unknown;
    while (Date.now() - startTime < timeout) {
      try {
        await this.reconnectProtocolV2Device();
        await this.queryProtocolV2FirmwareUpdateStatus();
        return;
      } catch (error) {
        lastError = error;
        Log.log('Protocol V2 bootloader not ready yet: ', error);
        await wait(1000);
      }
    }
    throw ERRORS.TypedError(
      HardwareErrorCode.DeviceNotFound,
      `Protocol V2 bootloader not ready within ${timeout / 1000}s: ${this.normalizeErrorMessage(
        lastError
      )}`
    );
  }

  private async executeProtocolV2Update({
    resourceBinary,
    fwBinaryMap,
    bootloaderBinary,
  }: {
    resourceBinary: ArrayBuffer | null;
    fwBinaryMap: { fileName: string; binary: ArrayBuffer }[];
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
      const resourcePath = `vol0:res/`;
      await this.protocolV2CreateFolder(resourcePath);
      const file = await JSZip.loadAsync(resourceBinary);
      const files = Object.entries(file.files);
      for (const [fileName, entry] of files) {
        const name = fileName.split('/').pop();
        if (!entry.dir && fileName.indexOf('__MACOSX') === -1 && name) {
          const data = await entry.async('arraybuffer');
          processedSize = await this.protocolV2CommonUpdateProcess({
            payload: data,
            filePath: `${resourcePath}${name}`,
            processedSize,
            totalSize,
          });
        }
      }
      targets.push({
        target_id: ProtocolV2FirmwareTargetType.TARGET_RESOURCE,
        path: resourcePath,
      });
    }

    if (bootloaderBinary) {
      const bootloaderPath = `vol0:bootloader.bin`;
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
      const firmwarePath = `vol0:${fwbinary.fileName}`;
      processedSize = await this.protocolV2CommonUpdateProcess({
        payload: fwbinary.binary,
        filePath: firmwarePath,
        processedSize,
        totalSize,
      });
      targets.push({
        target_id: protocolV2FileNameToTargetId(fwbinary.fileName),
        path: firmwarePath,
      });
    }

    this.postTipMessage(FirmwareUpdateTipMessage.ConfirmOnDevice);
    await this.protocolV2StartFirmwareUpdate({ targets });
    await this.waitForProtocolV2FirmwareUpdateComplete(targets);
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

  private async waitForProtocolV2FirmwareUpdateComplete(
    targets: Array<{ target_id: number; path: string }>
  ) {
    const expectedTargetIds = new Set(targets.map(target => target.target_id));
    const startTime = Date.now();
    let lastError: unknown;

    while (Date.now() - startTime < PROTOCOL_V2_INSTALL_TIMEOUT) {
      try {
        const statusRes = await this.queryProtocolV2FirmwareUpdateStatus();
        const statusTargets = (statusRes.message.targets ??
          []) as ProtocolV2FirmwareUpdateStatusTarget[];
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
          return;
        }

        const inProgressTarget = statusTargets.find(
          target =>
            expectedTargetIds.has(target.target_id) &&
            target.status === PROTOCOL_V2_TARGET_STATUS_IN_PROGRESS
        );
        if (inProgressTarget) {
          this.postProgressMessage(99, 'installingFirmware');
        }
      } catch (error) {
        lastError = error;
        if (error instanceof HardwareError && error.errorCode === HardwareErrorCode.FirmwareError) {
          throw error;
        }
        Log.log('Protocol V2 firmware status query failed: ', error);
        try {
          await this.waitForProtocolV2BootloaderReady(PROTOCOL_V2_BOOTLOADER_RECONNECT_TIMEOUT);
        } catch (reconnectError) {
          Log.log('Protocol V2 bootloader reconnect while installing failed: ', reconnectError);
        }
      }
      await wait(1000);
    }

    throw ERRORS.TypedError(
      HardwareErrorCode.RuntimeError,
      `Protocol V2 firmware update status timeout: ${this.normalizeErrorMessage(lastError)}`
    );
  }

  private async waitForProtocolV2FinalFeatures() {
    const features = await this.waitForProtocolV2ReconnectAndFeatures(
      PROTOCOL_V2_BOOTLOADER_RECONNECT_TIMEOUT
    );
    this.device._updateFeatures(features);

    const bootloaderVersion = getDeviceBootloaderVersion(features).join('.');
    const bleVersion = getDeviceBLEFirmwareVersion(features).join('.');
    const firmwareVersion = getDeviceFirmwareVersion(features).join('.');
    if (firmwareVersion === '0.0.0') {
      throw ERRORS.TypedError(
        HardwareErrorCode.FirmwareError,
        'Protocol V2 firmware update finished but app firmware version is still 0.0.0'
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
        const features = await getProtocolV2Features({
          commands: this.device.getCommands(),
          descriptor: this.device.originalDescriptor,
          onDeviceInfoError: error => {
            Log.debug('Protocol V2 post-update DevGetDeviceInfo failed:', error);
          },
          timeoutMs: PROTOCOL_V2_SHORT_RESPONSE_TIMEOUT,
        });
        return features;
      } catch (error) {
        lastError = error;
        Log.log('Protocol V2 final reconnect/features not ready yet: ', error);
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

  private async protocolV2CreateFolder(path: string) {
    const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());
    await typedCall('FilesystemDirMake', 'Success', { path });
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
    const chunkSize = PROTOCOL_V2_FILE_CHUNK_SIZE;
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
      const nextOffset = writeRes.message.processed_byte ?? offset + chunkLength;
      if (nextOffset <= offset || nextOffset > payload.byteLength) {
        throw ERRORS.TypedError(
          HardwareErrorCode.EmmcFileWriteFirmwareError,
          `invalid processed_byte ${nextOffset} for offset ${offset}`
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
    const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());
    try {
      await typedCall(
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
      if (isDeviceDisconnectedError(error)) {
        Log.log('Rebooting device');
      } else {
        throw error;
      }
    }
    this.postTipMessage(FirmwareUpdateTipMessage.FirmwareUpdating);
  }

  private async protocolV2Reboot(rebootType: DevRebootType) {
    const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());
    try {
      const res = await typedCall('DevReboot', 'Success', {
        reboot_type: rebootType,
      });
      return res.message;
    } catch (error) {
      if (isDeviceDisconnectedError(error)) {
        return { message: 'Device rebooted successfully' };
      }
      throw error;
    }
  }

  private normalizeErrorMessage(error: unknown): string {
    if (!error) {
      return '';
    }
    if (typeof error === 'string') {
      return error;
    }
    if (typeof error === 'object') {
      const { message } = error as { message?: unknown };
      if (typeof message === 'string') {
        return message;
      }
      if (message !== undefined && message !== null) {
        return String(message);
      }
    }
    return '';
  }
}
