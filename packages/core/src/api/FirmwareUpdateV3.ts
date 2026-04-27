import { EDeviceType, ERRORS, HardwareError, HardwareErrorCode, wait } from '@onekeyfe/hd-shared';
import semver from 'semver';
import JSZip from 'jszip';
import { RebootType } from '@onekeyfe/hd-transport';

import { FirmwareUpdateTipMessage, UI_REQUEST } from '../events/ui-request';
import { validateParams } from './helpers/paramsValidator';
import {
  LoggerNames,
  getDeviceBLEFirmwareVersion,
  getDeviceBootloaderVersion,
  getDeviceFirmwareVersion,
  getDeviceType,
  getFirmwareType,
  getLogger,
} from '../utils';
import { getBinary, getSysResourceBinary } from './firmware/getBinary';
import { DataManager } from '../data-manager';
import { FirmwareUpdateBaseMethod } from './firmware/FirmwareUpdateBaseMethod';
import { DevicePool } from '../device/DevicePool';
import { DEVICE } from '../events';

import type { FirmwareUpdateV3Params } from '../types/api/firmwareUpdate';
import type { Deferred, EFirmwareType } from '@onekeyfe/hd-shared';
import type { TypedResponseMessage } from '../device/DeviceCommands';

/**
 * Pro2 FirmwareTargetType enum (from messages-pro2.json)
 */
const Pro2FirmwareTargetType = {
  TARGET_MAIN_APP: 0,
  TARGET_MAIN_BOOT: 1,
  TARGET_BLE: 2,
  TARGET_SE1: 3,
  TARGET_SE2: 4,
  TARGET_SE3: 5,
  TARGET_SE4: 6,
  TARGET_RESOURCE: 10,
} as const;

/**
 * Map firmware file name to Pro2 target_id
 */
