import type { CommonParams, Response } from '../params';
import type {
  DevOnboardingStatus,
  DeviceFactoryInfo,
  DeviceFirmwareUpdateStatus,
  DeviceStatus,
  ProtocolInfo,
  ProtocolV2DeviceInfo,
  Success,
} from '@onekeyfe/hd-transport';
import type {
  DeviceFactoryInfoSetParams,
  DeviceFirmwareUpdateParams,
  DeviceFirmwareUpdateStatusGetParams,
  DeviceRebootParams,
} from '../../api/protocol-v2/helpers';
import type { DeviceInfoGetParams } from '../../api/protocol-v2/DeviceInfoGet';
import type {
  DeviceUploadWallpaperParams,
  DeviceUploadWallpaperResponse,
} from '../../api/protocol-v2/DeviceUploadWallpaper';

// Re-export implementation parameter types as the single source of truth.
export type {
  DeviceFirmwareTargetInput,
  DeviceFirmwareUpdateParams,
  DeviceFirmwareUpdateStatusGetParams,
  DeviceRebootParams,
  DeviceFactoryInfoSetParams,
  RebootTypeInput,
} from '../../api/protocol-v2/helpers';
export type {
  DeviceInfoGetParams,
  DeviceInfoGetTargets,
  DeviceInfoGetTypes,
} from '../../api/protocol-v2/DeviceInfoGet';
export type {
  DeviceUploadWallpaperParams,
  DeviceUploadWallpaperResponse,
} from '../../api/protocol-v2/DeviceUploadWallpaper';

// ── Shared response shapes (Protocol V2 file system) ────────────────────

export type FileOpSuccess = { message?: string };

export type FileInfo = {
  path: string;
  offset: number;
  total_size: number;
  data?: Uint8Array;
  data_hash?: number;
  processed_byte?: number;
  chunks?: number;
};

export type DirInfo = {
  path: string;
  child_dirs?: string;
  child_files?: string;
};

// All FilesystemPathInfo proto fields are required; keep this type aligned.
export type PathInfoResult = {
  exist: boolean;
  size: number;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  readonly: boolean;
  hidden: boolean;
  system: boolean;
  archive: boolean;
  directory: boolean;
};

// ── Method signatures ─────────────────────────────────────────────────────

/** @deprecated Development-only raw Protocol V2 command. Use `getDeviceState`. */
export declare function deviceInfoGet(
  connectId: string,
  params?: CommonParams & DeviceInfoGetParams
): Response<ProtocolV2DeviceInfo>;

/** @deprecated Development-only raw Protocol V2 command. Use `getDeviceState`. */
export declare function deviceStatusGet(
  connectId: string,
  params?: CommonParams
): Response<DeviceStatus>;

/** @deprecated Development-only raw Protocol V2 command. */
export declare function protocolInfoRequest(
  connectId: string,
  params?: CommonParams
): Response<ProtocolInfo>;

export declare function ping(
  connectId: string,
  params?: CommonParams & { message?: string }
): Response<Success>;

export declare function deviceReboot(
  connectId: string,
  params: CommonParams & DeviceRebootParams
): Response<Success>;

export declare function deviceGetOnboardingStatus(
  connectId: string,
  params?: CommonParams
): Response<DevOnboardingStatus>;

export declare function deviceFirmwareUpdate(
  connectId: string,
  params: CommonParams & DeviceFirmwareUpdateParams
): Response<Success | DeviceFirmwareUpdateStatus>;

export declare function deviceGetFirmwareUpdateStatus(
  connectId: string,
  params?: CommonParams & DeviceFirmwareUpdateStatusGetParams
): Response<DeviceFirmwareUpdateStatus>;

export declare function deviceFactoryInfoSet(
  connectId: string,
  params: CommonParams & DeviceFactoryInfoSetParams
): Response<Success>;

export declare function deviceFactoryInfoGet(
  connectId: string,
  params?: CommonParams
): Response<DeviceFactoryInfo>;

export declare function deviceUploadWallpaper(
  connectId: string,
  params: CommonParams & DeviceUploadWallpaperParams
): Response<DeviceUploadWallpaperResponse>;

export declare function filesystemPermissionFix(
  connectId: string,
  params?: CommonParams
): Response<Success>;

export declare function fileRead(
  connectId: string,
  params: {
    path: string;
    offset?: number;
    totalSize?: number;
    chunkLen?: number;
    uiPercentage?: number;
  }
): Response<FileInfo>;

export declare function fileWrite(
  connectId: string,
  params: {
    path: string;
    offset?: number;
    totalSize?: number;
    chunkSize?: number;
    chunkLen?: number;
    data: ArrayBuffer | Uint8Array | Blob | string;
    overwrite?: boolean;
    append?: boolean;
    uiPercentage?: number;
    timeoutMs?: number | string;
  }
): Response<FileInfo>;

export declare function fileDelete(
  connectId: string,
  params: { path: string }
): Response<FileOpSuccess>;

export declare function dirList(
  connectId: string,
  params: { path: string; depth?: number }
): Response<DirInfo>;

export declare function dirMake(
  connectId: string,
  params: { path: string }
): Response<FileOpSuccess>;

export declare function dirRemove(
  connectId: string,
  params: { path: string }
): Response<FileOpSuccess>;

export declare function pathInfo(
  connectId: string,
  params: { path: string; timeoutMs?: number | string }
): Response<PathInfoResult>;

export declare function uploadPortfolio(
  connectId: string,
  params: {
    packageBytes: ArrayBuffer | Uint8Array | Blob;
    timeoutMs?: number | string;
  }
): Response<FileInfo & { portfolioUpdated: true }>;

export declare function filesystemFormat(connectId: string): Response<Success>;
