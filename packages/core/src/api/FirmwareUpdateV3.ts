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
  getDeviceType,
  getDeviceUUID,
  getFirmwareType,
  getLogger,
} from '../utils';
import { getBinary, getSysResourceBinary } from './firmware/getBinary';
import { DataManager } from '../data-manager';
import { FirmwareUpdateBaseMethod } from './firmware/FirmwareUpdateBaseMethod';
import { DevicePool } from '../device/DevicePool';
import { DEVICE } from '../events';
import {
  FirmwareHostBindingRegistry,
  FirmwareUpdateErrorCode,
  MemoryByteSource,
  RecoverableFirmwareExecutor,
  createFirmwareUpdateError,
  createLegacyV3MemoryPreparedPlan,
  firmwareHostBindingRegistry,
  resolveFirmwareArtifactDevicePath,
  validateFirmwareArchiveEntryId,
  validateFirmwareLogicalName,
  validatePreparedPlan,
} from '../firmware-update';
import { buildProtocolV1FeaturesPayload } from '../deviceProfile';

import type { FirmwareUpdateV3Params } from '../types/api/firmwareUpdate';
import type { Deferred, EFirmwareType } from '@onekeyfe/hd-shared';
import type { TypedResponseMessage } from '../device/DeviceCommands';
import type {
  FirmwareArtifactReceipt,
  FirmwareObservedDeviceState,
  LegacyV3ResourceEntry,
  PreparedPlan,
} from '../firmware-update';
import type { Features } from '../types';

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

  private isSwitchFirmware = false;

  private latestObservedFeatures: Features | null = null;

  private installRequested = false;

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
      { name: 'preparedPlan', type: 'object' },
      { name: 'firmwareCheckpoint', type: 'object' },
      { name: 'firmwareTransactionId', type: 'string' },
      { name: 'firmwareType', type: 'string' },
      { name: 'platform', type: 'string' },
    ]);

    const legacyArtifactKeys = [
      'bleVersion',
      'bleBinary',
      'firmwareVersion',
      'firmwareBinary',
      'resourceBinary',
      'forcedUpdateRes',
      'bootloaderVersion',
      'bootloaderBinary',
    ] as const;
    if (
      payload.preparedPlan &&
      legacyArtifactKeys.some(key => Object.prototype.hasOwnProperty.call(payload, key))
    ) {
      throw ERRORS.TypedError(
        HardwareErrorCode.CallMethodInvalidParameter,
        'preparedPlan cannot be combined with legacy firmware inputs'
      );
    }
    if (payload.firmwareCheckpoint && !payload.preparedPlan) {
      throw ERRORS.TypedError(
        HardwareErrorCode.CallMethodInvalidParameter,
        'firmwareCheckpoint requires preparedPlan'
      );
    }

    this.params = {
      preparedPlan: payload.preparedPlan,
      firmwareCheckpoint: payload.firmwareCheckpoint,
      firmwareTransactionId: payload.firmwareTransactionId,
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
    if (this.device.isProtocolV2()) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'Protocol V2 firmware update must use firmwareUpdateV4'
      );
    }
    Log.debug('FirmwareUpdateV3 strategy: Protocol V1');
    return this.runProtocolV1();
  }

  /**
   * Protocol V1 firmware update strategy for existing Pro devices.
   */
  private async runProtocolV1() {
    const { device } = this;
    const { features } = device;
    if (!features) {
      throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Device features not available');
    }

    const deviceType = getDeviceType(features);
    const bootloaderCurrVersion = getDeviceBootloaderVersion(features).join('.');

    this.validateDeviceAndVersion(deviceType, bootloaderCurrVersion);

    const deviceFirmwareType = getFirmwareType(features);
    const firmwareType = this.params.firmwareType ?? deviceFirmwareType;
    this.isSwitchFirmware = firmwareType !== deviceFirmwareType;

    let preparedPlan: PreparedPlan;
    let binariesByArtifactRef: ReadonlyMap<string, ArrayBuffer> | undefined;
    let registry = firmwareHostBindingRegistry;
    const isLegacyExecution = !this.params.preparedPlan;
    if (this.params.preparedPlan) {
      preparedPlan = validatePreparedPlan(this.params.preparedPlan);
    } else {
      try {
        this.postTipMessage(FirmwareUpdateTipMessage.StartDownloadFirmware);
        const resourceBinary = await this.prepareResourceBinary(firmwareType);
        const resourceEntries = resourceBinary
          ? await this.prepareLegacyResourceEntries(resourceBinary)
          : [];
        const fwBinaryMap = await this.prepareFirmwareAndBleBinary(firmwareType);
        const bootloaderBinary = await this.prepareBootloaderBinary(firmwareType);
        if (!bootloaderBinary && fwBinaryMap.length === 0) {
          throw new Error('No firmware to update');
        }
        const legacy = createLegacyV3MemoryPreparedPlan({
          device: {
            identity: getDeviceUUID(features),
            model: deviceType,
            firmwareType,
          },
          ...(resourceBinary ? { resourceArchive: resourceBinary, resourceEntries } : {}),
          ...(bootloaderBinary
            ? {
                bootloaderBinary,
                bootloaderVersion: this.params.bootloaderVersion?.join('.'),
              }
            : {}),
          ...(fwBinaryMap.find(item => item.target === 'firmware')?.binary
            ? {
                firmwareBinary: fwBinaryMap.find(item => item.target === 'firmware')?.binary,
                firmwareVersion: this.params.firmwareVersion?.join('.'),
              }
            : {}),
          ...(fwBinaryMap.find(item => item.target === 'ble')?.binary
            ? {
                bleBinary: fwBinaryMap.find(item => item.target === 'ble')?.binary,
                bleVersion: this.params.bleVersion?.join('.'),
              }
            : {}),
        });
        preparedPlan = legacy.preparedPlan;
        binariesByArtifactRef = legacy.binariesByArtifactRef;
        registry = this.createMemoryFirmwareRegistry();
        this.postTipMessage(FirmwareUpdateTipMessage.FinishDownloadFirmware);
      } catch (err) {
        const detail = err instanceof Error ? err.message : err;
        throw ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateDownloadFailed, detail);
      }
    }

    const installEpoch = [...preparedPlan.epochs]
      .reverse()
      .find(epoch => epoch.kind === 'component-install' || epoch.kind === 'bootloader-install');
    if (!installEpoch) {
      throw ERRORS.TypedError(
        HardwareErrorCode.FirmwareUpdateDownloadFailed,
        'No installable firmware artifact was prepared'
      );
    }
    const executableReceipts = preparedPlan.artifactReceipts.filter(receipt =>
      preparedPlan.epochs.some(epoch => epoch.artifactIds.includes(receipt.artifactId))
    );
    const totalSize = executableReceipts.reduce((sum, receipt) => sum + receipt.size, 0);
    let processedSize = 0;
    let updatesFolderReady = false;
    let transferStarted = false;
    let loaderEntered = Boolean(features.bootloader_mode);
    let updateResult: Awaited<ReturnType<FirmwareUpdateV3['waitForFirmwareInstall']>> | undefined;
    this.installRequested =
      this.params.firmwareCheckpoint?.state === 'INSTALL_REQUESTED' ||
      this.params.firmwareCheckpoint?.state === 'INSTALLING';

    const executor = new RecoverableFirmwareExecutor({
      preparedPlan,
      transactionId:
        this.params.firmwareTransactionId ??
        `${preparedPlan.planId}:${preparedPlan.device.identity}`,
      registry,
      initialCheckpoint: this.params.firmwareCheckpoint,
      ...(binariesByArtifactRef
        ? {
            artifactSourceFactory: (receipt: FirmwareArtifactReceipt) => {
              const binary = binariesByArtifactRef?.get(receipt.artifactRef);
              if (!binary) {
                return Promise.reject(
                  new Error(`Legacy firmware artifact ${receipt.artifactId} is unavailable`)
                );
              }
              return Promise.resolve(new MemoryByteSource(binary));
            },
          }
        : {}),
      driver: {
        readDeviceState: () => Promise.resolve(this.getObservedDeviceState(deviceType)),
        requiresLoaderTransition: epoch => !loaderEntered && epoch.artifactIds.length > 0,
        enterLoader: async () => {
          await this.enterBootloaderMode();
          loaderEntered = true;
        },
        transferArtifact: async ({ receipt, source, reportProgress }) => {
          if (!transferStarted) {
            this.postTipMessage(FirmwareUpdateTipMessage.StartTransferData);
            transferStarted = true;
          }
          if ((receipt.target === 'firmware' || receipt.target === 'ble') && !updatesFolderReady) {
            await this.createUpdatesFolderIfNotExists('0:updates/');
            updatesFolderReady = true;
          }
          const filePath = resolveFirmwareArtifactDevicePath(receipt);
          processedSize = await this.emmcCommonUpdateFromByteSource({
            source,
            filePath,
            processedSize,
            totalSize,
            reportProgress,
          });
        },
        stageEpoch: async ({ epoch }) => {
          if (isLegacyExecution && epoch.epochId === installEpoch.epochId) {
            await this.requestFirmwareInstall();
            updateResult = await this.waitForFirmwareInstall();
          }
        },
        requiresInstall: epoch => !isLegacyExecution && epoch.epochId === installEpoch.epochId,
        requestInstall: async () => {
          await this.requestFirmwareInstall();
        },
        waitForInstall: async () => {
          updateResult = await this.waitForFirmwareInstall();
        },
        verifyFinal: ({ expectedPlan }) => {
          const observed = this.getObservedDeviceState(deviceType);
          const mismatchedState = expectedPlan.expectedFinalStates.find(
            state =>
              state.version !== undefined && observed.versions[state.target] !== state.version
          );
          if (mismatchedState) {
            throw createFirmwareUpdateError(
              FirmwareUpdateErrorCode.FirmwareDeviceStateConflict,
              `Firmware target ${mismatchedState.target} did not reach version ${mismatchedState.version}`
            );
          }
          return Promise.resolve();
        },
      },
    });
    await executor.run();

    return updateResult ?? this.getCurrentVersionResult();
  }

  private createMemoryFirmwareRegistry() {
    const registry = new FirmwareHostBindingRegistry();
    const unavailableReader = () =>
      Promise.reject(
        ERRORS.TypedError(
          HardwareErrorCode.FirmwareArtifactReaderInvalid,
          'Memory firmware execution uses a direct byte source'
        )
      );
    registry.register({
      artifactReader: {
        open: unavailableReader,
        read: unavailableReader,
        close: () => Promise.resolve(),
        cancel: () => Promise.resolve(),
      },
      checkpointSink: {
        commit: () => Promise.resolve(),
      },
    });
    return registry;
  }

  private async prepareLegacyResourceEntries(
    resourceBinary: ArrayBuffer
  ): Promise<LegacyV3ResourceEntry[]> {
    const archive = await JSZip.loadAsync(resourceBinary);
    const logicalNames = new Set<string>();
    const entries: LegacyV3ResourceEntry[] = [];
    for (const [entryId, entry] of Object.entries(archive.files)) {
      if (!entry.dir && !entryId.includes('__MACOSX')) {
        const safeEntryId = validateFirmwareArchiveEntryId(entryId);
        const logicalName = validateFirmwareLogicalName(safeEntryId.split('/').at(-1) ?? '');
        const logicalKey = logicalName.normalize('NFC').toLowerCase();
        if (logicalNames.has(logicalKey)) {
          throw new Error(`Legacy resource archive contains colliding entry ${logicalName}`);
        }
        logicalNames.add(logicalKey);
        entries.push({
          entryId: safeEntryId,
          logicalName,
          binary: await entry.async('arraybuffer'),
        });
      }
    }
    return entries;
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
    const fwBinaryMap: {
      target: 'firmware' | 'ble';
      fileName: string;
      binary: ArrayBuffer;
    }[] = [];
    if (this.params.firmwareBinary) {
      fwBinaryMap.push({
        target: 'firmware',
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
          target: 'firmware',
          fileName: 'firmware.bin',
          binary: firmwareBinary,
        });
      }
    }

    if (this.params.bleBinary) {
      fwBinaryMap.push({
        target: 'ble',
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
          target: 'ble',
          fileName: 'ble-firmware.bin',
          binary: bleBinary.binary,
        });
      }
    }
    return fwBinaryMap;
  }

  private getCurrentVersionResult() {
    const features = this.latestObservedFeatures ?? this.device.features;
    if (!features) {
      throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Device features not available');
    }
    return {
      bootloaderVersion: getDeviceBootloaderVersion(features).join('.'),
      bleVersion: getDeviceBLEFirmwareVersion(features).join('.'),
      firmwareVersion: getDeviceFirmwareVersion(features).join('.'),
    };
  }

  private getObservedDeviceState(deviceType: EDeviceType): FirmwareObservedDeviceState {
    const features = this.latestObservedFeatures ?? this.device.features;
    if (!features) {
      throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Device features not available');
    }
    const versions = this.getCurrentVersionResult();
    let mode: FirmwareObservedDeviceState['mode'] = 'normal';
    if (this.installRequested) {
      mode = 'installing';
    } else if (this.device.features?.bootloader_mode) {
      mode = 'loader';
    }
    return {
      identity: getDeviceUUID(features),
      model: deviceType,
      mode,
      versions: {
        bootloader: versions.bootloaderVersion,
        ble: versions.bleVersion,
        firmware: versions.firmwareVersion,
      },
      pendingInstall: this.installRequested,
      statusQuerySupported: true,
      statusAvailable: true,
    };
  }

  private async requestFirmwareInstall() {
    try {
      await this.createUpdatesFolderIfNotExists('0:updates/');
      this.postTipMessage(FirmwareUpdateTipMessage.ConfirmOnDevice);
      await this.startEmmcFirmwareUpdate({
        path: '0:updates',
      });
      this.installRequested = true;
    } catch (error) {
      Log.error('triggerFirmwareUpdateEmmc error: ', error);
      if (error?.errorCode) {
        const unexpectedError = [
          HardwareErrorCode.ActionCancelled,
          HardwareErrorCode.CallQueueActionCancelled,
          HardwareErrorCode.FirmwareVerificationFailed,
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
          HardwareErrorCode.WebDeviceNotFoundOrNeedsPermission,
        ];

        if (unexpectedError.includes(error.errorCode)) {
          throw error;
        }
      }
      throw ERRORS.TypedError(
        HardwareErrorCode.FirmwareError,
        error?.message || 'Firmware update failed'
      );
    }
  }

  private async waitForFirmwareInstall() {
    await wait(1500);
    this.postProcessingMessage('firmware');
    this.postProgressMessage(0, 'installingFirmware');
    const installStartTime = Date.now();
    const maxWaitTimeForInstallingFirmware = 5 * 60 * 1000;

    let getFeaturesTimeoutCount = 0;
    const maxGetFeaturesTimeoutBeforeReauth = 3;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (Date.now() - installStartTime > maxWaitTimeForInstallingFirmware) {
        throw ERRORS.TypedError(
          HardwareErrorCode.RuntimeError,
          'Firmware update process timeout after 5 minutes'
        );
      }

      try {
        const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());
        const timeoutMs = 3000;
        const featuresRes = await Promise.race<TypedResponseMessage<'Features'>>([
          typedCall('GetFeatures', 'Features', {}),
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
        this.latestObservedFeatures = features;
        const bootloaderVersion = getDeviceBootloaderVersion(features).join('.');
        const bleVersion = getDeviceBLEFirmwareVersion(features).join('.');
        const firmwareVersion = getDeviceFirmwareVersion(features).join('.');
        if (firmwareVersion !== '0.0.0') {
          this.installRequested = false;
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
          if (getFeaturesTimeoutCount <= maxGetFeaturesTimeoutBeforeReauth) {
            await wait(1000);
            shouldReconnect = false;
          }
        } else {
          getFeaturesTimeoutCount = 0;
        }

        if (shouldReconnect) {
          await wait(1000);
          const reconnectTimeout =
            this.isBleReconnect() && (this.params.bleBinary || this.params.bleVersion)
              ? 3 * 60 * 1000
              : 60 * 1000;

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
