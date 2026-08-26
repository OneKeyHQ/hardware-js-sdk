import { blake2s } from '@noble/hashes/blake2s';
import { bytesToHex } from '@noble/hashes/utils';
import { createDeviceNotSupportMethodError } from '@onekeyfe/hd-shared';
import { DeviceSessionPinType } from '@onekeyfe/hd-transport';

import { BaseMethod } from '../BaseMethod';
import { decodeJpegBase64ToRgba } from '../helpers/base64Data';
import { invalidParameter } from '../helpers/filesystemValidation';
import { writeProtocolV2File } from '../helpers/protocolV2FileWrite';
import { UI_REQUEST, createUiMessage } from '../../events/ui-request';
import { supportsProtocolV2Message } from '../../protocols/protocol-v2/features';
import { LoggerNames, getLogger } from '../../utils';
import {
  PRO2_WALLPAPER_HEIGHT,
  PRO2_WALLPAPER_WIDTH,
  type Pro2WallpaperColorFormat,
  encodePro2Wallpaper,
} from '../../utils/pro2Wallpaper';
import {
  buildPro2HostAssetPackage,
  supportsPro2HostAssetPackage,
} from '../../utils/pro2HostAssetPackage';

export type DeviceUploadWallpaperParams = {
  jpegBase64: string;
  /**
   * Legacy firmware uses this name for the uploaded `.bin` file. Firmware
   * 1.0.1+ always consumes the fixed `wallpaper.okpkg` package path.
   */
  fileName?: string;
  chunkSize?: number;
};

export type DeviceUploadWallpaperResponse = {
  /**
   * Filesystem path sent to `DeviceSettingsSet`. On firmware 1.0.1+ this is
   * the temporary package path; firmware extracts and persists wallpaper.bin.
   */
  path: string;
  size: number;
  colorFormat: Pro2WallpaperColorFormat;
  message?: string;
};

const WALLPAPER_DIRECTORY = 'vol1:/wallpapers';
const WALLPAPER_PACKAGE_PATH = `${WALLPAPER_DIRECTORY}/wallpaper.okpkg`;
const WALLPAPER_PACKAGE_ENTRY = 'wallpaper.bin';
const SAFE_FILE_NAME = /^[A-Za-z0-9_-]+(?:\.bin)?$/;
const DEVICE_SETTINGS_SET_MESSAGE_TYPE = 60412;
const FILESYSTEM_FILE_WRITE_MESSAGE_TYPE = 60805;
const FILESYSTEM_DIR_MAKE_MESSAGE_TYPE = 60809;
const WALLPAPER_PACKAGE_BLE_CHUNK_SIZE = 1960;
const Log = getLogger(LoggerNames.Method);

function normalizeFileName(fileName: string | undefined, data: Uint8Array): string {
  if (fileName !== undefined && (!fileName || !SAFE_FILE_NAME.test(fileName))) {
    throw invalidParameter(
      'Parameter [fileName] may only contain letters, numbers, underscores, hyphens and an optional .bin suffix.'
    );
  }
  const baseName = fileName ?? `wallpaper-${bytesToHex(blake2s(data)).slice(0, 12)}`;
  return baseName.endsWith('.bin') ? baseName : `${baseName}.bin`;
}

export default class DeviceUploadWallpaper extends BaseMethod<DeviceUploadWallpaperParams> {
  getSupportedProtocols() {
    return ['V2'] as const;
  }

  private encoded?: { data: Uint8Array; colorFormat: Pro2WallpaperColorFormat };

  private directoryReady = false;

  private uploaded = false;

  private path = '';

