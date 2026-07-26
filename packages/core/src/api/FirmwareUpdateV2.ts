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
import {
  readFirmwareByteSourceFully,
  updateResources,
  uploadFirmwareFromByteSource,
} from './firmware/uploadFirmware';
import {
  LoggerNames,
  getDeviceBLEFirmwareVersion,
  getDeviceBootloaderVersion,
  getDeviceFirmwareVersion,
  getDeviceType,
  getDeviceUUID,
  getLogger,
  wait,
} from '../utils';
import { FirmwareUpdateTipMessage, createUiMessage } from '../events/ui-request';
import { DeviceModelToTypes } from '../types';
import { DataManager } from '../data-manager';
import { DEVICE } from '../events';
import {
  FirmwareHostBindingRegistry,
  MemoryByteSource,
  RecoverableFirmwareExecutor,
  createLegacyMemoryPreparedPlan,
  firmwareHostBindingRegistry,
  validatePreparedPlan,
} from '../firmware-update';

import type { Features, KnownDevice } from '../types';
import type { FirmwareBinary } from './firmware/getBinary';
import type {
  FirmwareCheckpoint,
  FirmwareObservedDeviceState,
  PreparedPlan,
} from '../firmware-update';

type Params = {
  binary?: ArrayBuffer;
  preparedPlan?: PreparedPlan;
  firmwareCheckpoint?: FirmwareCheckpoint;
  firmwareTransactionId?: string;
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

const createMemoryFirmwareRegistry = () => {
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
};

const firmwareBinaryToArrayBuffer = (binary: FirmwareBinary): ArrayBuffer => {
  if (binary instanceof ArrayBuffer) {
    return binary;
  }
  return new Uint8Array(binary.buffer, binary.byteOffset, binary.byteLength).slice().buffer;
};

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
      { name: 'preparedPlan', type: 'object' },
      { name: 'firmwareCheckpoint', type: 'object' },
      { name: 'firmwareTransactionId', type: 'string' },
      { name: 'forcedUpdateRes', type: 'boolean' },
      { name: 'platform', type: 'string', required: true },
      { name: 'firmwareType', type: 'string' },
    ]);

    if (!payload.updateType) {
      throw ERRORS.TypedError(
        HardwareErrorCode.CallMethodInvalidParameter,
        'updateType is required'
      );
    }
    if (
      payload.preparedPlan &&
      (Object.prototype.hasOwnProperty.call(payload, 'binary') ||
        Object.prototype.hasOwnProperty.call(payload, 'version'))
    ) {
      throw ERRORS.TypedError(
        HardwareErrorCode.CallMethodInvalidParameter,
        'preparedPlan cannot be combined with binary or version'
      );
    }
    if (payload.firmwareCheckpoint && !payload.preparedPlan) {
      throw ERRORS.TypedError(
        HardwareErrorCode.CallMethodInvalidParameter,
        'firmwareCheckpoint requires preparedPlan'
      );
    }

    this.params = {
      updateType: payload.updateType,
      forcedUpdateRes: payload.forcedUpdateRes,
      isUpdateBootloader: payload.isUpdateBootloader,
      preparedPlan: payload.preparedPlan,
      firmwareCheckpoint: payload.firmwareCheckpoint,
      firmwareTransactionId: payload.firmwareTransactionId,
    };

    if ('version' in payload) {
      this.params = {
        ...this.params,
        version: payload.version,
        firmwareType: payload.firmwareType,
      };
    }

    if ('binary' in payload) {
      this.params = {
        ...this.params,
        binary: payload.binary,
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

    Log.log('FirmwareUpdateV2 [checkDeviceToBootloader] isBleReconnect: ', isBleReconnect);

    // check device goto bootloader mode
    let isFirstCheck = true;
    let checkCount = 0;
    // eslint-disable-next-line prefer-const
    let timeoutTimer: ReturnType<typeof setTimeout> | undefined;

    const deviceType = this.device?.getCurrentDeviceType();
    const isTouchOrProDevice = deviceType === EDeviceType.Touch || deviceType === EDeviceType.Pro;

    const intervalTimer: ReturnType<typeof setInterval> | undefined = setInterval(
      async () => {
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
          !this.payload.skipWebDevicePrompt
        ) {
          clearInterval(intervalTimer);
          clearTimeout(timeoutTimer);

          try {
            this.postTipMessage(FirmwareUpdateTipMessage.SelectDeviceInBootloaderForWebDevice);
            const confirmed = await this._promptDeviceInBootloaderForWebDevice();
            if (confirmed) {
              await this._checkDeviceInBootloaderMode(connectId, intervalTimer, timeoutTimer);
            }
          } catch (e) {
            Log.log(
              'FirmwareUpdateV2 [checkDeviceToBootloader] promptDeviceInBootloaderForWebDevice failed: ',
              e
            );
            this.checkPromise?.reject(e);
          }
          return;
        }

        if (isBleReconnect) {
          try {
            await this.device.deviceConnector?.acquire(
              this.device.originalDescriptor.id,
              null,
              true
            );
            await this.device.initialize();
            if (this.device.isBootloader()) {
              clearInterval(intervalTimer);
              this.checkPromise?.resolve(true);
            }
          } catch (e) {
            // ignore error because of device is not connected
            Log.log('catch Bluetooth error when device is restarting: ', e);
          }
        } else {
          await this._checkDeviceInBootloaderMode(connectId, intervalTimer, timeoutTimer);
        }
      },
      isBleReconnect ? 3000 : 2000
    );

    // check goto bootloader mode timeout and throw error
    timeoutTimer = setTimeout(() => {
      if (this.checkPromise) {
        clearInterval(intervalTimer);
        this.checkPromise.reject(new Error());
      }
    }, 30000);
  }

  private async _checkDeviceInBootloaderMode(
    connectId: string | undefined,
    intervalTimer?: ReturnType<typeof setInterval>,
    timeoutTimer?: ReturnType<typeof setTimeout>
  ) {
    const deviceDiff = await this.device.deviceConnector?.enumerate();
    const devicesDescriptor = deviceDiff?.descriptors ?? [];
    const { deviceList } = await DevicePool.getDevices(devicesDescriptor, connectId);

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

  isEnteredManuallyBoot(features: Features) {
    const deviceType = this.device.getCurrentDeviceType();
    const isMini = deviceType === EDeviceType.Mini;
    const isBoot183ClassicUpBle =
      this.params.updateType === 'firmware' &&
      deviceType === EDeviceType.Classic &&
      getDeviceBootloaderVersion(features).join('.') === '1.8.3';
    return isMini || isBoot183ClassicUpBle;
  }

  isSupportResourceUpdate(features: Features, updateType: string) {
    if (updateType !== 'firmware') return false;

    const deviceType = this.device.getCurrentDeviceType();
    const isTouchMode = deviceType === EDeviceType.Touch || deviceType === EDeviceType.Pro;
    const currentVersion = getDeviceFirmwareVersion(features).join('.');

    return isTouchMode && semver.gte(currentVersion, '3.2.0');
  }

  /**
   * Check the version number of Touch to determine if it
   * needs to be upgraded via the desktop
   */
  checkVersionForCopyTouchResource(features: Features | undefined, firmwareType: EFirmwareType) {
    if (!features) return;
    const deviceType = this.device.getCurrentDeviceType();
    const currentVersion = getDeviceFirmwareVersion(features).join('.');
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

  private async enterBootloader(deviceType: EDeviceType, features: Features): Promise<void> {
    const uuid = getDeviceUUID(features);
    try {
      this.postTipMessage('AutoRebootToBootloader');
      const bootRes = await this.device.getCommands().typedCall('DeviceBackToBoot', 'Success');
      // @ts-expect-error
      if (bootRes.type === 'CallMethodError') {
        throw ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateAutoEnterBootFailure);
      }
      this.postTipMessage('GoToBootloaderSuccess');
      this.checkDeviceToBootloader(this.payload.connectId);

      if (DeviceModelToTypes.model_classic.includes(deviceType)) {
        DevicePool.clearDeviceCache(uuid);
      }
      delete DevicePool.devicesCache[''];
      await this.checkPromise?.promise;
      this.checkPromise = null;
      this.device?.commands?.checkDisposed();

      const isTouch = DeviceModelToTypes.model_touch.includes(deviceType);
      await wait(isTouch ? 3000 : 1500);
    } catch (error) {
      if (error instanceof HardwareError) {
        throw error;
      }
      Log.error('auto go to bootloader mode failed: ', error);
      throw ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateAutoEnterBootFailure);
    }
  }

  private getObservedDeviceState(): FirmwareObservedDeviceState {
    const { features } = this.device;
    if (!features) {
      throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'no features found for this device');
    }
    const bleVersion = getDeviceBLEFirmwareVersion(features);
    return {
      identity: getDeviceUUID(features),
      model: getDeviceType(features),
      mode: features.bootloader_mode ? 'loader' : 'normal',
      versions: {
        firmware: getDeviceFirmwareVersion(features).join('.'),
        bootloader: getDeviceBootloaderVersion(features).join('.'),
        ...(bleVersion ? { ble: bleVersion.join('.') } : {}),
      },
      pendingInstall: false,
      statusQuerySupported: true,
      statusAvailable: true,
    };
  }

  async run() {
    const { device, params } = this;
    const { features } = device;
    if (!features) {
      throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'no features found for this device');
    }
    const deviceType = device.getCurrentDeviceType();

    // Protocol V2 (Pro2) uses DeviceFirmwareUpdate and must not enter this legacy flow.
    if (device.isProtocolV2()) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'Protocol V2 firmware update must use firmwareUpdateV4'
      );
    }

    const deviceFirmwareType = device.getCurrentFirmwareType();
    const firmwareType = params.firmwareType ?? deviceFirmwareType;
    this.checkVersionForCopyTouchResource(features, firmwareType);

    let memoryBinary: ArrayBuffer | undefined;
    let preparedPlan: PreparedPlan;
    let registry = firmwareHostBindingRegistry;
    if (params.preparedPlan) {
      preparedPlan = validatePreparedPlan(params.preparedPlan);
    } else {
      let firmwareBinary: FirmwareBinary;
      try {
        if (params.binary !== undefined) {
          const normalizedBinary = normalizeFirmwareBinary(params.binary);
          if (!normalizedBinary) {
            throw new Error('firmware binary is empty or invalid');
          }
          firmwareBinary = normalizedBinary;
        } else {
          this.postTipMessage('DownloadFirmware');
          const firmware = await getBinary({
            features,
            version: params.version,
            updateType: params.updateType,
            isUpdateBootloader: params.isUpdateBootloader,
            firmwareType,
            requestOptions: FIRMWARE_DOWNLOAD_REQUEST_OPTIONS,
          });
          const normalizedBinary = normalizeFirmwareBinary(firmware.binary);
          if (!normalizedBinary) {
            throw new Error('downloaded firmware binary is empty or invalid');
          }
          firmwareBinary = normalizedBinary;
          this.postTipMessage('DownloadFirmwareSuccess');
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : error;
        throw ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateDownloadFailed, detail);
      }
      memoryBinary = firmwareBinaryToArrayBuffer(firmwareBinary);
      preparedPlan = createLegacyMemoryPreparedPlan({
        binary: memoryBinary,
        device: {
          identity: getDeviceUUID(features),
          model: deviceType,
          firmwareType,
        },
        updateType: params.updateType,
        isUpdateBootloader: params.isUpdateBootloader,
        targetVersion: params.version?.join('.'),
      }).preparedPlan;
      registry = createMemoryFirmwareRegistry();
    }

    if (!device.isBootloader()) {
      if (this.isEnteredManuallyBoot(features)) {
        throw ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateManuallyEnterBoot);
      }

      if (!params.preparedPlan && this.isSupportResourceUpdate(features, params.updateType)) {
        this.postTipMessage('CheckLatestUiResource');
        const resourceUrl = DataManager.getSysResourcesLatestRelease({
          features,
          forcedUpdateRes: params.forcedUpdateRes,
          firmwareType,
        });
        if (resourceUrl) {
          this.postTipMessage('DownloadLatestUiResource');
          const resource = await getSysResourceBinary(resourceUrl);
          this.postTipMessage('DownloadLatestUiResourceSuccess');
          if (resource) {
            await updateResources(
              this.device.getCommands().typedCall.bind(this.device.getCommands()),
              this.postMessage,
              device,
              resource.binary
            );
          }
        }
      }
    }

    this.device?.commands?.checkDisposed();
    let response: Awaited<ReturnType<typeof uploadFirmwareFromByteSource>> | undefined;
    let acquired = false;
    const memorySourceBinary = memoryBinary;
    const executor = new RecoverableFirmwareExecutor({
      preparedPlan,
      transactionId:
        params.firmwareTransactionId ?? `${preparedPlan.planId}:${preparedPlan.device.identity}`,
      registry,
      initialCheckpoint: params.firmwareCheckpoint,
      ...(memorySourceBinary
        ? {
            artifactSourceFactory: () => Promise.resolve(new MemoryByteSource(memorySourceBinary)),
          }
        : {}),
      driver: {
        readDeviceState: () => Promise.resolve(this.getObservedDeviceState()),
        requiresLoaderTransition: epoch =>
          epoch.kind !== 'resource-sync' && !this.device.features?.bootloader_mode,
        enterLoader: async () => {
          await this.enterBootloader(deviceType, features);
        },
        transferArtifact: async ({ receipt, source }) => {
          if (receipt.target === 'resource') {
            const resource = await readFirmwareByteSourceFully(source);
            await updateResources(
              this.device.getCommands().typedCall.bind(this.device.getCommands()),
              this.postMessage,
              device,
              resource
            );
            return;
          }
          this.device?.commands?.checkDisposed();
          if (!acquired) {
            await this.device.acquire();
            acquired = true;
          }
          response = await uploadFirmwareFromByteSource(
            receipt.target === 'ble' ? 'ble' : 'firmware',
            this.device.getCommands().typedCall.bind(this.device.getCommands()),
            this.postMessage,
            device,
            source,
            true,
            receipt.target === 'bootloader'
          );
        },
        requiresInstall: () => false,
        verifyFinal: () => Promise.resolve(),
      },
    });
    await executor.run();

    if (this.connectId) {
      DevicePool.clearDeviceCache(this.connectId);
    }
    if (!response) {
      return { message: 'Firmware update already completed' };
    }
    return response;
  }
}
