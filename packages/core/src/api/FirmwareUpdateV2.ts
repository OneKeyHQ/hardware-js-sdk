import {
  type Deferred,
  EDeviceType,
  type EFirmwareType,
  ERRORS,
  HardwareError,
  HardwareErrorCode,
  createDeferred,
} from '@onekeyfe/hd-shared';
import semver from 'semver';

import { UI_REQUEST } from '../constants/ui-request';
import { BaseMethod } from './BaseMethod';
import { validateParams } from './helpers/paramsValidator';
import { DevicePool } from '../device/DevicePool';
import { getBinary, getInfo, getSysResourceBinary } from './firmware/getBinary';
import { normalizeFirmwarePreparationError } from './firmware/FirmwarePreparationError';
import {
  updateResources,
  updateResourcesFromSources,
  uploadFirmwareFromSource,
} from './firmware/uploadFirmware';
import { BOOTLOADER_POLL_INITIALIZE_TIMEOUT_MS } from './firmware/FirmwareUpdateBaseMethod';
import { LoggerNames, getDeviceType, getDeviceUUID, getLogger, wait } from '../utils';
import { resolveDeviceBootloaderMode } from '../utils/deviceFeaturesCompat';
import { FirmwareUpdateTipMessage, createUiMessage } from '../events/ui-request';
import { DeviceModelToTypes } from '../types';
import { DataManager } from '../data-manager';
import { DEVICE } from '../events';
import { type FirmwareByteSource, openFirmwareByteSource } from './firmware/FirmwareArtifactSource';
import { resolveFirmwareUpdateHostBinding } from './firmware/FirmwareHostBinding';
import { readVerifiedPreparedResourceArchive } from './firmware/FirmwarePreparedResourceArchive';
import {
  assertFirmwareUpdatePreparedPlanBinding,
  assertFirmwareUpdatePreparedPlanDeviceIdentity,
  getFirmwareUpdatePreparedRawArtifact,
  validateFirmwareUpdatePreparedPlan,
} from './firmware/FirmwareUpdatePreparedPlan';

import type { Features, KnownDevice } from '../types';
import type { FirmwareBinary } from './firmware/getBinary';
import type {
  FirmwareArtifactReader,
  FirmwareArtifactReference,
} from '../types/api/firmwareUpdate';
import type { FirmwareUpdatePreparedPlan } from '../types/api/firmwareUpdatePreparedPlan';

type Params = {
  binary?: ArrayBuffer;
  artifact?: FirmwareArtifactReference;
  hostBindingGeneration?: number;
  resourceEntries?: Array<{
    entryName: string;
    artifact: FirmwareArtifactReference;
  }>;
  artifactReader?: FirmwareArtifactReader;
  preparedPlan?: FirmwareUpdatePreparedPlan;
  platform?: FirmwareUpdatePreparedPlan['platform'];
  version?: number[];
  updateType: 'firmware' | 'ble';
  forcedUpdateRes?: boolean;
  isUpdateBootloader?: boolean;
  firmwareType?: EFirmwareType;
};

const Log = getLogger(LoggerNames.Method);

const FIRMWARE_DOWNLOAD_REQUEST_OPTIONS = {
  connectTimeoutMs: 60_000,
  readTimeoutMs: 60_000,
  overallTimeoutMs: 180_000,
  maxRetries: 2,
  retryDelayMs: 500,
} as const;

