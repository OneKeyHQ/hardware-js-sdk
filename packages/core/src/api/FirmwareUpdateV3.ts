import { Deferred, ERRORS, HardwareErrorCode, EDeviceType, wait } from '@onekeyfe/hd-shared';
import semver from 'semver';
import JSZip from 'jszip';
import { UI_REQUEST, FirmwareUpdateTipMessage } from '../events/ui-request';
import { validateParams } from './helpers/paramsValidator';

import {
  getDeviceType,
  getDeviceBootloaderVersion,
  getDeviceBLEFirmwareVersion,
  getDeviceFirmwareVersion,
  LoggerNames,
  getLogger,
} from '../utils';
import { getBinary, getSysResourceBinary } from './firmware/getBinary';
import { DataManager } from '../data-manager';
import { FirmwareUpdateV3Params } from '../types/api/firmwareUpdate';
import { FirmwareUpdateBaseMethod } from './firmware/FirmwareUpdateBaseMethod';
import { DevicePool } from '../device/DevicePool';

const Log = getLogger(LoggerNames.Method);

export const MIN_UPDATE_V3_BOOTLOADER_VERSION = '2.8.0';

/**
 * FirmwareUpdateV3 flow
   1. StartDownloadFirmware
   2. FinishDownloadFirmware
   3. AutoRebootToBootloader
   4. GoToBootloaderSuccess
   5. StartTransferData
   6. ConfirmOnDevice
   7. FirmwareUpdating
   8. FirmwareUpdateCompleted
 */
export default class FirmwareUpdateV3 extends FirmwareUpdateBaseMethod<FirmwareUpdateV3Params> {
  checkPromise: Deferred<any> | null = null;

