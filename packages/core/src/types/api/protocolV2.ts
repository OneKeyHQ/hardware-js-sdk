import type { CommonParams, Response } from '../params';
import type { DevOnboardingStatus, Success } from '@onekeyfe/hd-transport';
import type { DeviceRebootParams } from '../../api/protocol-v2/helpers';
import type {
  DeviceUploadWallpaperParams,
  DeviceUploadWallpaperResponse,
} from '../../api/protocol-v2/DeviceUploadWallpaper';

// Re-export implementation parameter types as the single source of truth.
export type { DeviceRebootParams, RebootTypeInput } from '../../api/protocol-v2/helpers';
export type {
  DeviceUploadWallpaperParams,
  DeviceUploadWallpaperResponse,
} from '../../api/protocol-v2/DeviceUploadWallpaper';

// ── Shared response shapes (Protocol V2 file system) ────────────────────

export type FileInfo = {
  path: string;
  offset: number;
  total_size: number;
  data?: Uint8Array;
  data_hash?: number;
  processed_byte?: number;
  chunks?: number;
};

// ── Method signatures ─────────────────────────────────────────────────────

export declare function deviceReboot(
  connectId: string,
  params: CommonParams & DeviceRebootParams
): Response<Success>;

export declare function deviceGetOnboardingStatus(
  connectId: string,
  params?: CommonParams
): Response<DevOnboardingStatus>;

export declare function deviceUploadWallpaper(
  connectId: string,
  params: CommonParams & DeviceUploadWallpaperParams
): Response<DeviceUploadWallpaperResponse>;

export declare function uploadPortfolio(
  connectId: string,
  params: {
    packageBytes: ArrayBuffer | Uint8Array | Blob;
    timeoutMs?: number | string;
  }
): Response<FileInfo & { portfolioUpdated: true }>;
