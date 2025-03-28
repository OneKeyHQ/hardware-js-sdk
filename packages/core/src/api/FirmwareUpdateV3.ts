import { Deferred, ERRORS, HardwareErrorCode, EDeviceType, wait } from '@onekeyfe/hd-shared';
import semver from 'semver';
import JSZip from 'jszip';
import { UI_REQUEST, FirmwareUpdateTipMessage } from '../events/ui-request';
import { validateParams } from './helpers/paramsValidator';

import { getDeviceType, getDeviceBootloaderVersion, LoggerNames, getLogger } from '../utils';
import { getBinary, getSysResourceBinary } from './firmware/getBinary';
import { DataManager } from '../data-manager';
import { FirmwareUpdateV3Params } from '../types/api/firmwareUpdate';
import { FirmwareUpdateBaseMethod } from './firmware/FirmwareUpdateBaseMethod';
import { DevicePool } from '../device/DevicePool';

const Log = getLogger(LoggerNames.Method);

export const MIN_UPDATE_V3_BOOTLOADER_VERSION = '2.8.0';
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
      resourceBinary = await this.prepareResourceBinary();
      fwBinaryMap = await this.prepareFirmwareAndBleBinary();
      bootloaderBinary = await this.prepareBootloaderBinary();
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
    this.postTipMessage(FirmwareUpdateTipMessage.CheckLatestUiResource);
    const resourceUrl = DataManager.getSysResourcesLatestRelease(
      features,
      this.params.forcedUpdateRes
    );

    if (resourceUrl) {
      this.postTipMessage(FirmwareUpdateTipMessage.DownloadLatestUiResource);
      const resource = (await getSysResourceBinary(resourceUrl)).binary;
      this.postTipMessage(FirmwareUpdateTipMessage.DownloadLatestUiResourceSuccess);
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
      this.postTipMessage(FirmwareUpdateTipMessage.DownloadLatestBootloaderResource);
      const bootResourceUrl = DataManager.getBootloaderResource(features);
      if (bootResourceUrl) {
        const bootBinary = (await getSysResourceBinary(bootResourceUrl)).binary;
        this.postTipMessage(FirmwareUpdateTipMessage.DownloadLatestBootloaderResourceSuccess);
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
        this.postTipMessage(FirmwareUpdateTipMessage.DownloadFirmware);
        const firmwareBinary = (
          await getBinary({
            features,
            version: this.params.firmwareVersion,
            updateType: 'firmware',
            isUpdateBootloader: false,
          })
        ).binary;
        this.postTipMessage(FirmwareUpdateTipMessage.DownloadFirmwareSuccess);
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
        this.postTipMessage(FirmwareUpdateTipMessage.DownloadBleFirmware);
        const bleBinary = await getBinary({
          features,
          version: this.params.bleVersion,
          updateType: 'ble',
        });
        this.postTipMessage(FirmwareUpdateTipMessage.DownloadBleFirmwareSuccess);
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

    // trigger firmware update, support folder update
    try {
      this.postTipMessage(FirmwareUpdateTipMessage.ConfirmOnDevice);
      await this.startEmmcFirmwareUpdate({
        path: '0:updates',
      });
    } catch (error) {
      Log.error('triggerFirmwareUpdateEmmc error: ', error);
    }

    // TODO: Is this necessary?
    this.postProcessingMessage('firmware');

    /**
     * Needs to success immediately case:
     * 1. only bootloader update
     * 2. include ble update in isBleConnected
     */
    const isBleReconnect = this.isBleReconnect();
    if (
      (bootloaderBinary && fwBinaryMap.length === 0) ||
      ((this.params.bleBinary || this.params.bleVersion) && isBleReconnect)
    ) {
      this.postTipMessage(FirmwareUpdateTipMessage.FirmwareUpdateCompleted);
      return;
    }
    await wait(500);
    // 每三秒轮询一次，直到更新完成
    await this.pollFirmwareUpdateStatus();
  }

  /**
   * @description Reconnect device - While update with bootloader, it will reconnect device
   * @param isBleReconnect - Whether the device is connected via BLE
   * @param maxAttempts - Maximum number of attempts
   * @returns {Promise<boolean>} - Returns true if the device is successfully reconnected, otherwise throws an error
   */
  async reconnectDevice(maxAttempts = 10) {
    const isBleReconnect = this.isBleReconnect();
    let attempts = 0;
    while (attempts < maxAttempts) {
      if (isBleReconnect) {
        try {
          await this.device.deviceConnector?.acquire(this.device.originalDescriptor.id, null, true);
          await this.device.initialize();
          if (this.device.features?.bootloader_mode) {
            return true;
          }
        } catch (e) {
          // ignore error because of device is not connected
          Log.log('catch Bluetooth error when device is restarting: ', e);
        }
      } else {
        const deviceDiff = await this.device.deviceConnector?.enumerate();
        const devicesDescriptor = deviceDiff?.descriptors ?? [];
        const { deviceList } = await DevicePool.getDevices(devicesDescriptor, this.connectId);

        if (deviceList.length === 1 && deviceList[0]?.features?.bootloader_mode) {
          this.device.updateFromCache(deviceList[0]);
          await this.device.acquire();
          this.device.commands.disposed = false;
          return true;
        }
      }

      await wait(3000);
      attempts++;
    }

    throw ERRORS.TypedError(
      HardwareErrorCode.RuntimeError,
      'Failed to reconnect device after maximum attempts'
    );
  }

  private async pollFirmwareUpdateStatus(maxAttempts = 30): Promise<boolean> {
    this.postTipMessage(FirmwareUpdateTipMessage.FirmwareUpdating);
    await this.reconnectDevice();

    for (let attempts = 0; attempts < maxAttempts; attempts++) {
      try {
        const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());
        await wait(1000);
        let timeoutId: NodeJS.Timeout | undefined;
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('Device reboot timeout'));
          }, 3000);
        });

        try {
          await Promise.race([typedCall('GetFeatures', 'Features', {}), timeoutPromise]);
          clearTimeout(timeoutId);
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      } catch (error) {
        if (error.message.includes('Update mode')) {
          const updateParts = error.message.split('Update mode ');
          const progressValue = updateParts[1] ?? '0';
          const progress = parseInt(progressValue, 10) || 0;
          this.postProgressMessage(progress);
        } else {
          // TODO: 这里最后一个请求会一直处在等待中状态，需要cancel。
          this.postTipMessage(FirmwareUpdateTipMessage.FirmwareUpdateCompleted);
          return true;
        }
      }
    }

    throw ERRORS.TypedError(
      HardwareErrorCode.RuntimeError,
      'Firmware update status check exceeded maximum attempts'
    );
  }
}
