import { EDeviceType, ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import semver from 'semver';

import { UI_REQUEST } from '../../constants/ui-request';
import { BaseMethod } from '../BaseMethod';
import { getSysResourceBinary } from '../firmware/getBinary';
import { updateResources, updateResourcesFromByteSources } from '../firmware/uploadFirmware';
import {
  getDeviceFirmwareVersion,
  getDeviceType,
  getDeviceUUID,
  getFirmwareType,
} from '../../utils';
import { createUiMessage } from '../../events/ui-request';
import { DataManager } from '../../data-manager';
import {
  FirmwareUpdateErrorCode,
  createFirmwareUpdateError,
  firmwareHostBindingRegistry,
  openFirmwareArtifactByteSource,
  validateFirmwareLogicalName,
  validatePreparedPlan,
} from '../../firmware-update';

import type { Deferred } from '@onekeyfe/hd-shared';
import type { Features, KnownDevice } from '../../types';
import type { DeviceFullyUploadResourceParams } from '../../types/api/deviceFullyUploadResource';
import type { FirmwareResourceByteSourceEntry } from '../firmware/uploadFirmware';

export default class DeviceFullyUploadResource extends BaseMethod {
  checkPromise: Deferred<any> | null = null;

  init() {
    this.requireDeviceMode = [];
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  postTipMessage = (message: string) => {
    this.postMessage(
      createUiMessage(UI_REQUEST.FIRMWARE_TIP, {
        device: this.device.toMessageObject() as KnownDevice,
        data: {
          message,
        },
      })
    );
  };

  isSupportResourceUpdate(features: Features, updateType: string) {
    if (updateType !== 'firmware') return false;

    const deviceType = this.device.getCurrentDeviceType();
    const isTouchMode = deviceType === EDeviceType.Touch || deviceType === EDeviceType.Pro;
    const currentVersion = getDeviceFirmwareVersion(features).join('.');

    return isTouchMode && semver.gte(currentVersion, '3.4.0');
  }

  async run() {
    const { device } = this;
    const { features } = device;

    const payload = this.payload as DeviceFullyUploadResourceParams;
    if (payload.preparedPlan && Object.prototype.hasOwnProperty.call(payload, 'binary')) {
      throw ERRORS.TypedError(
        HardwareErrorCode.CallMethodInvalidParameter,
        'preparedPlan cannot be combined with binary'
      );
    }

    const deviceFirmwareType = getFirmwareType(features);
    const firmwareType = payload.firmwareType ?? deviceFirmwareType;

    if (!device.isBootloader() && features) {
      // check & upgrade firmware resource
      if (features) {
        if (payload.preparedPlan) {
          const preparedPlan = validatePreparedPlan(payload.preparedPlan);
          if (
            preparedPlan.device.identity !== getDeviceUUID(features) ||
            preparedPlan.device.model !== getDeviceType(features)
          ) {
            throw createFirmwareUpdateError(
              FirmwareUpdateErrorCode.FirmwareDeviceStateConflict,
              'Prepared resource plan belongs to a different device'
            );
          }
          const resourceReceipts = preparedPlan.artifactReceipts.filter(
            receipt =>
              receipt.target === 'resource' &&
              receipt.role !== 'resource-bundle' &&
              receipt.logicalName
          );
          for (const receipt of preparedPlan.artifactReceipts) {
            const source = await openFirmwareArtifactByteSource(
              firmwareHostBindingRegistry,
              receipt
            );
            await source.close();
          }
          const entries: FirmwareResourceByteSourceEntry[] = [];
          try {
            for (const receipt of resourceReceipts) {
              entries.push({
                fileName: validateFirmwareLogicalName(receipt.logicalName ?? ''),
                source: await openFirmwareArtifactByteSource(firmwareHostBindingRegistry, receipt),
              });
            }
            await updateResourcesFromByteSources(
              this.device.getCommands().typedCall.bind(this.device.getCommands()),
              this.postMessage,
              device,
              entries
            );
          } finally {
            await Promise.allSettled(entries.map(entry => entry.source.close()));
          }
          return;
        }
        let { binary } = this.payload;
        if (!binary) {
          this.postTipMessage('CheckLatestUiResource');
          const resourceUrl = DataManager.getSysFullResource(features, firmwareType);
          if (resourceUrl) {
            this.postTipMessage('DownloadLatestUiResource');
            const resource = await getSysResourceBinary(resourceUrl);
            this.postTipMessage('DownloadLatestUiResourceSuccess');
            if (resource) {
              binary = resource.binary;
            }
          }
        }
        await updateResources(
          this.device.getCommands().typedCall.bind(this.device.getCommands()),
          this.postMessage,
          device,
          binary
        );
      }
    }
  }
}
