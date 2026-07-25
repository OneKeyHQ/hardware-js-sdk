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
import { updateResources, uploadFirmware } from './firmware/uploadFirmware';
import {
  LoggerNames,
  getDeviceFirmwareVersion,
  getDeviceType,
  getDeviceUUID,
  getFirmwareType,
  getLogger,
  wait,
} from '../utils';
import { FirmwareUpdateTipMessage, createUiMessage } from '../events/ui-request';
import { DeviceModelToTypes } from '../types';
import { DataManager } from '../data-manager';
import { DEVICE } from '../events';

import type { Features, KnownDevice } from '../types';
import type { Device } from '../device/Device';
import type { FirmwareBinary } from './firmware/getBinary';

type Params = {
  binary?: ArrayBuffer;
  version?: number[];
  updateType: 'firmware' | 'ble';
  forcedUpdateRes?: boolean;
  isUpdateBootloader?: boolean;
  firmwareType?: EFirmwareType;
};

const Log = getLogger(LoggerNames.Method);

const FIRMWARE_DOWNLOAD_REQUEST_OPTIONS = {
  timeoutMs: 60_000,
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

  private async _promptDeviceInBootloaderForWebDevice({ device }: { device: Device }) {
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

    const isTouchOrProDevice =
      getDeviceType(this?.device?.features) === EDeviceType.Touch ||
      getDeviceType(this?.device?.features) === EDeviceType.Pro;

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
            const confirmed = await this._promptDeviceInBootloaderForWebDevice({
              device: this.device,
            });
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
            if (this.device.features?.bootloader_mode) {
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

    if (deviceList.length === 1 && deviceList[0]?.features?.bootloader_mode) {
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
    const deviceType = getDeviceType(features);
    const isMini = deviceType === EDeviceType.Mini;
    const isBoot183ClassicUpBle =
      this.params.updateType === 'firmware' &&
      deviceType === EDeviceType.Classic &&
      features.bootloader_version === '1.8.3';
    return isMini || isBoot183ClassicUpBle;
  }

  isSupportResourceUpdate(features: Features, updateType: string) {
    if (updateType !== 'firmware') return false;

    const deviceType = getDeviceType(features);
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
    const deviceType = getDeviceType(features);
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

  async run() {
    const { device, params } = this;
    const { features, commands } = device;
    const deviceType = getDeviceType(features);

    const deviceFirmwareType = getFirmwareType(device.features);
    const firmwareType = params.firmwareType ?? deviceFirmwareType;

    this.checkVersionForCopyTouchResource(features, firmwareType);

    let preparedBinary: FirmwareBinary | undefined;
    const acquireFirmwareBinary = async (): Promise<FirmwareBinary> => {
      try {
        if (preparedBinary) {
          return preparedBinary;
        }

        if (params.binary !== undefined) {
          preparedBinary = normalizeFirmwareBinary(params.binary);
          if (!preparedBinary) {
            throw new Error('firmware binary is empty or invalid');
          }
          return preparedBinary;
        }

        if (!device.features) {
          throw ERRORS.TypedError(
            HardwareErrorCode.RuntimeError,
            'no features found for this device'
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
        preparedBinary = normalizeFirmwareBinary(firmware.binary);
        if (!preparedBinary) {
          throw new Error('downloaded firmware binary is empty or invalid');
        }
        this.postTipMessage('DownloadFirmwareSuccess');
        return preparedBinary;
      } catch (err) {
        throw ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateDownloadFailed, err.message ?? err);
      }
    };

    if (!features?.bootloader_mode && features) {
      const uuid = getDeviceUUID(features);
      // should go to bootloader mode manually
      if (this.isEnteredManuallyBoot(features)) {
        return Promise.reject(ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateManuallyEnterBoot));
      }

      // check & upgrade firmware resource
      if (features && this.isSupportResourceUpdate(features, params.updateType)) {
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

      // check if the device commands has been disposed
      this.device?.commands?.checkDisposed();

      // A failed firmware download must leave the device in normal mode.
      await acquireFirmwareBinary();

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
          DevicePool.clearDeviceCache(uuid);
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
    const binary = await acquireFirmwareBinary();

    // check if the device commands has been disposed
    this.device?.commands?.checkDisposed();

    await this.device.acquire();

    const response = await uploadFirmware(
      params.updateType,
      this.device.getCommands().typedCall.bind(this.device.getCommands()),
      this.postMessage,
      device,
      { payload: binary, rebootOnSuccess: true },
      params.isUpdateBootloader
    );

    if (this.connectId) {
      DevicePool.clearDeviceCache(this.connectId);
    }

    return response;
  }
}