function pro2FileNameToTargetId(fileName: string): number {
  if (fileName.includes('ble')) return Pro2FirmwareTargetType.TARGET_BLE;
  if (fileName.includes('bootloader')) return Pro2FirmwareTargetType.TARGET_MAIN_BOOT;
  if (fileName.includes('se1')) return Pro2FirmwareTargetType.TARGET_SE1;
  if (fileName.includes('se2')) return Pro2FirmwareTargetType.TARGET_SE2;
  if (fileName.includes('se3')) return Pro2FirmwareTargetType.TARGET_SE3;
  if (fileName.includes('se4')) return Pro2FirmwareTargetType.TARGET_SE4;
  return Pro2FirmwareTargetType.TARGET_MAIN_APP;
}

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

    this.params = {
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
    const { device } = this;

    // Pro2 takes a completely separate update path (Protocol V2 messages, no
    // bootloader-version gating, no GetFeatures completion polling). The V1
    // flow below is left untouched.
    if (device.originalDescriptor?.protocolType === 'V2') {
      return this.runProtocolV2();
    }

    const { features } = device;

    const deviceType = getDeviceType(features);
    const bootloaderCurrVersion = getDeviceBootloaderVersion(features).join('.');

    this.validateDeviceAndVersion(deviceType, bootloaderCurrVersion);

    if (!features) {
      throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Device features not available');
    }

    const deviceFirmwareType = getFirmwareType(features);
    const firmwareType = this.params.firmwareType ?? deviceFirmwareType;
    this.isSwitchFirmware = firmwareType !== deviceFirmwareType;

    let resourceBinary: ArrayBuffer | null = null;
    let fwBinaryMap: { fileName: string; binary: ArrayBuffer }[] = [];
    let bootloaderBinary: ArrayBuffer | null = null;
    try {
      this.postTipMessage(FirmwareUpdateTipMessage.StartDownloadFirmware);
      resourceBinary = await this.prepareResourceBinary(firmwareType);
      fwBinaryMap = await this.prepareFirmwareAndBleBinary(firmwareType);
      bootloaderBinary = await this.prepareBootloaderBinary(firmwareType);
      this.postTipMessage(FirmwareUpdateTipMessage.FinishDownloadFirmware);
    } catch (err) {
      throw ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateDownloadFailed, err.message ?? err);
    }

    if (!bootloaderBinary && fwBinaryMap.length === 0) {
      throw ERRORS.TypedError(
        HardwareErrorCode.FirmwareUpdateDownloadFailed,
        'No firmware to update'
      );
    }

    await this.enterBootloaderMode();

    const updateResult = await this.executeUpdate({
      resourceBinary,
      fwBinaryMap,
      bootloaderBinary,
    });
    return updateResult;
  }

  /**
   * Pro2 (Protocol V2) firmware update flow.
   *
   * Differences from the V1 flow that justify a separate method:
   *   - No bootloader-version gate. Pro2 doesn't expose `bootloader_version`
   *     through its V2 protobuf schema and the V2 firmware itself decides
   *     whether install is allowed (via the FirmwareUpdate Failure code).
   *   - No legacy `enterBootloaderMode()` (which would send `DeviceBackToBoot`,
   *     a V1-only message). When Pro2's bootloader handoff is finalized,
   *     swap in `Reboot { reboot_type: BootLoader }` here.
   *   - No GetFeatures polling for completion: `FirmwareUpdate` is treated as
   *     a synchronous request — Success means install finished; if
   *     `reboot_on_success` is true the device reboots itself.
   *
   * Common helpers reused from the V1 flow: `prepareResourceBinary`,
   * `prepareFirmwareAndBleBinary`, `prepareBootloaderBinary`,
   * `pro2CommonUpdateProcess`, `pro2CreateFolder`, `pro2StartFirmwareUpdate`.
   */
  private async runProtocolV2() {
    const { device } = this;
    const { features } = device;

    if (getDeviceType(features) !== EDeviceType.Pro2) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'protocolType=V2 requires a Pro2 device'
      );
    }

    if (!features) {
      throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Device features not available');
    }

    const deviceFirmwareType = getFirmwareType(features);
    const firmwareType = this.params.firmwareType ?? deviceFirmwareType;
    this.isSwitchFirmware = firmwareType !== deviceFirmwareType;

    let resourceBinary: ArrayBuffer | null = null;
    let fwBinaryMap: { fileName: string; binary: ArrayBuffer }[] = [];
    let bootloaderBinary: ArrayBuffer | null = null;
    try {
      this.postTipMessage(FirmwareUpdateTipMessage.StartDownloadFirmware);
      resourceBinary = await this.prepareResourceBinary(firmwareType);
      fwBinaryMap = await this.prepareFirmwareAndBleBinary(firmwareType);
      bootloaderBinary = await this.prepareBootloaderBinary(firmwareType);
      this.postTipMessage(FirmwareUpdateTipMessage.FinishDownloadFirmware);
    } catch (err) {
      throw ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateDownloadFailed, err.message ?? err);
    }

    if (!bootloaderBinary && fwBinaryMap.length === 0) {
      throw ERRORS.TypedError(
        HardwareErrorCode.FirmwareUpdateDownloadFailed,
        'No firmware to update'
      );
    }

    await this.pro2EnterBootloader();

    await this.executeUpdateProtocolV2({
      resourceBinary,
      fwBinaryMap,
      bootloaderBinary,
    });

    this.postTipMessage(FirmwareUpdateTipMessage.FirmwareUpdateCompleted);
    DevicePool.resetState();

    // Pro2's V2 schema has no GetFeatures, so the post-install version triplet
    // V1 returns is not available here. Caller code that depends on these
    // version strings must be guarded by protocolType !== 'V2'.
    return {
      bootloaderVersion: '',
      bleVersion: '',
      firmwareVersion: '',
    };
  }

  /**
   * Reboot Pro2 into bootloader before file write + FirmwareUpdate.
   *
   * Mirrors what the pro2-debug script's Reboot tab does
   * (`Reboot { reboot_type: BootLoader }`), but routes through the SDK's
   * `this.reboot()` helper (typedCall under the hood) instead of writing
   * raw WebUSB bytes. The helper already tolerates the device dropping the
   * USB connection mid-call, which is the expected behavior on reboot.
   *
   * Pro2 bootloader-mode is still in flux on the firmware side. Once it
   * stabilizes, add a reconnect + Ping verification step after the wait
   * below to confirm we're talking to bootloader before file writes.
   */
  private async pro2EnterBootloader() {
    this.postTipMessage(FirmwareUpdateTipMessage.AutoRebootToBootloader);
    await this.reboot(RebootType.BootLoader);
    // Brief settle delay; replace with proper reconnect/Ping handshake once
    // Pro2 bootloader-mode is finalized.
    await wait(1500);
    this.postTipMessage(FirmwareUpdateTipMessage.GoToBootloaderSuccess);
  }

  /**
   * Pro2 file-write + FirmwareUpdate trigger.
   *
   * Filesystem layout follows the pro2-debug script's `vol1:` convention.
   * If the Pro2 firmware later anchors firmware payloads elsewhere, update
   * the path constants below.
   */
  private async executeUpdateProtocolV2({
    resourceBinary,
    fwBinaryMap,
    bootloaderBinary,
  }: {
    resourceBinary: ArrayBuffer | null;
    fwBinaryMap: { fileName: string; binary: ArrayBuffer }[];
    bootloaderBinary: ArrayBuffer | null;
  }) {
    let totalSize = 0;
    let processedSize = 0;

    if (resourceBinary) totalSize += resourceBinary.byteLength;
    for (const fwbinary of fwBinaryMap) totalSize += fwbinary.binary.byteLength;
    if (bootloaderBinary) totalSize += bootloaderBinary.byteLength;

    this.postTipMessage(FirmwareUpdateTipMessage.StartTransferData);

    if (resourceBinary) {
      // Resource files live under `vol1:res/`. DirMake first so FileWrite
      // doesn't fail on a missing parent directory.
      await this.pro2CreateFolder(`vol1:res/`);
      const file = await JSZip.loadAsync(resourceBinary);
      const files = Object.entries(file.files);
      for (const [fileName, entry] of files) {
        const name = fileName.split('/').pop();
        if (!entry.dir && fileName.indexOf('__MACOSX') === -1 && name) {
          const data = await entry.async('arraybuffer');
          processedSize = await this.pro2CommonUpdateProcess({
            payload: data,
            filePath: `vol1:res/${name}`,
            processedSize,
            totalSize,
          });
        }
      }
    }

    if (bootloaderBinary) {
      processedSize = await this.pro2CommonUpdateProcess({
        payload: bootloaderBinary,
        filePath: `vol1:bootloader.bin`,
        processedSize,
        totalSize,
      });
    }

    for (const fwbinary of fwBinaryMap) {
      processedSize = await this.pro2CommonUpdateProcess({
        payload: fwbinary.binary,
        filePath: `vol1:${fwbinary.fileName}`,
        processedSize,
        totalSize,
      });
    }

    this.postTipMessage(FirmwareUpdateTipMessage.ConfirmOnDevice);
    const targets = fwBinaryMap.map(fw => ({
      target_id: pro2FileNameToTargetId(fw.fileName),
      path: `vol1:${fw.fileName}`,
    }));
    // FirmwareUpdate is treated as synchronous: device responds Success only
    // after install finishes (then auto-reboots if reboot_on_success=true).
    // No Ping polling needed.
    await this.pro2StartFirmwareUpdate({ targets, rebootOnSuccess: true });
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
    const fwBinaryMap: { fileName: string; binary: ArrayBuffer }[] = [];
    if (this.params.firmwareBinary) {
      fwBinaryMap.push({
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
          fileName: 'firmware.bin',
          binary: firmwareBinary,
        });
      }
    }

    if (this.params.bleBinary) {
      fwBinaryMap.push({
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
          fileName: 'ble-firmware.bin',
          binary: bleBinary.binary,
        });
      }
    }
    return fwBinaryMap;
  }

  private async executeUpdate({
    resourceBinary,
    fwBinaryMap,
    bootloaderBinary,
  }: {
    resourceBinary: ArrayBuffer | null;
    fwBinaryMap: { fileName: string; binary: ArrayBuffer }[];
    bootloaderBinary: ArrayBuffer | null;
  }) {
    let totalSize = 0;
    let processedSize = 0;

    if (resourceBinary) {
      totalSize += resourceBinary.byteLength;
    }
    for (const fwbinary of fwBinaryMap) {
      totalSize += fwbinary.binary.byteLength;
    }
    if (bootloaderBinary) {
      totalSize += bootloaderBinary.byteLength;
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

    if (bootloaderBinary) {
      processedSize = await this.emmcCommonUpdateProcess({
        payload: bootloaderBinary,
        filePath: `0:boot/bootloader.bin`,
        processedSize,
        totalSize,
      });
    }

    await this.createUpdatesFolderIfNotExists(`0:updates/`);

    for (const fwbinary of fwBinaryMap) {
      if (fwbinary) {
        processedSize = await this.emmcCommonUpdateProcess({
          payload: fwbinary.binary,
          filePath: `0:updates/${fwbinary.fileName}`,
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
        const features = featuresRes.message;
        const bootloaderVersion = getDeviceBootloaderVersion(features).join('.');
        const bleVersion = getDeviceBLEFirmwareVersion(features).join('.');
        const firmwareVersion = getDeviceFirmwareVersion(features).join('.');
        // Treat update as complete once firmware version becomes non-zero
        if (firmwareVersion !== '0.0.0') {
          this.postTipMessage(FirmwareUpdateTipMessage.FirmwareUpdateCompleted);
          DevicePool.resetState();
          return {
            bootloaderVersion,
            bleVersion,
            firmwareVersion,
          };
        }
        // Still in update mode; continue polling (e.g., iOS may return firmwareVersion 0.0.0 during switches)
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
            this.isBleReconnect() && (this.params.bleBinary || this.params.bleVersion)
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