const normalizeFirmwareBinary = (binary: unknown): FirmwareBinary | undefined => {
  if (typeof binary !== 'object' || binary === null) {
    return undefined;
  }

  const isNodeBuffer =
    typeof Buffer !== 'undefined' &&
    typeof Buffer.isBuffer === 'function' &&
    Buffer.isBuffer(binary);
  if (isNodeBuffer) {
    return binary.byteLength > 0 ? binary : undefined;
  }

  if (typeof ArrayBuffer !== 'undefined' && binary instanceof ArrayBuffer) {
    return binary.byteLength > 0 ? binary : undefined;
  }

  if (
    typeof ArrayBuffer !== 'undefined' &&
    typeof ArrayBuffer.isView === 'function' &&
    ArrayBuffer.isView(binary)
  ) {
    if (binary.byteLength <= 0) {
      return undefined;
    }
    const source = new Uint8Array(binary.buffer, binary.byteOffset, binary.byteLength);
    const normalized = new Uint8Array(binary.byteLength);
    normalized.set(source);
    return normalized.buffer;
  }

  const customBuffer = binary as {
    [index: number]: unknown;
    byteLength?: unknown;
    constructor?: {
      isBuffer?: (value: unknown) => boolean;
    };
    length?: unknown;
  };
  if (
    typeof customBuffer.constructor?.isBuffer !== 'function' ||
    !customBuffer.constructor.isBuffer(binary) ||
    typeof customBuffer.byteLength !== 'number' ||
    !Number.isSafeInteger(customBuffer.byteLength) ||
    customBuffer.byteLength <= 0 ||
    typeof customBuffer.length !== 'number' ||
    customBuffer.length !== customBuffer.byteLength
  ) {
    return undefined;
  }

  const { byteLength } = customBuffer;
  const normalized = new Uint8Array(byteLength);
  for (let index = 0; index < byteLength; index += 1) {
    const { [index]: byte } = customBuffer;
    if (typeof byte !== 'number' || !Number.isInteger(byte) || byte < 0 || byte > 255) {
      return undefined;
    }
    normalized[index] = byte;
  }
  return normalized.buffer;
};

const toArrayBuffer = (binary: FirmwareBinary): ArrayBuffer => {
  if (binary instanceof ArrayBuffer) {
    return binary;
  }
  return new Uint8Array(binary.buffer, binary.byteOffset, binary.byteLength).slice().buffer;
};

export default class FirmwareUpdateV2 extends BaseMethod<Params> {
  checkPromise: Deferred<any> | null = null;

