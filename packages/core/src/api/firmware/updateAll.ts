import { Deferred, ERRORS, HardwareErrorCode, EDeviceType } from '@onekeyfe/hd-shared';
import semver from 'semver';
import JSZip from 'jszip';
import { UI_REQUEST } from '../../constants/ui-request';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
// import { DevicePool } from '../device/DevicePool';
// import { getBinary, getInfo, getSysResourceBinary } from './firmware/utils/getBinary';
// import { uploadFirmware } from './firmware/uploadFirmware';
// import { updateResources } from './firmware/uploadResource';
// import { getDeviceType, getDeviceFirmwareVersion } from '../utils';
// import { createUiMessage } from '../events/ui-request';
// import { DataManager } from '../data-manager';
// import { enterBootloaderMode } from './firmware/utils/bootloaderHelper';

// import type { KnownDevice, Features } from '../types';
// import { postProgressTip } from './utils/uiHelper';
import { getDeviceBootloaderVersion, getDeviceType } from '../../utils';
import { enterBootloaderMode } from './utils/bootloaderHelper';
import { postProgressTip } from './utils/uiHelper';
import { emmcCommonUpdateProcess, createFolder } from './utils/typedCallHelper';
import { getBinary, getSysResourceBinary } from './utils/getBinary';
// import { updateResources } from './uploadResource';
import { DataManager } from '../../data-manager';
import { UpdateAllBinaryParams } from '../../types/api/updateAll';

export default class UpdateAll extends BaseMethod<UpdateAllBinaryParams> {
  checkPromise: Deferred<any> | null = null;

  init() {
    this.notAllowDeviceMode = [UI_REQUEST.BOOTLOADER, UI_REQUEST.INITIALIZE];
    this.requireDeviceMode = [];
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;

    const { payload } = this;

    validateParams(payload, [
      { name: 'binary', type: 'buffer' },
      { name: 'forcedUpdateRes', type: 'boolean' },
      { name: 'bleVersion', type: 'array' },
      { name: 'bootloaderVersion', type: 'array' },
      { name: 'firmwareVersion', type: 'array' },
      { name: 'mcuVersion', type: 'array' },
    ]);

    this.params = {
      binary: payload.binary,
      forcedUpdateRes: payload.forcedUpdateRes,
      bleVersion: payload.bleVersion,
      bootloaderVersion: payload.bootloaderVersion,
      firmwareVersion: payload.firmwareVersion,
      mcuVersion: payload.mcuVersion,
    };
  }

  async run() {
    const { device, params } = this;
    const { features } = device;
    const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());

    const deviceType = getDeviceType(features);
    const bootloaderCurrVersion = getDeviceBootloaderVersion(features).join('.');

