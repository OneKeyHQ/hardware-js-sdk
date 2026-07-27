import {
  EDeviceType,
  ERRORS,
  HardwareError,
  HardwareErrorCode,
  createDeferred,
} from '@onekeyfe/hd-shared';

import { FirmwareUpdateTipMessage, UI_REQUEST, createUiMessage } from '../../events/ui-request';
import { DevicePool } from '../../device/DevicePool';
import { LoggerNames, getLogger, wait } from '../../utils';
import { DeviceModelToTypes } from '../../types';
import { DataManager } from '../../data-manager';
import { BaseMethod } from '../BaseMethod';
import { DEVICE } from '../../events';
import { createFirmwareProgressThrottle } from './progressThrottle';
import { writeFirmwareByteSource } from './FirmwareArtifactSource';

import type {
  FirmwareProgress,
  IFirmwareUpdateProgressType,
  IFirmwareUpdateTipMessage,
} from '../../events/ui-request';
import type { PROTO } from '../../constants';
import type { RebootType } from '@onekeyfe/hd-transport';
import type { Deferred } from '@onekeyfe/hd-shared';
import type { KnownDevice } from '../../types';
import type { TypedResponseMessage } from '../../device/DeviceCommands';
import type { FirmwareByteSource } from './FirmwareArtifactSource';

const Log = getLogger(LoggerNames.Method);
const SESSION_ERROR = 'session not found';
const FIRMWARE_UPDATE_CONFIRM = 'Firmware install confirmed';

/**
 * Response timeout for each Initialize probe while polling a rebooting device over BLE.
 * Overlap safety comes from the poll's in-flight guard, not from this value. Keep it
 * well below the 30s reboot budget so several attempts fit: a probe written into the
 * dying pre-reboot connection is never answered, and its timeout tears that stale link
 * down so the next tick reconnects fresh. Raise it only if a device model is proven to
 * answer bootloader Initialize slower than this on a fresh connection.
 */
export const BOOTLOADER_POLL_INITIALIZE_TIMEOUT_MS = 5000;

type FirmwareTransferMetrics = Pick<
  FirmwareProgress['payload'],
  'transferredBytes' | 'totalBytes' | 'rateBytesPerSecond' | 'elapsedMs'
>;

const isDeviceDisconnectedError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    message.includes('device was disconnected') ||
    message.includes('transferIn') ||
    message.includes('USBDevice')
  );
};

export class FirmwareUpdateBaseMethod<Params> extends BaseMethod<Params> {
  checkPromise: Deferred<any> | null = null;

  init(): void {}

  run(): Promise<any> {
    return Promise.resolve();
  }

  isBleReconnect(): boolean {
    const env = DataManager.getSettings('env');
    return this.payload.connectId && DataManager.isBleConnect(env);
  }

  /**
   * @description Post the tip message
   * @param message The message to be posted, defined in IFirmwareUpdateTipMessage
   */
  postTipMessage = (message: IFirmwareUpdateTipMessage) => {
    this.postMessage(
      createUiMessage(UI_REQUEST.FIRMWARE_TIP, {
        device: this.device.toMessageObject() as KnownDevice,
        data: {
          message,
        },
      })
    );
  };

  /**
   * @description Post the processing message
   * @param type
   */
  postProcessingMessage = (type: 'firmware' | 'ble' | 'bootloader' | 'resource') => {
    this.postMessage(
      createUiMessage(UI_REQUEST.FIRMWARE_PROCESSING, {
        type,
      })
    );
  };

  /**
   * @description Post the progress message
   * @param progress Post the percentage of the progress
   */
  postProgressMessage = (
    progress: number,
    progressType: IFirmwareUpdateProgressType,
    metrics?: FirmwareTransferMetrics
  ) => {
    this.postMessage(
      createUiMessage(UI_REQUEST.FIRMWARE_PROGRESS, {
        device: this.device.toMessageObject() as KnownDevice,
        progress,
        progressType,
        ...metrics,
      })
    );
  };

