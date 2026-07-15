import { blake2s } from '@noble/hashes/blake2s';
import { bytesToHex } from '@noble/hashes/utils';

import { BaseMethod } from '../BaseMethod';
import { invalidParameter } from '../helpers/filesystemValidation';
import { writeProtocolV2File } from '../helpers/protocolV2FileWrite';
import {
  encodePro2Wallpaper,
  PRO2_WALLPAPER_HEIGHT,
  PRO2_WALLPAPER_WIDTH,
  type Pro2WallpaperColorFormat,
} from '../../utils/pro2Wallpaper';

export type DeviceUploadWallpaperParams = {
  width: number;
  height: number;
  rgba: Uint8Array | ArrayBuffer;
  fileName?: string;
  chunkSize?: number;
};

export type DeviceUploadWallpaperResponse = {
  path: string;
  size: number;
  colorFormat: Pro2WallpaperColorFormat;
  message?: string;
};

const WALLPAPER_DIRECTORY = 'vol0:/wallpapers/user';
const SAFE_FILE_NAME = /^[A-Za-z0-9_-]+(?:\.bin)?$/;

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
  private encoded?: { data: Uint8Array; colorFormat: Pro2WallpaperColorFormat };

  private directoryReady = false;

  private uploaded = false;

  private path = '';

  init() {
    const { width, height, rgba, fileName, chunkSize } = this.payload;
    if (width !== PRO2_WALLPAPER_WIDTH || height !== PRO2_WALLPAPER_HEIGHT) {
      throw invalidParameter(
        `Pro2 wallpaper dimensions must be ${PRO2_WALLPAPER_WIDTH}x${PRO2_WALLPAPER_HEIGHT}.`
      );
    }
    if (!(rgba instanceof ArrayBuffer) && !ArrayBuffer.isView(rgba)) {
      throw invalidParameter('Parameter [rgba] must be an ArrayBuffer or Uint8Array.');
    }
    if (chunkSize !== undefined && (!Number.isInteger(chunkSize) || chunkSize <= 0)) {
      throw invalidParameter('Parameter [chunkSize] must be a positive integer.');
    }

    const rgbaBytes =
      rgba instanceof ArrayBuffer
        ? rgba
        : new Uint8Array(rgba.buffer, rgba.byteOffset, rgba.byteLength);
    this.encoded = encodePro2Wallpaper({ width, height, rgba: rgbaBytes });
    this.path = `${WALLPAPER_DIRECTORY}/${normalizeFileName(fileName, this.encoded.data)}`;
    this.params = { width, height, rgba: rgbaBytes, fileName, chunkSize };
    this.requireProtocolV2 = true;
    this.unlockPolicy = 'retry-on-locked';
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
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

  private async upload() {
    if (this.uploaded) return;
    const encoded = this.encoded;
    if (!encoded) throw invalidParameter('Wallpaper data has not been initialized.');

    await writeProtocolV2File({
      commands: this.device.commands,
      path: this.path,
      data: encoded.data,
      totalSize: encoded.data.byteLength,
      chunkSize: this.params.chunkSize,
      overwrite: true,
      append: false,
      throwIfAborted: () => this.throwIfAborted(),
    });
    this.uploaded = true;
  }

  async run(): Promise<DeviceUploadWallpaperResponse> {
    const encoded = this.encoded;
    if (!encoded) throw invalidParameter('Wallpaper data has not been initialized.');
    await this.ensureDirectory();
    await this.upload();
    const response = await this.device.commands.typedCall('DeviceSettingsSet', 'Success', {
      settings: { wallpaper_path: this.path },
    });
    return {
      path: this.path,
      size: encoded.data.byteLength,
      colorFormat: encoded.colorFormat,
      message: response.message?.message,
    };
  }
}