  init() {
    const { jpegBase64, fileName, chunkSize } = this.payload;
    if (chunkSize !== undefined && (!Number.isInteger(chunkSize) || chunkSize <= 0)) {
      throw invalidParameter('Parameter [chunkSize] must be a positive integer.');
    }

    const decoded = decodeJpegBase64ToRgba({
      jpegBase64,
      parameterName: 'jpegBase64',
      expectedWidth: PRO2_WALLPAPER_WIDTH,
      expectedHeight: PRO2_WALLPAPER_HEIGHT,
    });
    this.encoded = encodePro2Wallpaper({
      width: PRO2_WALLPAPER_WIDTH,
      height: PRO2_WALLPAPER_HEIGHT,
      rgba: decoded.data,
    });
    this.path = `${WALLPAPER_DIRECTORY}/${normalizeFileName(fileName, this.encoded.data)}`;
    this.params = { jpegBase64, fileName, chunkSize };
    this.unlockPolicy = 'unlock-before-run';
    // File writes and wallpaper apply require an unlocked device. Either PIN
    // may authorize this device-management action.
    this.protocolV2PreUnlockPinType = DeviceSessionPinType.Any;
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
  }

  private async assertCapabilities() {
    const protocolInfo = await this.device.ensureProtocolV2RuntimeContext();
    const requiredMessageTypes = [
      DEVICE_SETTINGS_SET_MESSAGE_TYPE,
      FILESYSTEM_FILE_WRITE_MESSAGE_TYPE,
      FILESYSTEM_DIR_MAKE_MESSAGE_TYPE,
    ];
    if (
      requiredMessageTypes.some(
        messageType => !supportsProtocolV2Message(protocolInfo, messageType)
      )
    ) {
      throw createDeviceNotSupportMethodError(this.name, this.device.getCurrentFirmwareType());
    }
  }

  private async ensureDirectory() {
    if (this.directoryReady) return;
    try {
      await this.device.commands.typedCall('FilesystemDirMake', 'Success', {
        path: WALLPAPER_DIRECTORY,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/exist/i.test(message)) throw error;
    }
    this.directoryReady = true;
  }

  private async upload(path: string, data: Uint8Array, bleChunkSizeLimit?: number) {
    if (this.uploaded) return;

    await writeProtocolV2File({
      commands: this.device.commands,
      path,
      data,
      totalSize: data.byteLength,
      chunkSize: this.params.chunkSize,
      bleChunkSizeLimit,
      maxChunkRetries: 3,
      overwrite: true,
      append: false,
      throwIfAborted: () => this.throwIfAborted(),
      onProgress: payload => {
        if (typeof this.postMessage === 'function') {
          this.postMessage(createUiMessage(UI_REQUEST.DEVICE_PROGRESS, payload));
        }
      },
    });
    this.uploaded = true;
  }

  async run(): Promise<DeviceUploadWallpaperResponse> {
    const { encoded } = this;
    if (!encoded) throw invalidParameter('Wallpaper data has not been initialized.');
    await this.assertCapabilities();
    await this.ensureDirectory();
    const useHostAssetPackage = supportsPro2HostAssetPackage(
      this.device.state?.versions.firmware ?? undefined
    );
    const data = useHostAssetPackage
      ? buildPro2HostAssetPackage([{ name: WALLPAPER_PACKAGE_ENTRY, data: encoded.data }])
      : encoded.data;
    if (useHostAssetPackage) this.path = WALLPAPER_PACKAGE_PATH;
    await this.upload(
      this.path,
      data,
      useHostAssetPackage ? WALLPAPER_PACKAGE_BLE_CHUNK_SIZE : undefined
    );
    const response = await this.device.commands.typedCall('DeviceSettingsSet', 'Success', {
      settings: { wallpaper_path: this.path },
    });
    try {
      await this.device.refreshProtocolV2SettingsAfterMutation();
    } catch (error) {
      // The wallpaper is already applied. A transient read-back failure must not
      // make callers retry the completed file upload.
      Log.warn('Protocol V2 wallpaper settings refresh failed after apply', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return {
      path: this.path,
      size: data.byteLength,
      colorFormat: encoded.colorFormat,
      message: response.message?.message,
    };
  }
}