  init() {
    this.allowDeviceMode = [UI_REQUEST.BOOTLOADER, UI_REQUEST.NOT_INITIALIZE];
    this.requireDeviceMode = [];
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;

    const { payload } = this;

    validateParams(payload, [
      { name: 'version', type: 'array' },
      { name: 'binary', type: 'buffer' },
      { name: 'forcedUpdateRes', type: 'boolean' },
      { name: 'platform', type: 'string', required: true },
      { name: 'firmwareType', type: 'string' },
    ]);

    const hasPreparedPlan = payload.preparedPlan !== undefined;
    if (hasPreparedPlan && (payload.binary !== undefined || payload.version !== undefined)) {
      throw ERRORS.TypedError(
        HardwareErrorCode.CallMethodInvalidParameter,
        'Prepared firmware plans cannot be combined with legacy firmware inputs'
      );
    }
    if (!hasPreparedPlan && payload.artifact !== undefined) {
      throw ERRORS.TypedError(
        HardwareErrorCode.CallMethodInvalidParameter,
        'Firmware artifacts require a prepared plan'
      );
    }

    if (!payload.updateType) {
      throw ERRORS.TypedError(
        HardwareErrorCode.CallMethodInvalidParameter,
        'updateType is required'
      );
    }

    this.params = {
      updateType: payload.updateType,
      forcedUpdateRes: payload.forcedUpdateRes,
      isUpdateBootloader: payload.isUpdateBootloader,
    };

    if (!hasPreparedPlan && 'version' in payload) {
      this.params = {
        ...this.params,
        version: payload.version,
        firmwareType: payload.firmwareType,
      };
    }

    if (!hasPreparedPlan && 'binary' in payload) {
      this.params = {
        ...this.params,
        binary: payload.binary,
      };
    }

    if (hasPreparedPlan) {
      const preparedPlan = validateFirmwareUpdatePreparedPlan(payload.preparedPlan);
      const hostBinding = resolveFirmwareUpdateHostBinding(
        payload.hostBindingGeneration,
        preparedPlan.preparedPlanDigest
      );
      const target = payload.isUpdateBootloader ? 'bootloader' : payload.updateType;
      const plannedArtifact = getFirmwareUpdatePreparedRawArtifact({
        preparedPlan,
        target,
        role: target,
      }).artifact;
      const resourceBindings = (payload.resourceEntries ?? []).map(
        (entry: { entryName: string; artifact: FirmwareArtifactReference }) => ({
          target: 'resource' as const,
          entryName: entry.entryName,
          artifact: entry.artifact,
        })
      );
      assertFirmwareUpdatePreparedPlanBinding({
        preparedPlan,
        executor: 'v2',
        platform: payload.platform,
        scopeTargets: [
          target,
          ...(target === 'firmware' && resourceBindings.length ? (['resource'] as const) : []),
        ],
        bindings: [{ target, artifact: payload.artifact ?? plannedArtifact }, ...resourceBindings],
      });
      this.params = {
        ...this.params,
        preparedPlan,
        artifact: plannedArtifact,
        artifactReader: hostBinding.artifactReader,
        firmwareType: preparedPlan.firmwareType,
      };
    }
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

  private async _promptDeviceInBootloaderForWebDevice() {
    return new Promise((resolve, reject) => {
      if (this.device.listenerCount(DEVICE.SELECT_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE) > 0) {
        this.device.emit(
          DEVICE.SELECT_DEVICE_IN_BOOTLOADER_FOR_WEB_DEVICE,
          this.device,
          (err, deviceId) => {
            if (err) {
              reject(err);
            } else {
              resolve(deviceId);
            }
          }
        );
      }
    });
  }

  checkDeviceToBootloader(connectId: string | undefined) {
    this.checkPromise = createDeferred();
    const env = DataManager.getSettings('env');
    const isBleReconnect = connectId && DataManager.isBleConnect(env);
    // Bootloader probes can outlive the polling interval. Keep discovery and
    // acquire serialized so concurrent ticks never race the same connection.
    let probeInFlight = false;

    Log.log('FirmwareUpdateV2 [checkDeviceToBootloader] isBleReconnect: ', isBleReconnect);

    // check device goto bootloader mode
    let isFirstCheck = true;
    let checkCount = 0;
    let hasPromptedWebDevice = false;
    let isPromptingWebDevice = false;
    let isFinished = false;
    let intervalTimer: ReturnType<typeof setInterval> | undefined;
    let timeoutTimer: ReturnType<typeof setTimeout> | undefined;

    const deviceType = this.device?.getCurrentDeviceType();
    const isTouchOrProDevice = deviceType === EDeviceType.Touch || deviceType === EDeviceType.Pro;

    const clearPollingTimers = () => {
      if (intervalTimer !== undefined) {
        clearInterval(intervalTimer);
        intervalTimer = undefined;
      }
      if (timeoutTimer !== undefined) {
        clearTimeout(timeoutTimer);
        timeoutTimer = undefined;
      }
    };

    const checkForBootloader = async (clearActiveTimers: boolean) => {
      const found = await this._checkDeviceInBootloaderMode(
        connectId,
        clearActiveTimers ? intervalTimer : undefined,
        clearActiveTimers ? timeoutTimer : undefined
      );
      if (found) {
        isFinished = true;
        clearPollingTimers();
      }
      return found;
    };

    let startPolling: () => void = () => undefined;
    const pollForBootloader = async () => {
      if (isFinished || isPromptingWebDevice || probeInFlight) return;
      probeInFlight = true;
      checkCount += 1;
      Log.log('FirmwareUpdateV2 [checkDeviceToBootloader] isFirstCheck: ', isFirstCheck);
      if (isTouchOrProDevice && isFirstCheck) {
        isFirstCheck = false;
        Log.log('FirmwareUpdateV2 [checkDeviceToBootloader] wait 3000ms');
        await wait(3000);
      }

      if (
        checkCount > 4 &&
        DataManager.isBrowserWebUsb(DataManager.getSettings('env')) &&
        !this.payload.skipWebDevicePrompt &&
        !hasPromptedWebDevice &&
        !isPromptingWebDevice
      ) {
        clearPollingTimers();
        isPromptingWebDevice = true;
        try {
          this.postTipMessage(FirmwareUpdateTipMessage.SelectDeviceInBootloaderForWebDevice);
          const confirmed = await this._promptDeviceInBootloaderForWebDevice();
          hasPromptedWebDevice = true;
          if (confirmed) {
            await checkForBootloader(false);
          }
          // WebUSB enumeration can still be empty immediately after the chooser
          // resolves. Resume a fresh bounded polling window instead of leaving the
          // deferred check pending forever after the original timers were paused.
          if (!isFinished) {
            startPolling();
          }
        } catch (e) {
          isFinished = true;
          clearPollingTimers();
          Log.log(
            'FirmwareUpdateV2 [checkDeviceToBootloader] promptDeviceInBootloaderForWebDevice failed: ',
            e
          );
          this.checkPromise?.reject(e);
        } finally {
          isPromptingWebDevice = false;
          probeInFlight = false;
        }
        return;
      }

      if (isBleReconnect) {
        try {
          await this.device.deviceConnector?.acquire(
            this.device.originalDescriptor.id,
            null,
            true,
            this.payload.connectProtocol ?? this.device.originalDescriptor.protocolType
          );
          // Bound each probe so a request the rebooting device never received
          // frees the slot for the next tick instead of hanging into the
          // 30s reboot budget.
          await this.device.initialize({ timeoutMs: BOOTLOADER_POLL_INITIALIZE_TIMEOUT_MS });
          if (this.device.isBootloader()) {
            isFinished = true;
            clearPollingTimers();
            this.checkPromise?.resolve(true);
          }
        } catch (e) {
          // ignore error because of device is not connected
          Log.log('catch Bluetooth error when device is restarting: ', e);
        } finally {
          probeInFlight = false;
        }
      } else {
        try {
          await checkForBootloader(true);
        } finally {
          probeInFlight = false;
        }
      }
    };

    startPolling = () => {
      if (isFinished) return;
      clearPollingTimers();
      intervalTimer = setInterval(
        () => {
          pollForBootloader().catch(error => {
            if (isFinished) return;
            isFinished = true;
            clearPollingTimers();
            this.checkPromise?.reject(error);
          });
        },
        isBleReconnect ? 3000 : 2000
      );
      // Each automatic polling phase is bounded. Time spent in the browser's
      // permission chooser is intentionally excluded from this deadline.
      timeoutTimer = setTimeout(() => {
        if (!isFinished && this.checkPromise) {
          isFinished = true;
          clearPollingTimers();
          this.checkPromise.reject(new Error());
        }
      }, 30000);
    };

    startPolling();
  }

  private async _checkDeviceInBootloaderMode(
    connectId: string | undefined,
    intervalTimer?: ReturnType<typeof setInterval>,
    timeoutTimer?: ReturnType<typeof setTimeout>
  ) {
    const deviceDiff = await this.device.deviceConnector?.enumerate();
    const devicesDescriptor = deviceDiff?.descriptors ?? [];
    const { deviceList } = await DevicePool.getDevices(devicesDescriptor, connectId, {
      connectProtocol: this.payload.connectProtocol ?? this.device.originalDescriptor.protocolType,
    });

    if (deviceList.length === 1 && deviceList[0]?.isBootloader()) {
      // should update current device from cache
      // because device was reboot and had some new requests
      this.device.updateFromCache(deviceList[0]);
      this.device.commands.disposed = false;

      if (intervalTimer) clearInterval(intervalTimer);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      this.checkPromise?.resolve(true);
      return true;
    }
    return false;
  }

  isEnteredManuallyBoot() {
    const deviceType = this.device.getCurrentDeviceType();
    const isMini = deviceType === EDeviceType.Mini;
    const isBoot183ClassicUpBle =
      this.params.updateType === 'firmware' &&
      deviceType === EDeviceType.Classic &&
      this.device.getCurrentBootloaderVersionString() === '1.8.3';
    return isMini || isBoot183ClassicUpBle;
  }

  isSupportResourceUpdate(updateType: string) {
    if (updateType !== 'firmware') return false;

    const deviceType = this.device.getCurrentDeviceType();
    const isTouchMode = deviceType === EDeviceType.Touch || deviceType === EDeviceType.Pro;
    const currentVersion = this.device.getCurrentFirmwareVersionString() ?? '0.0.0';

    return isTouchMode && semver.gte(currentVersion, '3.2.0');
  }

  /**
   * Check the version number of Touch to determine if it
   * needs to be upgraded via the desktop
   */
  checkVersionForCopyTouchResource(features: Features | undefined, firmwareType: EFirmwareType) {
    if (!features) return;
    const deviceType = this.device.getCurrentDeviceType();
    const currentVersion = this.device.getCurrentFirmwareVersionString() ?? '0.0.0';
    const targetVersion = this.params.version?.join('.');
    const { updateType } = this.params;

    const releaseInfo = getInfo({ features, updateType, firmwareType });
    if (!releaseInfo) return;
    const { fullResourceRange } = releaseInfo;
    if (!fullResourceRange) return;

    const [minVersion, limitVersion] = fullResourceRange;
    if (deviceType === EDeviceType.Touch && updateType === 'firmware' && targetVersion) {
      if (
        semver.lt(currentVersion, minVersion) &&
        semver.gte(targetVersion, limitVersion) &&
        this.payload.platform !== 'desktop'
      ) {
        throw ERRORS.TypedError(HardwareErrorCode.UseDesktopToUpdateFirmware);
      }
    }
  }

  async run() {
    const { device, params } = this;
    const { features, commands } = device;
    const deviceType = device.getCurrentDeviceType();

    // Protocol V2 (Pro2) uses DeviceFirmwareUpdate and must not enter this legacy flow.
    if (device.isProtocolV2()) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'Protocol V2 firmware update must use firmwareUpdateV4'
      );
    }
    if (params.preparedPlan) {
      assertFirmwareUpdatePreparedPlanDeviceIdentity({
        preparedPlan: params.preparedPlan,
        deviceIdentity: getDeviceUUID(features) || undefined,
        bootloaderMode: resolveDeviceBootloaderMode(features),
        deviceModel: String(getDeviceType(features)),
      });
    }

