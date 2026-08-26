import { ERRORS, HardwareErrorCode, createDeviceNotSupportMethodError } from '@onekeyfe/hd-shared';
import { DeviceSessionPinType } from '@onekeyfe/hd-transport';

import { UI_REQUEST, createUiMessage } from '../../events/ui-request';
import { supportsProtocolV2Message } from '../../protocols/protocol-v2/features';
import {
  PRO2_NFT_DEFAULT_CHUNK_SIZE,
  PRO2_NFT_DEFAULT_PACE_MS,
  PRO2_NFT_DEFAULT_TIMEOUT_MS,
  PRO2_NFT_DIRECTORY,
  PRO2_NFT_IMAGE_HEIGHT,
  PRO2_NFT_IMAGE_WIDTH,
  PRO2_NFT_MAX_CHUNK_SIZE,
  PRO2_NFT_MAX_ITEMS,
  PRO2_NFT_MIN_CHUNK_SIZE,
  PRO2_NFT_THUMBNAIL_HEIGHT,
  PRO2_NFT_THUMBNAIL_WIDTH,
  type Pro2NftBundle,
  buildPro2NftBundleFromEncodedImages,
  getCompletePro2NftBasenames,
} from '../../utils/pro2Nft';
import { encodePro2Image } from '../../utils/pro2Wallpaper';
import {
  buildPro2HostAssetPackage,
  supportsPro2HostAssetPackage,
} from '../../utils/pro2HostAssetPackage';
import { BaseMethod } from '../BaseMethod';
import { decodeJpegBase64ToRgba } from '../helpers/base64Data';
import { invalidParameter } from '../helpers/filesystemValidation';
import { writeProtocolV2File } from '../helpers/protocolV2FileWrite';

export type DeviceUploadNftParams = {
  imageJpegBase64: string;
  thumbnailJpegBase64: string;
  title: string;
  subtitle: string;
  timestampMs?: number;
  chunkSize?: number;
  paceMs?: number;
  timeoutMs?: number;
};

export type DeviceUploadNftResponse = {
  basename: string;
  /** Final image path after firmware extracts a host-asset package. */
  imagePath: string;
  /** Final thumbnail path after firmware extracts a host-asset package. */
  thumbnailPath: string;
  /** Final metadata path after firmware extracts a host-asset package. */
  metadataPath: string;
  totalSize: number;
  nftUpdated: true;
  message?: string;
};

const FILESYSTEM_PATH_INFO_QUERY_MESSAGE_TYPE = 60802;
const FILESYSTEM_FILE_WRITE_MESSAGE_TYPE = 60805;
const FILESYSTEM_DIR_LIST_MESSAGE_TYPE = 60808;
const NFT_UPDATE_MESSAGE_TYPE = 61500;

export default class DeviceUploadNft extends BaseMethod<DeviceUploadNftParams> {
  private bundle?: Pro2NftBundle;

  getSupportedProtocols() {
    return ['V2'] as const;
  }

  init() {
    const {
      imageJpegBase64,
      thumbnailJpegBase64,
      title,
      subtitle,
      timestampMs = Date.now(),
      chunkSize = PRO2_NFT_DEFAULT_CHUNK_SIZE,
      paceMs = PRO2_NFT_DEFAULT_PACE_MS,
      timeoutMs = PRO2_NFT_DEFAULT_TIMEOUT_MS,
    } = this.payload;
    if (
      !Number.isInteger(chunkSize) ||
      chunkSize < PRO2_NFT_MIN_CHUNK_SIZE ||
      chunkSize > PRO2_NFT_MAX_CHUNK_SIZE
    ) {
      throw invalidParameter(
        `Parameter [chunkSize] must be an integer between ${PRO2_NFT_MIN_CHUNK_SIZE} and ${PRO2_NFT_MAX_CHUNK_SIZE}.`
      );
    }
    if (!Number.isInteger(paceMs) || paceMs < 0) {
      throw invalidParameter('Parameter [paceMs] must be a non-negative integer.');
    }
    if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
      throw invalidParameter('Parameter [timeoutMs] must be a positive integer.');
    }

