import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { RebootType } from '@onekeyfe/hd-transport';

import { UI_REQUEST } from '../../constants/ui-request';
import { FirmwareUpdateTipMessage } from '../../events/ui-request';
import { FirmwareUpdateBaseMethod } from '../firmware/FirmwareUpdateBaseMethod';
import { getSysResourceBinary } from '../firmware/getBinary';
import { updateBootloader, updateBootloaderFromSource } from '../firmware/uploadFirmware';
import { DeviceModelToTypes } from '../../types';
import { DataManager } from '../../data-manager';
import { checkBootloaderLength, checkBootloaderSourceLength } from '../firmware/updateBootloader';
import { openFirmwareByteSource } from '../firmware/FirmwareArtifactSource';
import { FirmwareCheckpointWriter } from '../firmware/FirmwareCheckpoint';
import { resolveFirmwareUpdateHostBinding } from '../firmware/FirmwareHostBinding';
import { assertFirmwareUpdatePreparedPlanBinding } from '../firmware/FirmwareUpdatePreparedPlan';

import type { DeviceUpdateBootloaderParams } from '../../types/api/deviceUpdateBootloader';
import type { EFirmwareType } from '@onekeyfe/hd-shared';
import type { Device } from '../../device/Device';
import type { Features } from '../../types';
import type { FirmwareByteSource } from '../firmware/FirmwareArtifactSource';