    const deviceFirmwareType = device.getCurrentFirmwareType();
    const firmwareType = params.firmwareType ?? deviceFirmwareType;

    this.checkVersionForCopyTouchResource(features, firmwareType);

    let preparedSource: FirmwareByteSource | undefined;
    try {
      const acquireFirmwareSource = async (): Promise<FirmwareByteSource> => {
        try {
          if (preparedSource) {
            return preparedSource;
          }

          if (params.binary !== undefined) {
            const binary = normalizeFirmwareBinary(params.binary);
            if (!binary) {
              throw new Error('firmware binary is empty or invalid');
            }
            const source = await openFirmwareByteSource({
              binary: toArrayBuffer(binary),
            });
            if (!source) {
              throw new Error('firmware binary is empty or invalid');
            }
            preparedSource = source;
            return source;
          }

          if (params.artifact) {
            const source = await openFirmwareByteSource({
              artifact: params.artifact,
              reader: params.artifactReader,
            });
            if (!source) {
              throw new Error('firmware artifact is not prepared');
            }
            preparedSource = source;
            return source;
          }

          if (!device.features) {
            throw ERRORS.TypedError(
              HardwareErrorCode.RuntimeError,
              'no features found for this device'
            );
          }

          if (
            params.artifactReader ||
            DataManager.getSettings('firmwareManifestMode') === 'external-only'
          ) {
            throw ERRORS.TypedError(
              HardwareErrorCode.RuntimeError,
              'Firmware must be prepared by the external firmware host',
              {
                firmwareUpdateCode: 'FirmwareArtifactsNotPrepared',
                artifactName: 'firmware',
              }
            );
          }

          this.postTipMessage('DownloadFirmware');
          const firmware = await getBinary({
            features: device.features,
            version: params.version,
            updateType: params.updateType,
            isUpdateBootloader: params.isUpdateBootloader,
            firmwareType,
            requestOptions: FIRMWARE_DOWNLOAD_REQUEST_OPTIONS,
          });
          const binary = normalizeFirmwareBinary(firmware.binary);
          if (!binary) {
            throw new Error('downloaded firmware binary is empty or invalid');
          }
          const source = await openFirmwareByteSource({
            binary: toArrayBuffer(binary),
          });
          if (!source) {
            throw new Error('downloaded firmware binary is empty or invalid');
          }
          preparedSource = source;
          this.postTipMessage('DownloadFirmwareSuccess');
          return source;
        } catch (err) {
          throw normalizeFirmwarePreparationError(err);
        }
      };

      const preparedResourceRequested =
        !params.isUpdateBootloader &&
        params.updateType === 'firmware' &&
        (params.preparedPlan?.targetsToUpdate.includes('resource') ?? false);
      if (preparedResourceRequested && device.isBootloader()) {
        throw ERRORS.TypedError(
          HardwareErrorCode.RuntimeError,
          'Prepared firmware resources require the device application mode',
          { firmwareUpdateCode: 'FirmwareArtifactsNotPrepared', artifactName: 'resource' }
        );
      }

      if (!device.isBootloader() && features) {
        const serialNo = device.getCurrentSerialNo();
        // should go to bootloader mode manually
        if (this.isEnteredManuallyBoot()) {
          throw ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateManuallyEnterBoot);
        }

        // All network-backed input must be ready before the first device mutation.
        await acquireFirmwareSource();

        // PreparedPlan 资源只依赖获批 ZIP；live release 仅保留给非 prepared 旧流程。
        if (preparedResourceRequested) {
          if (!this.isSupportResourceUpdate(params.updateType)) {
            throw ERRORS.TypedError(
              HardwareErrorCode.RuntimeError,
              'Prepared firmware resources are not supported by this device',
              { firmwareUpdateCode: 'FirmwareArtifactsNotPrepared', artifactName: 'resource' }
            );
          }
          this.postTipMessage('CheckLatestUiResource');
          this.postTipMessage('DownloadLatestUiResource');
          const verifiedEntries = await readVerifiedPreparedResourceArchive({
            preparedPlan: params.preparedPlan as FirmwareUpdatePreparedPlan,
            reader: params.artifactReader,
          });
          const sources: Array<{ entryName: string; source: FirmwareByteSource }> = [];
          try {
            for (const entry of verifiedEntries) {
              const source = await openFirmwareByteSource({ binary: entry.binary });
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
              sources.push({ entryName: entry.entryName, source });
            }
            await updateResourcesFromSources(
              this.device.getCommands().typedCall.bind(this.device.getCommands()),
              this.postMessage,
              device,
              sources
            );
          } finally {
            await Promise.all(sources.map(entry => entry.source.close().catch(() => undefined)));
          }
          this.postTipMessage('DownloadLatestUiResourceSuccess');
        } else if (this.isSupportResourceUpdate(params.updateType)) {
          this.postTipMessage('CheckLatestUiResource');
          const resourceUrl = DataManager.getSysResourcesLatestRelease({
            features,
            forcedUpdateRes: params.forcedUpdateRes,
            firmwareType,
          });
          if (resourceUrl) {
            this.postTipMessage('DownloadLatestUiResource');
            if (
              params.artifactReader ||
              DataManager.getSettings('firmwareManifestMode') === 'external-only'
            ) {
              throw ERRORS.TypedError(
                HardwareErrorCode.RuntimeError,
                'Firmware resource must be prepared by the external firmware host',
                {
                  firmwareUpdateCode: 'FirmwareArtifactsNotPrepared',
                  artifactName: 'resource',
                }
              );
            }
            const resourceBinary: ArrayBuffer | Buffer = (await getSysResourceBinary(resourceUrl))
              .binary;
            this.postTipMessage('DownloadLatestUiResourceSuccess');
            await updateResources(
              this.device.getCommands().typedCall.bind(this.device.getCommands()),
              this.postMessage,
              device,
              resourceBinary
            );
          }
        }

        // The request may outlive the current transport command instance.
        this.device?.commands?.checkDisposed();

        // auto go to bootloader mode
        try {
          this.postTipMessage('AutoRebootToBootloader');
          const bootRes = await commands.typedCall('DeviceBackToBoot', 'Success');
          // @ts-expect-error
          if (bootRes.type === 'CallMethodError') {
            throw ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateAutoEnterBootFailure);
          }
          this.postTipMessage('GoToBootloaderSuccess');
          this.checkDeviceToBootloader(this.payload.connectId);

          // force clean classic device cache so that the device can initialize again
          if (DeviceModelToTypes.model_classic.includes(deviceType)) {
            DevicePool.clearDeviceCache(serialNo);
          }
          delete DevicePool.devicesCache[''];
          await this.checkPromise?.promise;
          this.checkPromise = null;

          // check if the device commands has been disposed
          this.device?.commands?.checkDisposed();

          /**
           * Touch 1 with bootloader v2.5.0 issue: BLE chip need more time for looking up name, here change the delay time to 3000ms after rebooting.
           */
          const isTouch = DeviceModelToTypes.model_touch.includes(deviceType);
          await wait(isTouch ? 3000 : 1500);
        } catch (e) {
          if (e instanceof HardwareError) {
            return Promise.reject(e);
          }
          console.log('auto go to bootloader mode failed: ', e);
          return Promise.reject(
            ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateAutoEnterBootFailure)
          );
        }
      }

      // Devices already in bootloader mode still acquire through the same helper.
      const source = await acquireFirmwareSource();

      // check if the device commands has been disposed
      this.device?.commands?.checkDisposed();

      await this.device.acquire();

      const response = await uploadFirmwareFromSource(
        params.updateType,
        this.device.getCommands().typedCall.bind(this.device.getCommands()),
        this.postMessage,
        device,
        source,
        true,
        params.isUpdateBootloader
      );

      if (this.connectId) {
        DevicePool.clearDeviceCache(this.connectId);
      }

      return response;
    } finally {
      await preparedSource?.close().catch(() => undefined);
    }
  }
}