  protected async _promptDeviceInBootloaderForWebDevice() {
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

  protected async _promptDeviceForSwitchFirmwareWebDevice() {
    return new Promise((resolve, reject) => {
      if (this.device.listenerCount(DEVICE.SELECT_DEVICE_FOR_SWITCH_FIRMWARE_WEB_DEVICE) > 0) {
        this.device.emit(
          DEVICE.SELECT_DEVICE_FOR_SWITCH_FIRMWARE_WEB_DEVICE,
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
    // Tracks the in-flight BLE probe so interval ticks never overlap: a superseded
    // Initialize left pending on the V1 transport is exactly what later times out
    // and used to tear down the connection mid-firmware-upload.
    let bleProbeInFlight = false;

    Log.log('FirmwareUpdateBaseMethod [checkDeviceToBootloader] isBleReconnect: ', isBleReconnect);

    // check device goto bootloader mode
    let isFirstCheck = true;
    let checkCount = 0;
    let hasPromptedWebDevice = false;
    let isPromptingWebDevice = false;
    // eslint-disable-next-line prefer-const
    let timeoutTimer: ReturnType<typeof setTimeout> | undefined;

    const isTouchOrProDevice =
      this?.device?.getCurrentDeviceType() === EDeviceType.Touch ||
      this?.device?.getCurrentDeviceType() === EDeviceType.Pro;

    const intervalTimer: ReturnType<typeof setInterval> | undefined = setInterval(
      async () => {
        checkCount += 1;
        Log.log('FirmwareUpdateBaseMethod [checkDeviceToBootloader] isFirstCheck: ', isFirstCheck);
        if (isTouchOrProDevice && isFirstCheck) {
          isFirstCheck = false;
          Log.log('FirmwareUpdateBaseMethod [checkDeviceToBootloader] wait 3000ms');
          await wait(3000);
        }

        if (
          checkCount > 4 &&
          DataManager.isBrowserWebUsb(DataManager.getSettings('env')) &&
          !this.payload.skipWebDevicePrompt &&
          !hasPromptedWebDevice &&
          !isPromptingWebDevice
        ) {
          isPromptingWebDevice = true;
          try {
            this.postTipMessage(FirmwareUpdateTipMessage.SelectDeviceInBootloaderForWebDevice);
            const confirmed = await this._promptDeviceInBootloaderForWebDevice();
            hasPromptedWebDevice = true;
            if (confirmed) {
              await this._checkDeviceInBootloaderMode(connectId, intervalTimer, timeoutTimer);
            }
          } catch (e) {
            clearInterval(intervalTimer);
            clearTimeout(timeoutTimer);
            Log.log(
              'FirmwareUpdateBaseMethod [checkDeviceToBootloader] _promptDeviceInBootloaderForWebDevice failed: ',
              e
            );
            this.checkPromise?.reject(e);
          } finally {
            isPromptingWebDevice = false;
          }
          return;
        }

        if (isBleReconnect) {
          if (bleProbeInFlight) return;
          bleProbeInFlight = true;
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
              clearInterval(intervalTimer);
              this.checkPromise?.resolve(true);
            }
          } catch (e) {
            // ignore error because of device is not connected
            Log.log('catch Bluetooth error when device is restarting: ', e);
          } finally {
            bleProbeInFlight = false;
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

  async enterBootloaderMode() {
    const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());
    if (this.device.features && !this.device.isBootloader()) {
      const serialNo = this.device.getCurrentSerialNo();
      const deviceType = this.device.getCurrentDeviceType();
      // auto go to bootloader mode
      try {
        this.postTipMessage(FirmwareUpdateTipMessage.AutoRebootToBootloader);
        const bootRes = await typedCall('DeviceBackToBoot', 'Success');
        // @ts-expect-error
        if (bootRes.type === 'CallMethodError') {
          throw ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateAutoEnterBootFailure);
        }
        this.postTipMessage(FirmwareUpdateTipMessage.GoToBootloaderSuccess);
        this.checkDeviceToBootloader(this.payload.connectId);

        // force clean classic device cache so that the device can initialize again
        if (DeviceModelToTypes.model_classic.includes(deviceType)) {
          DevicePool.clearDeviceCache(serialNo);
        }
        delete DevicePool.devicesCache[''];
        await this.checkPromise?.promise;
        this.checkPromise = null;
        /**
         * Touch 1 with bootloader v2.5.0 issue: BLE chip need more time for looking up name, here change the delay time to 3000ms after rebooting.
         */
        const isTouch = DeviceModelToTypes.model_touch.includes(deviceType);
        await wait(isTouch ? 3000 : 1500);
        await this.device.acquire();
        return true;
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
  }

  /**
   * @description The instruction that triggers the update process
   * @param path The path of the file to be updated
   */
  async startEmmcFirmwareUpdate({ path }: { path: string }) {
    const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());
    let updateResponse: TypedResponseMessage<'Success'>;
    try {
      updateResponse = await typedCall('FirmwareUpdateEmmc', 'Success', {
        path,
        reboot_on_success: true,
      });
    } catch (error) {
      if (isDeviceDisconnectedError(error)) {
        Log.log('Rebooting device');
        updateResponse = {
          type: 'Success',
          message: { message: FIRMWARE_UPDATE_CONFIRM },
        };
      } else {
        throw error;
      }
    }
    if (updateResponse.type !== 'Success') {
      throw ERRORS.TypedError(HardwareErrorCode.FirmwareError, 'firmware update error');
    }
    this.postTipMessage(FirmwareUpdateTipMessage.FirmwareUpdating);
  }

  /**
   * @description Create the updates folder if it does not exist
   * @param path The path of the folder to be created
   */
  async createUpdatesFolderIfNotExists(path: string) {
    const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());
    await typedCall('EmmcDirMake', 'Success', {
      path,
    });
  }

  /**
   * @param payload The payload of the file to be updated
   * @param filePath The path of the file to be updated
   */
  async emmcCommonUpdateProcess({
    payload,
    filePath,
    processedSize,
    totalSize,
  }: PROTO.FirmwareUpload & {
    filePath: string;
    processedSize?: number;
    totalSize?: number;
  }) {
    if (!filePath.startsWith('0:')) {
      throw new Error('filePath must start with 0:');
    }
    const env = DataManager.getSettings('env');
    const perPackageSize = DataManager.isBleConnect(env) ? 16 : 128;
    const chunkSize = 1024 * perPackageSize;
    const totalChunks = Math.ceil(payload.byteLength / chunkSize);
    let offset = 0;
    let currentFileProcessed = 0;

    for (let i = 0; i < totalChunks; i++) {
      const chunkStart = i * chunkSize;
      const chunkEnd = Math.min(chunkStart + chunkSize, payload.byteLength);
      const chunkLength = chunkEnd - chunkStart;
      const chunk = payload.slice(chunkStart, chunkEnd);
      const overwrite = i === 0;

      // Calculate progress based on whether we're tracking overall progress or single file progress
      let progress: number;
      if (totalSize !== undefined && processedSize !== undefined) {
        currentFileProcessed = processedSize + chunkEnd;
        progress = Math.min(Math.ceil((currentFileProcessed / totalSize) * 100), 99);
      } else {
        progress = Math.min(Math.ceil(((i + 1) / totalChunks) * 100), 99);
      }

      const writeRes = await this.emmcFileWriteWithRetry(
        filePath,
        chunkLength,
        offset,
        chunk,
        overwrite,
        progress
      );
      // @ts-expect-error
      offset += writeRes.message.processed_byte;
      this.postProgressMessage(progress, 'transferData');
    }

    // Return processed size only if we're tracking overall progress
    return totalSize !== undefined ? (processedSize ?? 0) + payload.byteLength : 0;
  }

  async emmcCommonUpdateProcessFromSource({
    source,
    filePath,
    processedSize,
    totalSize,
  }: {
    source: FirmwareByteSource;
    filePath: string;
    processedSize?: number;
    totalSize?: number;
  }) {
    if (!filePath.startsWith('0:')) {
      throw new Error('filePath must start with 0:');
    }
    const env = DataManager.getSettings('env');
    const chunkSize = 1024 * (DataManager.isBleConnect(env) ? 16 : 128);

    await writeFirmwareByteSource({
      source,
      chunkSize,
      write: async ({ data, sourceOffset, length, first }) => {
        const progress =
          totalSize !== undefined && processedSize !== undefined
            ? Math.min(Math.ceil(((processedSize + sourceOffset + length) / totalSize) * 100), 99)
            : Math.min(Math.ceil(((sourceOffset + length) / source.size) * 100), 99);
        const writeRes = await this.emmcFileWriteWithRetry(
          filePath,
          length,
          sourceOffset,
          data,
          first,
          progress
        );
        if (!writeRes) {
          throw ERRORS.TypedError(
            HardwareErrorCode.EmmcFileWriteFirmwareError,
            'transfer data error'
          );
        }
        const processedBytes = Number(writeRes.message.processed_byte);
        this.postProgressMessage(progress, 'transferData');
        return Number.isFinite(processedBytes) ? processedBytes : length;
      },
    });

    return totalSize !== undefined ? (processedSize ?? 0) + source.size : 0;
  }

  async emmcFileWriteWithRetry(
    filePath: string,
    chunkLength: number,
    offset: number,
    chunk: ArrayBuffer | Buffer,
    overwrite: boolean,
    progress: number | null
  ) {
    const writeFunc = async () => {
      const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());
      // @ts-expect-error
      const writeRes = await typedCall('EmmcFileWrite', 'EmmcFile', {
        file: {
          path: filePath,
          len: chunkLength,
          offset,
          data: chunk,
        },
        overwrite,
        append: offset !== 0,
        ui_percentage: progress,
      });
      if (writeRes.type !== 'EmmcFile') {
        // @ts-expect-error
        if (writeRes.type === 'CallMethodError') {
          if (((writeRes as any).message.error ?? '').indexOf(SESSION_ERROR) > -1) {
            throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, SESSION_ERROR);
          }
        }
        throw ERRORS.TypedError(
          HardwareErrorCode.EmmcFileWriteFirmwareError,
          'transfer data error'
        );
      }
      return writeRes;
    };

    let retryCount = 10;
    while (retryCount > 0) {
      try {
        const result = await writeFunc();
        return result;
      } catch (error) {
        Log.error(`emmcWrite error: `, error);
        retryCount--;
        if (retryCount === 0) {
          throw ERRORS.TypedError(
            HardwareErrorCode.EmmcFileWriteFirmwareError,
            'transfer data error'
          );
        }
        const env = DataManager.getSettings('env');
        if (DataManager.isBleConnect(env)) {
          await wait(3000);
          await this.device.deviceConnector?.acquire(
            this.device.originalDescriptor.id,
            null,
            true,
            this.payload.connectProtocol ?? this.device.originalDescriptor.protocolType
          );
          await this.device.initialize();
        } else if (
          error?.message?.indexOf(SESSION_ERROR) > -1 ||
          error?.response?.data?.indexOf(SESSION_ERROR) > -1
        ) {
          const deviceDiff = await this.device.deviceConnector?.enumerate();
          const devicesDescriptor = deviceDiff?.descriptors ?? [];
          const { deviceList } = await DevicePool.getDevices(devicesDescriptor, undefined, {
            connectProtocol:
              this.payload.connectProtocol ?? this.device.originalDescriptor.protocolType,
          });
          if (deviceList.length === 1 && deviceList[0]?.isBootloader()) {
            this.device.updateFromCache(deviceList[0]);
            await this.device.acquire();
            this.device.getCommands().mainId = this.device.mainId ?? '';
          }
        }
        await wait(2000);
      }
    }
  }

  /**
   * @description Device reboot (available in bootloader mode)
   * @param rebootType Reboot type, see the RebootType enum
   */
  async reboot(rebootType: RebootType) {
    const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());
    try {
      const res = await typedCall('Reboot', 'Success', {
        reboot_type: rebootType,
      });
      return res.message;
    } catch (error) {
      // Device disconnection during reboot is expected behavior
      if (
        error instanceof Error &&
        (error.message.includes('device was disconnected') ||
          error.message.includes('transferIn') ||
          error.message.includes('USBDevice'))
      ) {
        // This is expected - device successfully rebooted and disconnected
        return { message: 'Device rebooted successfully' };
      }
      // Re-throw other errors
      throw error;
    }
  }
}