export default class DeviceUpdateBootloader extends FirmwareUpdateBaseMethod<any> {
  init() {
    this.allowDeviceMode = [UI_REQUEST.BOOTLOADER, UI_REQUEST.NOT_INITIALIZE];
    this.requireDeviceMode = [];
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  async updateBootloaderWithEmmcFileWrite(_device: Device, binary: ArrayBuffer) {
    const filePath = '0:boot/bootloader.bin';

    this.postTipMessage(FirmwareUpdateTipMessage.StartTransferData);

    // Use the more robust emmcCommonUpdateProcess from FirmwareUpdateBaseMethod
    await this.emmcCommonUpdateProcess({
      payload: binary,
      filePath,
    });

    this.postTipMessage(FirmwareUpdateTipMessage.ConfirmOnDevice);

    // Reboot to apply bootloader update using the inherited reboot method
    await this.reboot(RebootType.Normal); // Normal reboot (RebootType.Normal = 0)

    this.postTipMessage(FirmwareUpdateTipMessage.UpdateBootloaderSuccess);
    return true;
  }

  async updateBootloaderWithEmmcFileWriteFromSource(_device: Device, source: FirmwareByteSource) {
    const filePath = '0:boot/bootloader.bin';

    this.postTipMessage(FirmwareUpdateTipMessage.StartTransferData);
    await this.emmcCommonUpdateProcessFromSource({
      source,
      filePath,
    });
    this.postTipMessage(FirmwareUpdateTipMessage.ConfirmOnDevice);
    await this.reboot(RebootType.Normal);
    this.postTipMessage(FirmwareUpdateTipMessage.UpdateBootloaderSuccess);
    return true;
  }

  async updateTouchBootloader({
    device,
    features,
    firmwareType,
    binary: preparedBinary,
    source: preparedSource,
    checkpointWriter,
  }: {
    device: Device;
    features?: Features;
    firmwareType: EFirmwareType;
    binary?: ArrayBuffer;
    source?: FirmwareByteSource;
    checkpointWriter: FirmwareCheckpointWriter;
  }) {
    if (preparedSource) {
      if (!(await checkBootloaderSourceLength(preparedSource))) {
        throw ERRORS.TypedError(HardwareErrorCode.CheckDownloadFileError);
      }
      if (features && device.isBootloader()) {
        this.postTipMessage(FirmwareUpdateTipMessage.UpdateBootloader);
        await checkpointWriter.commit({
          stage: 'FILE_TRANSFER_STARTED',
          target: 'bootloader',
        });
        const result = await this.updateBootloaderWithEmmcFileWriteFromSource(
          device,
          preparedSource
        );
        await checkpointWriter.commit({
          stage: 'FILE_TRANSFER_COMPLETED',
          target: 'bootloader',
        });
        await checkpointWriter.commit({
          stage: 'FINAL_VERIFIED',
          target: 'bootloader',
        });
        return result;
      }
      if (features && !device.isBootloader()) {
        await checkpointWriter.commit({
          stage: 'FILE_TRANSFER_STARTED',
          target: 'bootloader',
        });
        await updateBootloaderFromSource(
          this.device.getCommands().typedCall.bind(this.device.getCommands()),
          this.postMessage,
          device,
          preparedSource
        );
        await checkpointWriter.commit({
          stage: 'FILE_TRANSFER_COMPLETED',
          target: 'bootloader',
        });
        await checkpointWriter.commit({
          stage: 'FINAL_VERIFIED',
          target: 'bootloader',
        });
        return true;
      }
    }

    let binary = preparedBinary;
    if (!binary) {
      if (DataManager.getSettings('firmwareManifestMode') === 'external-only') {
        throw ERRORS.TypedError(
          HardwareErrorCode.RuntimeError,
          'Bootloader must be prepared by the external firmware host',
          {
            firmwareUpdateCode: 'FirmwareArtifactsNotPrepared',
            artifactName: 'bootloader',
          }
        );
      }
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

    if (!binary || !checkBootloaderLength(binary)) {
      throw ERRORS.TypedError(HardwareErrorCode.CheckDownloadFileError);
    }

    // Check if device is in bootloader mode
    if (features && device.isBootloader()) {
      // Use emmcFileWrite + reboot logic for bootloader mode
      this.postTipMessage(FirmwareUpdateTipMessage.UpdateBootloader);
      await checkpointWriter.commit({
        stage: 'FILE_TRANSFER_STARTED',
        target: 'bootloader',
      });
      const result = await this.updateBootloaderWithEmmcFileWrite(device, binary);
      await checkpointWriter.commit({
        stage: 'FILE_TRANSFER_COMPLETED',
        target: 'bootloader',
      });
      await checkpointWriter.commit({
        stage: 'FINAL_VERIFIED',
        target: 'bootloader',
      });
      return result;
    }

    if (features && !device.isBootloader()) {
      // Use original updateBootloader logic for normal mode
      await checkpointWriter.commit({
        stage: 'FILE_TRANSFER_STARTED',
        target: 'bootloader',
      });
      await updateBootloader(
        this.device.getCommands().typedCall.bind(this.device.getCommands()),
        this.postMessage,
        device,
        binary
      );
      await checkpointWriter.commit({
        stage: 'FILE_TRANSFER_COMPLETED',
        target: 'bootloader',
      });
      await checkpointWriter.commit({
        stage: 'FINAL_VERIFIED',
        target: 'bootloader',
      });
      return Promise.resolve(true);
    }
  }

  async run() {
    const { device } = this;
    const { features } = device;

    const payload = this.payload as DeviceUpdateBootloaderParams;
    const hostBinding = payload.artifact
      ? resolveFirmwareUpdateHostBinding(payload.hostBindingGeneration)
      : undefined;
    const executionParams = {
      ...payload,
      artifactReader: hostBinding?.artifactReader ?? payload.artifactReader,
      checkpointSink: hostBinding?.checkpointSink ?? payload.checkpointSink,
    };
    const checkpointWriter = new FirmwareCheckpointWriter(executionParams, {
      required: !!hostBinding,
    });
    if (payload.artifact) {
      assertFirmwareUpdatePreparedPlanBinding({
        preparedPlan: payload.preparedPlan,
        executor: 'v2',
        scopeTargets: ['bootloader'],
        bindings: [
          {
            target: 'bootloader',
            artifact: payload.artifact,
          },
        ],
      });
      const source = await openFirmwareByteSource({
        artifact: payload.artifact,
        reader: executionParams.artifactReader,
      });
      if (!source) {
        throw ERRORS.TypedError(
          HardwareErrorCode.RuntimeError,
          'Bootloader artifact is not prepared'
        );
      }
      try {
        const deviceType = device.getCurrentDeviceType();
        const deviceFirmwareType = device.getCurrentFirmwareType();
        const firmwareType = payload.firmwareType ?? deviceFirmwareType;
        if (DeviceModelToTypes.model_touch.includes(deviceType)) {
          return await this.updateTouchBootloader({
            device,
            features,
            firmwareType,
            source,
            checkpointWriter,
          });
        }
        return true;
      } finally {
        await source.close();
      }
    }

    const { binary } = payload;
    const deviceType = device.getCurrentDeviceType();
    const deviceFirmwareType = device.getCurrentFirmwareType();
    const firmwareType = payload.firmwareType ?? deviceFirmwareType;

    if (DeviceModelToTypes.model_touch.includes(deviceType)) {
      return this.updateTouchBootloader({
        device,
        features,
        firmwareType,
        binary,
        checkpointWriter,
      });
    }

    return Promise.resolve(true);
  }
}