    if (deviceType === EDeviceType.Unknown) {
      throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'unknown device type');
    }

    if (deviceType !== EDeviceType.Pro) {
      throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'only pro device is supported');
    }

    if (semver.lt(bootloaderCurrVersion, '4.12.0')) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'bootloader version needs to be updated'
      );
    }

    let resource;
    let bootBinary: ArrayBuffer | null = null;
    const allBinaryMap = [];

    if (features) {
      postProgressTip(device, 'CheckLatestUiResource', this.postMessage);
      // download all resource
      if (params.firmwareVersion) {
        postProgressTip(device, 'DownloadFirmware', this.postMessage);
        const firmwareBinary = await getBinary({
          features,
          version: params.firmwareVersion,
          updateType: 'firmware',
          isUpdateBootloader: false,
        });
        allBinaryMap.push({
          fileName: 'firmware.bin',
          binary: firmwareBinary.binary,
        });
        postProgressTip(device, 'DownloadFirmwareSuccess', this.postMessage);
      }
      if (params.mcuVersion) {
        postProgressTip(device, 'DownloadMcu', this.postMessage);
        const mcuBinary = await getBinary({
          features,
          version: params.mcuVersion,
          updateType: 'mcu',
        });
        allBinaryMap.push({
          fileName: 'mcu-firmware.bin',
          binary: mcuBinary.binary,
        });
      }
      if (params.bleVersion) {
        postProgressTip(device, 'DownloadBle', this.postMessage);
        const bleBinary = await getBinary({
          features,
          version: params.bleVersion,
          updateType: 'ble',
        });
        allBinaryMap.push({
          fileName: 'ble-firmware.bin',
          binary: bleBinary.binary,
        });
      }
      if (params.bootloaderVersion) {
        const bootResourceUrl = DataManager.getBootloaderResource(features);
        if (bootResourceUrl) {
          postProgressTip(device, 'DownloadBootloader', this.postMessage);
          bootBinary = (await getSysResourceBinary(bootResourceUrl)).binary;
          postProgressTip(device, 'DownloadBootloaderSuccess', this.postMessage);
        }
      }
      // TODO： 原来资源更新逻辑
      // postProgressTip(device, 'CheckLatestUiResource', this.postMessage);
      // const resourceUrl = DataManager.getSysResourcesLatestRelease(
      //   features,
      //   params.forcedUpdateRes
      // );
      // if (resourceUrl) {
      //   postProgressTip(device, 'DownloadLatestUiResource', this.postMessage);
      //   resource = await getSysResourceBinary(resourceUrl);
      //   postProgressTip(device, 'DownloadLatestUiResourceSuccess', this.postMessage);
      //   if (resource) {
      //     await updateResources(
      //       this.device.getCommands().typedCall.bind(this.device.getCommands()),
      //       this.postMessage,
      //       device,
      //       resource.binary
      //     );
      //   }
      // }
      await enterBootloaderMode(this.device, this.postMessage, this.payload.connectId);
      await this.device.acquire();
      // TODO： emmc接口实现的resource 更新
      const resourceUrl = DataManager.getSysResourcesLatestRelease(
        features,
        params.forcedUpdateRes
      );
      if (resourceUrl) {
        postProgressTip(device, 'DownloadLatestUiResource', this.postMessage);
        resource = (await getSysResourceBinary(resourceUrl)).binary;
        postProgressTip(device, 'DownloadLatestUiResourceSuccess', this.postMessage);
        if (resource) {
          const file = await JSZip.loadAsync(resource);
          const files = Object.entries(file.files);
          for (const [fileName, file] of files) {
            if (!file.dir) {
              const data = await file.async('arraybuffer');
              await emmcCommonUpdateProcess(
                this.device,
                {
                  payload: data,
                  filePath: `0:/res/${fileName}`,
                },
                this.postMessage
              );
            }
          }
        }
      }

      if (bootBinary) {
        await emmcCommonUpdateProcess(
          this.device,
          {
            payload: bootBinary,
            filePath: `0:/boot/bootloader.bin`,
          },
          this.postMessage
        );
      }
      await createFolder(device, `0:/updates`);
      if (params.binary) {
        // TODO: 包含fw三个文件（ble、se、mcu）和boot
        const zipData = await JSZip.loadAsync(params.binary);
        const files = Object.entries(zipData.files);
        for (const [fileName, file] of files) {
          if (!file.dir) {
            const data = await file.async('arraybuffer');
            await emmcCommonUpdateProcess(
              this.device,
              {
                payload: data,
                filePath: `0:/updates/${fileName}`,
              },
              this.postMessage
            );
          }
        }
      } else {
        if (params.firmwareVersion) {
          const eraseCommand = 'FirmwareErase';
          const eraseRes = await typedCall(eraseCommand as unknown as any, 'Success', {});
          postProgressTip(device, 'FirmwareEraseSuccess', this.postMessage);
          if (eraseRes.type !== 'Success') {
            throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'erase firmware error');
          }
        }

        if (params.bleVersion) {
          const eraseCommand = 'FirmwareErase_ex';
          const eraseRes = await typedCall(eraseCommand as unknown as any, 'Success', {});
          postProgressTip(device, 'FirmwareEraseSuccess', this.postMessage);
          if (eraseRes.type !== 'Success') {
            throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'erase firmware error');
          }
        }

        for (const resource of allBinaryMap) {
          if (resource) {
            await emmcCommonUpdateProcess(
              this.device,
              {
                payload: resource.binary,
                filePath: `0:/updates/${resource.fileName}`,
              },
              this.postMessage
            );
          }
        }
      }

      // TODO: 触发升级的逻辑，待确定

      // TODO： 轮询，获取硬件当前状态，返回给前端
    }
  }
}