    const encodedImage = (() => {
      const decoded = decodeJpegBase64ToRgba({
        jpegBase64: imageJpegBase64,
        parameterName: 'imageJpegBase64',
        expectedWidth: PRO2_NFT_IMAGE_WIDTH,
        expectedHeight: PRO2_NFT_IMAGE_HEIGHT,
      });
      return encodePro2Image({
        width: PRO2_NFT_IMAGE_WIDTH,
        height: PRO2_NFT_IMAGE_HEIGHT,
        rgba: decoded.data,
        alphaMode: 'black-background',
      }).data;
    })();
    const encodedThumbnail = (() => {
      const decoded = decodeJpegBase64ToRgba({
        jpegBase64: thumbnailJpegBase64,
        parameterName: 'thumbnailJpegBase64',
        expectedWidth: PRO2_NFT_THUMBNAIL_WIDTH,
        expectedHeight: PRO2_NFT_THUMBNAIL_HEIGHT,
      });
      return encodePro2Image({
        width: PRO2_NFT_THUMBNAIL_WIDTH,
        height: PRO2_NFT_THUMBNAIL_HEIGHT,
        rgba: decoded.data,
        alphaMode: 'black-background',
      }).data;
    })();
    this.bundle = buildPro2NftBundleFromEncodedImages({
      image: encodedImage,
      thumbnail: encodedThumbnail,
      title,
      subtitle,
      timestampMs,
    });
    this.params = {
      imageJpegBase64,
      thumbnailJpegBase64,
      title,
      subtitle,
      timestampMs,
      chunkSize,
      paceMs,
      timeoutMs,
    };
    this.unlockPolicy = 'unlock-before-run';
    // File writes and NftUpdate require an unlocked device. Either PIN may
    // authorize this device-management action.
    this.protocolV2PreUnlockPinType = DeviceSessionPinType.Any;
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
  }

  private async assertCapabilities(useHostAssetPackage: boolean) {
    const protocolInfo = await this.device.ensureProtocolV2RuntimeContext();
    const hasFileWrite = supportsProtocolV2Message(
      protocolInfo,
      FILESYSTEM_FILE_WRITE_MESSAGE_TYPE
    );
    const hasPathInfo = supportsProtocolV2Message(
      protocolInfo,
      FILESYSTEM_PATH_INFO_QUERY_MESSAGE_TYPE
    );
    const hasDirList = supportsProtocolV2Message(protocolInfo, FILESYSTEM_DIR_LIST_MESSAGE_TYPE);
    const hasNftUpdate = supportsProtocolV2Message(protocolInfo, NFT_UPDATE_MESSAGE_TYPE);
    if (!hasFileWrite || !hasNftUpdate || (!useHostAssetPackage && (!hasPathInfo || !hasDirList))) {
      throw createDeviceNotSupportMethodError(this.name, this.device.getCurrentFirmwareType());
    }
  }

  private async assertStorageCapacity(basename: string) {
    const { message: pathInfo } = await this.device.commands.typedCall(
      'FilesystemPathInfoQuery',
      'FilesystemPathInfo',
      { path: PRO2_NFT_DIRECTORY },
      { timeoutMs: this.params.timeoutMs }
    );
    if (!pathInfo.exist) return;

    const { message } = await this.device.commands.typedCall(
      'FilesystemDirList',
      'FilesystemDir',
      { path: PRO2_NFT_DIRECTORY, depth: 1 },
      { timeoutMs: this.params.timeoutMs }
    );
    const existingBasenames = getCompletePro2NftBasenames(message.child_files);
    if (existingBasenames.size >= PRO2_NFT_MAX_ITEMS && !existingBasenames.has(basename)) {
      throw ERRORS.TypedError(HardwareErrorCode.NftStorageLimitReached, undefined, {
        count: existingBasenames.size,
        limit: PRO2_NFT_MAX_ITEMS,
      });
    }
  }

  private async updateNft(basename: string) {
    return this.device.commands.typedCall(
      'NftUpdate',
      'Success',
      { file_name_no_ext: basename },
      { timeoutMs: this.params.timeoutMs }
    );
  }

  async run(): Promise<DeviceUploadNftResponse> {
    const { bundle } = this;
    if (!bundle) throw invalidParameter('NFT data has not been initialized.');

    const useHostAssetPackage = supportsPro2HostAssetPackage(
      this.device.state?.versions.firmware ?? undefined
    );
    await this.assertCapabilities(useHostAssetPackage);
    this.throwIfAborted();
    if (!useHostAssetPackage) await this.assertStorageCapacity(bundle.basename);
    this.throwIfAborted();

    const extractedFiles = [
      { path: `${PRO2_NFT_DIRECTORY}/${bundle.basename}.bin`, data: bundle.image },
      { path: `${PRO2_NFT_DIRECTORY}/${bundle.basename}_m.bin`, data: bundle.thumbnail },
      { path: `${PRO2_NFT_DIRECTORY}/${bundle.basename}.json`, data: bundle.metadata },
    ];
    const files = useHostAssetPackage
      ? [
          {
            path: `${PRO2_NFT_DIRECTORY}/${bundle.basename}.okpkg`,
            data: buildPro2HostAssetPackage(
              extractedFiles.map(file => ({
                name: file.path.slice(`${PRO2_NFT_DIRECTORY}/`.length),
                data: file.data,
              }))
            ),
          },
        ]
      : extractedFiles;
    const totalSize = files.reduce((sum, file) => sum + file.data.byteLength, 0);
    let transferredBeforeFile = 0;

    for (const file of files) {
      const transferredAtFileStart = transferredBeforeFile;
      await writeProtocolV2File({
        commands: this.device.commands,
        path: file.path,
        data: file.data,
        totalSize: file.data.byteLength,
        chunkSize: this.params.chunkSize,
        timeoutMs: this.params.timeoutMs,
        paceMs: this.params.paceMs,
        overwrite: true,
        append: false,
        throwIfAborted: () => this.throwIfAborted(),
        onProgress: progress => {
          if (typeof this.postMessage !== 'function') return;
          const transferredBytes = transferredAtFileStart + progress.transferredBytes;
          this.postMessage(
            createUiMessage(UI_REQUEST.DEVICE_PROGRESS, {
              ...progress,
              progress: Math.floor((transferredBytes / totalSize) * 100),
              transferredBytes,
              totalBytes: totalSize,
            })
          );
        },
      });
      transferredBeforeFile += file.data.byteLength;
    }

    this.throwIfAborted();
    const response = await this.updateNft(bundle.basename);
    return {
      basename: bundle.basename,
      imagePath: extractedFiles[0].path,
      thumbnailPath: extractedFiles[1].path,
      metadataPath: extractedFiles[2].path,
      totalSize,
      nftUpdated: true,
      message: response.message?.message,
    };
  }
}
