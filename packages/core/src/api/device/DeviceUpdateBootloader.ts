import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { RebootType } from '@onekeyfe/hd-transport';

import { UI_REQUEST } from '../../constants/ui-request';
import { FirmwareUpdateTipMessage } from '../../events/ui-request';
import { FirmwareUpdateBaseMethod } from '../firmware/FirmwareUpdateBaseMethod';
import { getSysResourceBinary } from '../firmware/getBinary';
import { updateBootloader, updateBootloaderFromByteSource } from '../firmware/uploadFirmware';
import { DeviceModelToTypes } from '../../types';
import { DataManager } from '../../data-manager';
import {
  checkBootloaderByteSourceLength,
  checkBootloaderLength,
} from '../firmware/updateBootloader';
import { getDeviceUUID, getFirmwareType } from '../../utils';
import {
  FirmwareUpdateErrorCode,
  MemoryByteSource,
  createFirmwareUpdateError,
  firmwareHostBindingRegistry,
  openFirmwareArtifactByteSource,
  validatePreparedPlan,
} from '../../firmware-update';

import type { DeviceUpdateBootloaderParams } from '../../types/api/deviceUpdateBootloader';
import type { EFirmwareType } from '@onekeyfe/hd-shared';
import type { Device } from '../../device/Device';
import type { Features } from '../../types';
import type { FirmwareByteSource } from '../../firmware-update';

export default class DeviceUpdateBootloader extends FirmwareUpdateBaseMethod<any> {
  init() {
    this.allowDeviceMode = [UI_REQUEST.BOOTLOADER, UI_REQUEST.NOT_INITIALIZE];
    this.requireDeviceMode = [];
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  async updateBootloaderWithEmmcFileWrite(_device: Device, binary: ArrayBuffer) {
    const source = new MemoryByteSource(binary);
    try {
      return await this.updateBootloaderWithEmmcFileWriteFromByteSource(_device, source);
    } finally {
      await source.close();
    }
  }

  async updateBootloaderWithEmmcFileWriteFromByteSource(
    _device: Device,
    source: FirmwareByteSource
  ) {
    const filePath = '0:boot/bootloader.bin';

    this.postTipMessage(FirmwareUpdateTipMessage.StartTransferData);

    // Use the more robust emmcCommonUpdateProcess from FirmwareUpdateBaseMethod
    await this.emmcCommonUpdateFromByteSource({
      source,
      filePath,
    });

    this.postTipMessage(FirmwareUpdateTipMessage.ConfirmOnDevice);

    // Reboot to apply bootloader update using the inherited reboot method
    await this.reboot(RebootType.Normal); // Normal reboot (RebootType.Normal = 0)

    this.postTipMessage(FirmwareUpdateTipMessage.UpdateBootloaderSuccess);
    return true;
  }

  async updateTouchBootloader({
    device,
    features,
    firmwareType,
  }: {
    device: Device;
    features?: Features;
    firmwareType: EFirmwareType;
  }) {
    let { binary } = this.payload;
    if (!binary) {
      this.postTipMessage(FirmwareUpdateTipMessage.CheckLatestUiResource);
      const resourceUrl = features
        ? DataManager.getBootloaderResource(features, firmwareType)
        : null;
      if (resourceUrl) {
        this.postTipMessage(FirmwareUpdateTipMessage.DownloadLatestBootloaderResource);
        const resource = await getSysResourceBinary(resourceUrl);
        this.postTipMessage(FirmwareUpdateTipMessage.DownloadLatestBootloaderResourceSuccess);
        if (resource) {
          binary = resource.binary;
        }
      }
    }

    if (!checkBootloaderLength(binary)) {
      throw ERRORS.TypedError(HardwareErrorCode.CheckDownloadFileError);
    }

    // Check if device is in bootloader mode
    if (features && device.isBootloader()) {
      // Use emmcFileWrite + reboot logic for bootloader mode
      this.postTipMessage(FirmwareUpdateTipMessage.UpdateBootloader);
      return this.updateBootloaderWithEmmcFileWrite(device, binary);
    }

    if (features && !device.isBootloader()) {
      // Use original updateBootloader logic for normal mode
      await updateBootloader(
        this.device.getCommands().typedCall.bind(this.device.getCommands()),
        this.postMessage,
        device,
        binary
      );
      return Promise.resolve(true);
    }
  }

  async run() {
    const { device } = this;
    const { features } = device;

    const payload = this.payload as DeviceUpdateBootloaderParams;
    if (payload.preparedPlan && Object.prototype.hasOwnProperty.call(payload, 'binary')) {
      throw ERRORS.TypedError(
        HardwareErrorCode.CallMethodInvalidParameter,
        'preparedPlan cannot be combined with binary'
      );
    }

    const deviceType = device.getCurrentDeviceType();
    const deviceFirmwareType = getFirmwareType(features);
    const firmwareType = payload.firmwareType ?? deviceFirmwareType;

    if (DeviceModelToTypes.model_touch.includes(deviceType)) {
      if (payload.preparedPlan) {
        const preparedPlan = validatePreparedPlan(payload.preparedPlan);
        if (
          !features ||
          preparedPlan.device.identity !== getDeviceUUID(features) ||
          preparedPlan.device.model !== deviceType
        ) {
          throw createFirmwareUpdateError(
            FirmwareUpdateErrorCode.FirmwareDeviceStateConflict,
            'Prepared bootloader plan belongs to a different device'
          );
        }
        const bootloaderReceipts = preparedPlan.artifactReceipts.filter(
          receipt => receipt.target === 'bootloader'
        );
        if (bootloaderReceipts.length !== 1) {
          throw ERRORS.TypedError(
            HardwareErrorCode.CallMethodInvalidParameter,
            'preparedPlan must contain exactly one bootloader artifact'
          );
        }
        const receipt = bootloaderReceipts[0];
        const preflightSource = await openFirmwareArtifactByteSource(
          firmwareHostBindingRegistry,
          receipt
        );
        await preflightSource.close();
        const source = await openFirmwareArtifactByteSource(firmwareHostBindingRegistry, receipt);
        try {
          if (!(await checkBootloaderByteSourceLength(source))) {
            throw ERRORS.TypedError(HardwareErrorCode.CheckDownloadFileError);
          }
          if (features?.bootloader_mode) {
            this.postTipMessage(FirmwareUpdateTipMessage.UpdateBootloader);
            return await this.updateBootloaderWithEmmcFileWriteFromByteSource(device, source);
          }
          if (features) {
            await updateBootloaderFromByteSource(
              this.device.getCommands().typedCall.bind(this.device.getCommands()),
              this.postMessage,
              device,
              source
            );
            return true;
          }
        } finally {
          await source.close();
        }
      }
      return this.updateTouchBootloader({ device, features, firmwareType });
    }

    return Promise.resolve(true);
  }
}
