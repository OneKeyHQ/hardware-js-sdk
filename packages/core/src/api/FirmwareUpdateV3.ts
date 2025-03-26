import { Deferred, ERRORS, HardwareErrorCode, EDeviceType } from '@onekeyfe/hd-shared';
import semver from 'semver';
import JSZip from 'jszip';
import { Features } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../events/ui-request';
import { validateParams } from './helpers/paramsValidator';

import { getDeviceType, getDeviceBootloaderVersion } from '../utils';
import { getBinary, getSysResourceBinary } from './firmware/getBinary';
import { DataManager } from '../data-manager';
import { FirmwareUpdateV3Params } from '../types/api/firmwareUpdate';
import { FirmwareBase } from './firmware/firmwareBase';
import { FirmwareUpdateTipMessage } from '../constants/ui-request';

export default class FirmwareUpdateV3 extends FirmwareBase<FirmwareUpdateV3Params> {
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

    const _resourceBinary = await this.prepareResourceBinary(features);

    const fwBinaryMap = await this.prepareFirmwareAndBleBinary(features);

    const bootloaderBinary = await this.prepareBootloaderBinary(features);

    await this.enterBootloaderMode();

    await this.executeUpdate({
      resourceBinary: _resourceBinary,
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

    if (semver.lt(bootloaderVersion, '2.8.0')) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'bootloader version needs to be updated'
      );
    }
  }

  private async prepareResourceBinary(features: Features) {
    if (this.params.resourceBinary) {
      return this.params.resourceBinary;
    }
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
    return null;
  }

  private async prepareBootloaderBinary(features: Features): Promise<ArrayBuffer | null> {
    if (this.params.bootloaderBinary) {
      return this.params.bootloaderBinary;
    }
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

  private async prepareFirmwareAndBleBinary(features: Features) {
    const fwBinaryMap: { fileName: string; binary: ArrayBuffer }[] = [];
    if (this.params.firmwareBinary) {
      fwBinaryMap.push({
        fileName: 'firmware.bin',
        binary: this.params.firmwareBinary,
      });
    } else if (this.params.firmwareVersion) {
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

    if (this.params.bleBinary) {
      fwBinaryMap.push({
        fileName: 'ble-firmware.bin',
        binary: this.params.bleBinary,
      });
    } else if (this.params.bleVersion) {
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
    // 计算所有文件的总大小
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

    // 处理资源文件
    if (resourceBinary) {
      const file = await JSZip.loadAsync(resourceBinary);
      const files = Object.entries(file.files);
      for (const [fileName, file] of files) {
        const name = fileName.split('/').pop();
        if (!file.dir && fileName.indexOf('__MACOSX') === -1 && name) {
          const data = await file.async('arraybuffer');
          await this.emmcCommonUpdateProcess({
            payload: data,
            filePath: `0:res/${name}`,
            manulProgress: Math.floor((processedSize / totalSize) * 100),
          });
          processedSize += data.byteLength;
        }
      }
    }

    if (bootloaderBinary) {
      await this.emmcCommonUpdateProcess({
        payload: bootloaderBinary,
        filePath: `0:boot/bootloader.bin`,
        manulProgress: Math.floor((processedSize / totalSize) * 100),
      });
      processedSize += bootloaderBinary.byteLength;
    }

    await this.createUpdatesFolderIfNotExists(`0:updates/`);
    if (this.params.firmwareVersion || this.params.bleVersion) {
      await this.firmwareErase();
    }

    for (const fwbinary of fwBinaryMap) {
      if (fwbinary) {
        await this.emmcCommonUpdateProcess({
          payload: fwbinary.binary,
          filePath: `0:updates/${fwbinary.fileName}`,
          manulProgress: Math.floor((processedSize / totalSize) * 100),
        });
        processedSize += fwbinary.binary.byteLength;
      }
    }

    // trigger firmware update, support folder update
    await this.triggerFirmwareUpdateEmmc({
      path: '0:updates',
    });
  }
}
