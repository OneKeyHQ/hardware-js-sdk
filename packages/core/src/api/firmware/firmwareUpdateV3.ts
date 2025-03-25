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
import { FirmwareUpdateV3Params } from '../../types/api/firmwareUpdate';

export default class FirmwareUpdateV3 extends BaseMethod<FirmwareUpdateV3Params> {
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
      { name: 'forcedUpdateRes', type: 'boolean' },
      { name: 'bootloaderVersion', type: 'array' },
    ]);

    this.params = {
      bleBinary: payload.bleBinary,
      firmwareBinary: payload.firmwareBinary,
      forcedUpdateRes: payload.forcedUpdateRes,
      bleVersion: payload.bleVersion,
      bootloaderVersion: payload.bootloaderVersion,
      firmwareVersion: payload.firmwareVersion,
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
        const firmwareBinary = (
          await getBinary({
            features,
            version: params.firmwareVersion,
            updateType: 'firmware',
            isUpdateBootloader: false,
          })
        ).binary;
        allBinaryMap.push({
          fileName: 'firmware.bin',
          binary: firmwareBinary,
        });
        postProgressTip(device, 'DownloadFirmwareSuccess', this.postMessage);
      } else if (params.firmwareBinary) {
        allBinaryMap.push({
          fileName: 'firmware.bin',
          binary: params.firmwareBinary,
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
      } else if (params.bleBinary) {
        allBinaryMap.push({
          fileName: 'ble-firmware.bin',
          binary: params.bleBinary,
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
      const bootloaderRes = await enterBootloaderMode(
        this.device,
        this.postMessage,
        this.payload.connectId
      );
      if (!bootloaderRes) {
        throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'enter bootloader mode error');
      }
      await this.device.acquire();
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
      if (params.firmwareVersion || params.bleVersion) {
        const eraseCommand = 'FirmwareErase';
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

      // TODO: 触发升级的逻辑，待确定
      const response = await typedCall('FirmwareUpdateEmmc', 'Success', {
        path: '0:/updates/',
        reboot_on_success: bootloaderRes,
      });
      if (response.type !== 'Success') {
        throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'firmware update error');
      }

      // TODO： 轮询，获取硬件当前状态，返回给前端
    }
  }
}
