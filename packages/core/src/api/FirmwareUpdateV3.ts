import { EDeviceType, ERRORS, HardwareError, HardwareErrorCode, wait } from '@onekeyfe/hd-shared';
import semver from 'semver';
import JSZip from 'jszip';

import { FirmwareUpdateTipMessage, UI_REQUEST } from '../events/ui-request';
import { validateParams } from './helpers/paramsValidator';
import {
  LoggerNames,
  getDeviceBLEFirmwareVersion,
  getDeviceBootloaderVersion,
  getDeviceFirmwareVersion,
  getDeviceUUID,
  getLogger,
} from '../utils';
import { getBinary, getSysResourceBinary } from './firmware/getBinary';
import { PRO_MCU_MIN_BOOTLOADER_VERSION } from './firmware/updateBootloader';
import { normalizeFirmwarePreparationError } from './firmware/FirmwarePreparationError';
import { DataManager } from '../data-manager';
import { FirmwareUpdateBaseMethod } from './firmware/FirmwareUpdateBaseMethod';
import { DevicePool } from '../device/DevicePool';
import { DEVICE } from '../events';
import { buildProtocolV1FeaturesPayload } from '../deviceProfile';
import { openFirmwareByteSource } from './firmware/FirmwareArtifactSource';
import { resolveFirmwareUpdateHostBinding } from './firmware/FirmwareHostBinding';
import { readVerifiedPreparedResourceArchive } from './firmware/FirmwarePreparedResourceArchive';
import {
  assertFirmwareUpdatePreparedPlanBinding,
  assertFirmwareUpdatePreparedPlanDeviceIdentity,
  getFirmwareUpdatePreparedRawArtifact,
  validateFirmwareUpdatePreparedPlan,
} from './firmware/FirmwareUpdatePreparedPlan';

import type {
  FirmwareArtifactReference,
  FirmwareUpdateV3Params,
} from '../types/api/firmwareUpdate';
import type { Deferred, EFirmwareType } from '@onekeyfe/hd-shared';
import type { TypedResponseMessage } from '../device/DeviceCommands';
import type { FirmwareByteSource } from './firmware/FirmwareArtifactSource';

const Log = getLogger(LoggerNames.Method);