  init() {
    this.notAllowDeviceMode = [UI_REQUEST.BOOTLOADER, UI_REQUEST.INITIALIZE];
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
    };
  }

  async run() {
    const { device } = this;
    const { features } = device;

    const deviceType = getDeviceType(features);
    const bootloaderCurrVersion = getDeviceBootloaderVersion(features).join('.');

    this.validateDeviceAndVersion(deviceType, bootloaderCurrVersion);

    if (!features) {
      throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Device features not available');
    }

    let resourceBinary: ArrayBuffer | null = null;
    let fwBinaryMap: { fileName: string; binary: ArrayBuffer }[] = [];
    let bootloaderBinary: ArrayBuffer | null = null;
    try {
      this.postTipMessage(FirmwareUpdateTipMessage.StartDownloadFirmware);
      resourceBinary = await this.prepareResourceBinary();
      fwBinaryMap = await this.prepareFirmwareAndBleBinary();
      bootloaderBinary = await this.prepareBootloaderBinary();
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

    await this.enterBootloaderMode();

    await this.executeUpdate({
      resourceBinary,
      fwBinaryMap,
      bootloaderBinary,
    });
  }

  private validateDeviceAndVersion(deviceType: EDeviceType, bootloaderVersion: string) {
    if (deviceType === EDeviceType.Unknown) {
      throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'unknown device type');
    }

    if (deviceType !== EDeviceType.Pro) {
      throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'only pro device is supported');
    }

    if (semver.lt(bootloaderVersion, MIN_UPDATE_V3_BOOTLOADER_VERSION)) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'bootloader version needs to be updated'
      );
    }
  }

  private async prepareResourceBinary() {
    if (this.params.resourceBinary) {
      return this.params.resourceBinary;
    }
    const { features } = this.device;
    if (!features) return null;
    const resourceUrl = DataManager.getSysResourcesLatestRelease(
      features,
      this.params.forcedUpdateRes
    );

    if (resourceUrl) {
      const resource = (await getSysResourceBinary(resourceUrl)).binary;
      return resource;
    }
    Log.warn('No resource url found');
    return null;
  }

  private async prepareBootloaderBinary(): Promise<ArrayBuffer | null> {
    if (this.params.bootloaderBinary) {
      return this.params.bootloaderBinary;
    }
    const { features } = this.device;
    if (!features) return null;

    if (this.params.bootloaderVersion) {
      const bootResourceUrl = DataManager.getBootloaderResource(features);
      if (bootResourceUrl) {
        const bootBinary = (await getSysResourceBinary(bootResourceUrl)).binary;
        return bootBinary;
      }
    }
    return null;
  }

  private async prepareFirmwareAndBleBinary() {
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
        });
        fwBinaryMap.push({
          fileName: 'ble-firmware.bin',
          binary: bleBinary.binary,
        });
      }
    }
    return fwBinaryMap;
  }

  private async executeUpdate({
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

    if (resourceBinary) {
      totalSize += resourceBinary.byteLength;
    }
    for (const resource of fwBinaryMap) {
      totalSize += resource.binary.byteLength;
    }
    if (bootloaderBinary) {
      totalSize += bootloaderBinary.byteLength;
    }

    this.postTipMessage(FirmwareUpdateTipMessage.StartTransferData);
    // 处理资源文件
    if (resourceBinary) {
      const file = await JSZip.loadAsync(resourceBinary);
      const files = Object.entries(file.files);
      for (const [fileName, file] of files) {
        const name = fileName.split('/').pop();
        if (!file.dir && fileName.indexOf('__MACOSX') === -1 && name) {
          const data = await file.async('arraybuffer');
          processedSize = await this.emmcCommonUpdateProcess({
            payload: data,
            filePath: `0:res/${name}`,
            processedSize,
            totalSize,
          });
        }
      }
    }

    if (bootloaderBinary) {
      processedSize = await this.emmcCommonUpdateProcess({
        payload: bootloaderBinary,
        filePath: `0:boot/bootloader.bin`,
        processedSize,
        totalSize,
      });
    }

    await this.createUpdatesFolderIfNotExists(`0:updates/`);

    for (const fwbinary of fwBinaryMap) {
      if (fwbinary) {
        processedSize = await this.emmcCommonUpdateProcess({
          payload: fwbinary.binary,
          filePath: `0:updates/${fwbinary.fileName}`,
          processedSize,
          totalSize,
        });
      }
    }

    // trigger firmware update, support folder updates
    try {
      this.postTipMessage(FirmwareUpdateTipMessage.ConfirmOnDevice);
      await this.startEmmcFirmwareUpdate({
        path: '0:updates',
      });
    } catch (error) {
      Log.error('triggerFirmwareUpdateEmmc error: ', error);
    }

    this.postProcessingMessage('firmware');
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());
        const featuresRes = await Promise.race<any>([
          typedCall('GetFeatures', 'Features', {}),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('GetFeatures timeout after 3 seconds')), 3000);
          }),
        ]);
        const features = featuresRes.message;
        this.postTipMessage(FirmwareUpdateTipMessage.FirmwareUpdateCompleted);
        DevicePool.resetState();
        return {
          bootloaderVersion: getDeviceBootloaderVersion(features).join('.'),
          bleVersion: getDeviceBLEFirmwareVersion(features).join('.'),
          firmwareVersion: getDeviceFirmwareVersion(features).join('.'),
        };
      } catch (error) {
        if (error.message && error.message.includes('Update mode')) {
          const updateParts = error.message.split('Update mode ');
          const progressValue = updateParts[1] ?? '0';
          const progress = parseInt(progressValue, 10) || 0;
          this.postProgressMessage(progress, 'installingFirmware');
          await wait(1000);
        } else {
          /**
           * Needs second reconnect case:
           * 1. While including 'Ble firmwware' in ble connect type
           * 2. While including bootloader upgrade
           */
          const reconnectTimeout =
            this.isBleReconnect() && (this.params.bleBinary || this.params.bleVersion)
              ? 3 * 60 * 1000 // 3 minutes for BLE reconnect
              : 60 * 1000; // 1 minute for normal reconnect

          await this.waitForDeviceReconnect(reconnectTimeout);
        }
      }
    }
  }

  /**
   * @description Reconnect device - While update with bootloader, it will reconnect device
   * @param {number} timeout - The timeout for the reconnection
   */
  async waitForDeviceReconnect(timeout: number) {
    const startTime = Date.now();
    const isBleReconnect = this.isBleReconnect();
    while (Date.now() - startTime < timeout) {
      try {
        if (isBleReconnect) {
          try {
            await this.device.deviceConnector?.acquire(
              this.device.originalDescriptor.id,
              null,
              true
            );
            const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());
            await Promise.race([
              typedCall('Initialize', 'Features', {}),
              new Promise((_, reject) => {
                setTimeout(() => {
                  reject(ERRORS.TypedError(HardwareErrorCode.DeviceInitializeFailed));
                }, 3000);
              }),
            ]);
            return;
          } catch (e) {
            // ignore error because of device is not connected
            Log.log('catch Bluetooth error when device is restarting: ', e);
          }
        } else {
          const deviceDiff = await this.device.deviceConnector?.enumerate();
          const devicesDescriptor = deviceDiff?.descriptors ?? [];
          const { deviceList } = await DevicePool.getDevices(devicesDescriptor, this.connectId);

          if (deviceList.length === 1) {
            this.device.updateFromCache(deviceList[0]);
            await this.device.acquire();
            this.device.commands.disposed = false;
            this.device.getCommands().mainId = this.device.mainId ?? '';
            return;
          }
        }
        await wait(1000);
      } catch (error) {
        console.error('Device reconnect failed: ', error);
        Log.error('Device reconnect failed:', error);
        await wait(1000);
      }
    }

    throw ERRORS.TypedError(
      HardwareErrorCode.DeviceNotFound,
      `Device not reconnected within ${timeout / 1000}s`
    );
  }
}