export const MIN_UPDATE_V3_BOOTLOADER_VERSION = PRO_MCU_MIN_BOOTLOADER_VERSION;

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

  private isSwitchFirmware = false;

  private artifactSources: FirmwareByteSource[] = [];

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
    const hasPreparedPlan = payload.preparedPlan !== undefined;
    if (!hasPreparedPlan && payload.artifacts !== undefined) {
      throw ERRORS.TypedError(
        HardwareErrorCode.CallMethodInvalidParameter,
        'Firmware artifacts require a prepared plan'
      );
    }
    const preparedPlan = hasPreparedPlan
      ? validateFirmwareUpdatePreparedPlan(payload.preparedPlan)
      : undefined;
    const hasLegacyInputs = [
      payload.bleVersion,
      payload.bleBinary,
      payload.firmwareVersion,
      payload.firmwareBinary,
      payload.resourceBinary,
      payload.bootloaderVersion,
      payload.bootloaderBinary,
    ].some(input => input !== undefined);
    if (preparedPlan && hasLegacyInputs) {
      throw ERRORS.TypedError(
        HardwareErrorCode.CallMethodInvalidParameter,
        'Prepared firmware plans cannot be combined with legacy firmware inputs'
      );
    }
    const artifactReader = preparedPlan
      ? resolveFirmwareUpdateHostBinding(
          payload.hostBindingGeneration,
          preparedPlan.preparedPlanDigest
        ).artifactReader
      : payload.artifactReader;
    const preparedArtifacts: NonNullable<FirmwareUpdateV3Params['artifacts']> = {};
    if (preparedPlan) {
      const componentTargets = ['bootloader', 'firmware', 'ble'] as const;
      const supportedTargets = new Set<string>([...componentTargets, 'resource']);
      const unsupportedTarget = preparedPlan.targetsToUpdate.find(
        target => !supportedTargets.has(target)
      );
      if (unsupportedTarget) {
        throw ERRORS.TypedError(
          HardwareErrorCode.RuntimeError,
          `Firmware prepared plan target ${unsupportedTarget} is not supported by V3`,
          { firmwareUpdateCode: 'FirmwarePreparedPlanInvalid' }
        );
      }
      for (const target of componentTargets) {
        if (preparedPlan.targetsToUpdate.includes(target)) {
          preparedArtifacts[target] = getFirmwareUpdatePreparedRawArtifact({
            preparedPlan,
            target,
            role: target,
          }).artifact;
        }
      }
      const resourceBindings = (payload.artifacts?.resourceEntries ?? []).map(
        (entry: { entryName: string; artifact: FirmwareArtifactReference }) => ({
          target: 'resource' as const,
          entryName: entry.entryName,
          artifact: entry.artifact,
        })
      );
      assertFirmwareUpdatePreparedPlanBinding({
        preparedPlan,
        executor: 'v3',
        platform: payload.platform,
        scopeTargets: [
          'bootloader',
          'firmware',
          'ble',
          ...(resourceBindings.length ? (['resource'] as const) : []),
        ],
        bindings: [
          ...componentTargets.flatMap(target => {
            const plannedArtifact = preparedArtifacts[target];
            const suppliedArtifact = payload.artifacts?.[target];
            return plannedArtifact || suppliedArtifact
              ? [
                  {
                    target,
                    artifact: suppliedArtifact ?? (plannedArtifact as FirmwareArtifactReference),
                  },
                ]
              : [];
          }),
          ...resourceBindings,
        ],
      });
    }

    this.params = {
      preparedPlan,
      bleBinary: payload.bleBinary,
      firmwareBinary: payload.firmwareBinary,
      forcedUpdateRes: payload.forcedUpdateRes,
      bleVersion: payload.bleVersion,
      bootloaderVersion: payload.bootloaderVersion,
      bootloaderBinary: payload.bootloaderBinary,
      firmwareVersion: payload.firmwareVersion,
      resourceBinary: payload.resourceBinary,
      firmwareType: preparedPlan?.firmwareType ?? payload.firmwareType,
      platform: payload.platform,
      artifactReader,
      artifacts: preparedPlan ? preparedArtifacts : undefined,
    };
  }

  async run() {
    Log.debug('FirmwareUpdateV3 strategy: Protocol V1');
    return this.runProtocolV1();
  }

  /**
   * Protocol V1 firmware update strategy for existing Pro devices.
   */
  private async runProtocolV1() {
    const { device } = this;
    const { features } = device;

    const deviceType = device.getCurrentDeviceType();
    const bootloaderCurrVersion = device.getCurrentBootloaderVersionString() ?? '0.0.0';

    this.validateDeviceAndVersion(deviceType, bootloaderCurrVersion);

    if (!features) {
      throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Device features not available');
    }
    if (this.params.preparedPlan) {
      assertFirmwareUpdatePreparedPlanDeviceIdentity({
        preparedPlan: this.params.preparedPlan,
        deviceIdentity: getDeviceUUID(features) || undefined,
      });
    }

    const deviceFirmwareType = device.getCurrentFirmwareType();
    const firmwareType = this.params.firmwareType ?? deviceFirmwareType;
    this.isSwitchFirmware = firmwareType !== deviceFirmwareType;

    let resourceBinary: ArrayBuffer | null = null;
    let resourceEntries: Array<{ entryName: string; source: FirmwareByteSource }> = [];
    let fwSources: Array<{ fileName: string; source: FirmwareByteSource }> = [];
    let bootloaderSource: FirmwareByteSource | null = null;
    try {
      this.postTipMessage(FirmwareUpdateTipMessage.StartDownloadFirmware);
      const resourceInput = await this.prepareResourceInput(firmwareType);
      resourceBinary = resourceInput.resourceBinary;
      resourceEntries = resourceInput.resourceEntries;
      fwSources = await this.prepareFirmwareAndBleSources(firmwareType);
      bootloaderSource = await this.prepareBootloaderSource(firmwareType);
      this.postTipMessage(FirmwareUpdateTipMessage.FinishDownloadFirmware);
    } catch (err) {
      await this.closeArtifactSources();
      throw normalizeFirmwarePreparationError(err);
    }

    if (!bootloaderSource && fwSources.length === 0) {
      await this.closeArtifactSources();
      throw ERRORS.TypedError(
        HardwareErrorCode.FirmwareUpdateDownloadFailed,
        'No firmware to update'
      );
    }

    try {
      await this.enterBootloaderMode();
      return await this.executeUpdate({
        resourceBinary,
        resourceEntries,
        fwSources,
        bootloaderSource,
      });
    } finally {
      await this.closeArtifactSources();
    }
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

  private async openArtifactSource(
    binary: ArrayBuffer | undefined,
    artifact: FirmwareArtifactReference | undefined
  ) {
    const source = await openFirmwareByteSource({
      binary,
      artifact,
      reader: this.params.artifactReader,
    });
    if (source) {
      this.artifactSources.push(source);
    }
    return source;
  }

  private async closeArtifactSources() {
    const sources = this.artifactSources.splice(0);
    await Promise.all(sources.map(source => source.close().catch(() => undefined)));
  }

  private assertSdkDownloadAllowed(artifactName: string) {
    if (
      this.params.artifactReader ||
      DataManager.getSettings('firmwareManifestMode') === 'external-only'
    ) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        `${artifactName} must be prepared by the external firmware host`,
        {
          firmwareUpdateCode: 'FirmwareArtifactsNotPrepared',
          artifactName,
        }
      );
    }
  }

  private async prepareResourceInput(firmwareType: EFirmwareType) {
    if (this.params.preparedPlan?.targetsToUpdate.includes('resource')) {
      const verifiedEntries = await readVerifiedPreparedResourceArchive({
        preparedPlan: this.params.preparedPlan,
        reader: this.params.artifactReader,
      });
      const resourceEntries: Array<{ entryName: string; source: FirmwareByteSource }> = [];
      for (const entry of verifiedEntries) {
        const source = await this.openArtifactSource(entry.binary, undefined);
        if (!source) {
          throw ERRORS.TypedError(
            HardwareErrorCode.RuntimeError,
            `Firmware resource entry ${entry.entryName} is empty`,
            {
              firmwareUpdateCode: 'FirmwareArtifactReceiptMismatch',
              artifactName: 'resource',
            }
          );
        }
        resourceEntries.push({ entryName: entry.entryName, source });
      }
      return {
        resourceBinary: null,
        resourceEntries,
      };
    }
    if (this.params.resourceBinary) {
      return {
        resourceBinary: this.params.resourceBinary,
        resourceEntries: [],
      };
    }
    const { features } = this.device;
    if (!features) {
      return {
        resourceBinary: null,
        resourceEntries: [],
      };
    }
    const resourceUrl = DataManager.getSysResourcesLatestRelease({
      features,
      forcedUpdateRes: this.params.forcedUpdateRes,
      firmwareType,
    });

    if (resourceUrl) {
      this.assertSdkDownloadAllowed('resource');
      return {
        resourceBinary: (await getSysResourceBinary(resourceUrl)).binary,
        resourceEntries: [],
      };
    }
    Log.warn('No resource url found');
    return {
      resourceBinary: null,
      resourceEntries: [],
    };
  }

  private async prepareBootloaderSource(
    firmwareType: EFirmwareType
  ): Promise<FirmwareByteSource | null> {
    if (this.params.bootloaderBinary || this.params.artifacts?.bootloader) {
      return this.openArtifactSource(
        this.params.bootloaderBinary,
        this.params.artifacts?.bootloader
      );
    }
    const { features } = this.device;
    if (!features) return null;

    if (this.params.bootloaderVersion) {
      const bootResourceUrl = DataManager.getBootloaderResource(features, firmwareType);
      if (bootResourceUrl) {
        this.assertSdkDownloadAllowed('bootloader');
        const bootBinary = (await getSysResourceBinary(bootResourceUrl)).binary;
        return this.openArtifactSource(bootBinary, undefined);
      }
    }
    return null;
  }

  private async prepareFirmwareAndBleSources(firmwareType: EFirmwareType) {
    const fwSources: Array<{ fileName: string; source: FirmwareByteSource }> = [];
    if (this.params.firmwareBinary || this.params.artifacts?.firmware) {
      const source = await this.openArtifactSource(
        this.params.firmwareBinary,
        this.params.artifacts?.firmware
      );
      if (!source) {
        throw ERRORS.TypedError(
          HardwareErrorCode.RuntimeError,
          'Firmware artifact is not prepared'
        );
      }
      fwSources.push({
        fileName: 'firmware.bin',
        source,
      });
    } else if (this.params.firmwareVersion) {
      const { features } = this.device;
      if (features) {
        this.assertSdkDownloadAllowed('firmware');
        const firmwareBinary = (
          await getBinary({
            features,
            version: this.params.firmwareVersion,
            updateType: 'firmware',
            isUpdateBootloader: false,
            firmwareType,
          })
        ).binary;
        const source = await this.openArtifactSource(firmwareBinary, undefined);
        if (!source) {
          throw ERRORS.TypedError(
            HardwareErrorCode.RuntimeError,
            'Firmware binary is not prepared'
          );
        }
        fwSources.push({
          fileName: 'firmware.bin',
          source,
        });
      }
    }

    if (this.params.bleBinary || this.params.artifacts?.ble) {
      const source = await this.openArtifactSource(
        this.params.bleBinary,
        this.params.artifacts?.ble
      );
      if (!source) {
        throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'BLE artifact is not prepared');
      }
      fwSources.push({
        fileName: 'ble-firmware.bin',
        source,
      });
    } else if (this.params.bleVersion) {
      const { features } = this.device;
      if (features) {
        this.assertSdkDownloadAllowed('ble');
        const bleBinary = await getBinary({
          features,
          version: this.params.bleVersion,
          updateType: 'ble',
          firmwareType,
        });
        const source = await this.openArtifactSource(bleBinary.binary, undefined);
        if (!source) {
          throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'BLE binary is not prepared');
        }
        fwSources.push({
          fileName: 'ble-firmware.bin',
          source,
        });
      }
    }
    return fwSources;
  }

  private async executeUpdate({
    resourceBinary,
    resourceEntries,
    fwSources,
    bootloaderSource,
  }: {
    resourceBinary: ArrayBuffer | null;
    resourceEntries: Array<{ entryName: string; source: FirmwareByteSource }>;
    fwSources: Array<{ fileName: string; source: FirmwareByteSource }>;
    bootloaderSource: FirmwareByteSource | null;
  }) {
    let totalSize = 0;
    let processedSize = 0;

    if (resourceBinary) {
      totalSize += resourceBinary.byteLength;
    }
    for (const entry of resourceEntries) {
      totalSize += entry.source.size;
    }
    for (const firmware of fwSources) {
      totalSize += firmware.source.size;
    }
    if (bootloaderSource) {
      totalSize += bootloaderSource.size;
    }

    this.postTipMessage(FirmwareUpdateTipMessage.StartTransferData);

    // Process resource zip contents
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

    for (const entry of resourceEntries) {
      processedSize = await this.emmcCommonUpdateProcessFromSource({
        source: entry.source,
        filePath: `0:res/${entry.entryName}`,
        processedSize,
        totalSize,
      });
    }

    if (bootloaderSource) {
      processedSize = await this.emmcCommonUpdateProcessFromSource({
        source: bootloaderSource,
        filePath: `0:boot/bootloader.bin`,
        processedSize,
        totalSize,
      });
    }

    await this.createUpdatesFolderIfNotExists(`0:updates/`);

    for (const firmware of fwSources) {
      if (firmware) {
        processedSize = await this.emmcCommonUpdateProcessFromSource({
          source: firmware.source,
          filePath: `0:updates/${firmware.fileName}`,
          processedSize,
          totalSize,
        });
      }
    }

    // trigger firmware update
    try {
      this.postTipMessage(FirmwareUpdateTipMessage.ConfirmOnDevice);
      await this.startEmmcFirmwareUpdate({ path: '0:updates' });
    } catch (error) {
      Log.error('triggerFirmwareUpdateEmmc error: ', error);
      // Re-throw errors with specific error codes that should not be ignored
      if (error?.errorCode) {
        const unexpectedError = [
          HardwareErrorCode.ActionCancelled,
          HardwareErrorCode.CallQueueActionCancelled,
          HardwareErrorCode.FirmwareVerificationFailed,
          // BLE connection errors
          HardwareErrorCode.BleDeviceNotBonded,
          HardwareErrorCode.BleServiceNotFound,
          HardwareErrorCode.BlePoweredOff,
          HardwareErrorCode.BleUnsupported,
          HardwareErrorCode.BlePermissionError,
          HardwareErrorCode.BleLocationError,
          HardwareErrorCode.BleDeviceBondError,
          HardwareErrorCode.BleCharacteristicNotifyError,
          HardwareErrorCode.BleTimeoutError,
          HardwareErrorCode.BleWriteCharacteristicError,
          // Web device errors
          HardwareErrorCode.WebDeviceNotFoundOrNeedsPermission,
        ];

        if (unexpectedError.includes(error.errorCode)) {
          throw error;
        }
      }

      // Wrap and re-throw all other errors
      throw ERRORS.TypedError(
        HardwareErrorCode.FirmwareError,
        error?.message || 'Firmware update failed'
      );
    }

    // wait for 1.5s to ensure the device is in update mode
    await wait(1500);
    this.postProcessingMessage('firmware');
    this.postProgressMessage(0, 'installingFirmware');
    // Add timeout of 5 minutes
    const installStartTime = Date.now();
    const maxWaitTimeForInstallingFirmware = 5 * 60 * 1000; // 5 minutes in milliseconds

    let getFeaturesTimeoutCount = 0;
    const maxGetFeaturesTimeoutBeforeReauth = 3;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      // Check if timeout exceeded
      if (Date.now() - installStartTime > maxWaitTimeForInstallingFirmware) {
        throw ERRORS.TypedError(
          HardwareErrorCode.RuntimeError,
          'Firmware update process timeout after 5 minutes'
        );
      }

      try {
        const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());
        const timeoutMs = 3000;
        const isBrowserWebUsb = DataManager.isBrowserWebUsb(DataManager.getSettings('env'));
        const getFeaturesPromise = isBrowserWebUsb
          ? typedCall('GetFeatures', 'Features', {}, { timeoutMs })
          : typedCall('GetFeatures', 'Features', {});
        // WebUSB owns timeout cleanup so a reboot cannot leave a pending transfer blocking reconnect.
        const featuresRes = isBrowserWebUsb
          ? await getFeaturesPromise
          : await Promise.race<TypedResponseMessage<'Features'>>([
              getFeaturesPromise,
              new Promise<never>((_, reject) => {
                setTimeout(
                  () =>
                    reject(
                      ERRORS.TypedError(
                        HardwareErrorCode.CallMethodNotResponse,
                        'GetFeatures timeout',
                        { method: 'GetFeatures', timeoutMs }
                      )
                    ),
                  timeoutMs
                );
              }),
            ]);
        getFeaturesTimeoutCount = 0;
        const features = buildProtocolV1FeaturesPayload(featuresRes.message, this.device.features);
        const bootloaderVersion = getDeviceBootloaderVersion(features).join('.');
        const bleVersion = getDeviceBLEFirmwareVersion(features).join('.');
        const firmwareVersion = getDeviceFirmwareVersion(features).join('.');
        // Browser WebUSB may read updater Features before the final reboot. Do not let cached
        // pre-update versions promote a current 0.0.0 response to install completion.
        const completionFirmwareVersion = isBrowserWebUsb
          ? getDeviceFirmwareVersion(featuresRes.message).join('.')
          : firmwareVersion;
        if (completionFirmwareVersion !== '0.0.0') {
          this.postTipMessage(FirmwareUpdateTipMessage.FirmwareUpdateCompleted);
          DevicePool.resetState();
          return {
            bootloaderVersion,
            bleVersion,
            firmwareVersion,
          };
        }
        await wait(1000);
      } catch (error) {
        Log.log('getFeatures error', error);
        let shouldReconnect = true;
        const progress = this.extractUpdateModeProgress(error);
        if (progress !== null) {
          getFeaturesTimeoutCount = 0;
          this.postProgressMessage(progress, 'installingFirmware');
          await wait(1000);
          shouldReconnect = false;
        } else if (this.isGetFeaturesTimeoutError(error)) {
          getFeaturesTimeoutCount += 1;
          // Retry transient GetFeatures timeouts to avoid unnecessary WebUSB re-authorization prompts.
          if (getFeaturesTimeoutCount <= maxGetFeaturesTimeoutBeforeReauth) {
            await wait(1000);
            shouldReconnect = false;
          }
        } else {
          getFeaturesTimeoutCount = 0;
        }

        if (shouldReconnect) {
          await wait(1000);
          /**
           * Needs second reconnect case:
           * 1. While including 'Ble firmwware' in ble connect type
           * 2. While including bootloader upgrade
           */
          const reconnectTimeout =
            this.isBleReconnect() &&
            (this.params.bleBinary || this.params.bleVersion || this.params.artifacts?.ble)
              ? 3 * 60 * 1000 // 3 minutes for BLE reconnect
              : 60 * 1000; // 1 minute for normal reconnect

          getFeaturesTimeoutCount = 0;
          await this.waitForDeviceReconnect(reconnectTimeout);
        }
      }
    }
  }

  /**
   * Parse “Update mode XX” progress value from device errors to avoid hardcoded message.includes.
   */
  private extractUpdateModeProgress(error: unknown): number | null {
    const message = this.normalizeErrorMessage(error);
    if (!message) {
      return null;
    }
    const match = message.match(/Update mode\s*(\d+)/i);
    if (!match) {
      return null;
    }
    const progress = parseInt(match[1], 10);
    return Number.isNaN(progress) ? null : progress;
  }

  private isGetFeaturesTimeoutError(error: unknown): boolean {
    return (
      error instanceof HardwareError &&
      error.errorCode === HardwareErrorCode.CallMethodNotResponse &&
      error.params?.method === 'GetFeatures'
    );
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

  private canPromptWebUsbSwitchFirmwareReconnect(): boolean {
    if (!this.isSwitchFirmware) {
      return false;
    }
    return (
      DataManager.isBrowserWebUsb(DataManager.getSettings('env')) &&
      !this.payload.skipWebDevicePrompt &&
      this.device.listenerCount(DEVICE.SELECT_DEVICE_FOR_SWITCH_FIRMWARE_WEB_DEVICE) > 0
    );
  }

  /**
   * @description Reconnect device - While update with bootloader, it will reconnect device
   * @param {number} timeout - The timeout for the reconnection
   */
  async waitForDeviceReconnect(timeout: number) {
    const startTime = Date.now();
    const isBleReconnect = this.isBleReconnect();
    let webUsbCheckCount = 0;
    while (Date.now() - startTime < timeout) {
      try {
        if (isBleReconnect) {
          try {
            await this.device.deviceConnector?.acquire(
              this.device.originalDescriptor.id,
              null,
              true,
              this.payload.connectProtocol ?? this.device.originalDescriptor.protocolType
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

          const canPromptSwitchFirmwareReconnect = this.canPromptWebUsbSwitchFirmwareReconnect();

          if (canPromptSwitchFirmwareReconnect) {
            webUsbCheckCount += 1;
            if (webUsbCheckCount > 4) {
              this.postTipMessage(FirmwareUpdateTipMessage.SwitchFirmwareReconnectDevice);
              try {
                await this._promptDeviceForSwitchFirmwareWebDevice();
              } catch (e) {
                Log.log('WebUSB re-authorization failed: ', e);
              }
              webUsbCheckCount = 0;
            }
          } else {
            webUsbCheckCount = 0;
          }

          const { deviceList } = await DevicePool.getDevices(devicesDescriptor, this.connectId, {
            connectProtocol:
              this.payload.connectProtocol ?? this.device.originalDescriptor.protocolType,
          });

          if (deviceList.length === 1) {
            this.device.updateFromCache(deviceList[0]);
            // Reconnect failures are expected while installation still owns USB.
            // Keep them in this polling loop instead of rejecting the active firmware run.
            await this.device.acquire(undefined, {
              throwOnRunPromiseError: true,
            });
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
