import type { CommonParams, Response } from '../params';
import type { OnboardingStatus, Success } from '@onekeyfe/hd-transport';
import type { DeviceRebootParams } from '../../api/protocol-v2/helpers';
import type { UploadPortfolioParams } from '../../api/UploadPortfolio';
import type {
  DeviceUploadWallpaperParams,
  DeviceUploadWallpaperResponse,
} from '../../api/protocol-v2/DeviceUploadWallpaper';
import type {
  DeviceUploadNftParams,
  DeviceUploadNftResponse,
} from '../../api/protocol-v2/DeviceUploadNft';

// Re-export implementation parameter types as the single source of truth.
export type { DeviceRebootParams, RebootTypeInput } from '../../api/protocol-v2/helpers';
export type { UploadPortfolioParams } from '../../api/UploadPortfolio';
export type {
  DeviceUploadWallpaperParams,
  DeviceUploadWallpaperResponse,
} from '../../api/protocol-v2/DeviceUploadWallpaper';
export type {
  DeviceUploadNftParams,
  DeviceUploadNftResponse,
} from '../../api/protocol-v2/DeviceUploadNft';

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

export type TestProtocolV2PingParams = CommonParams & {
  /** Firmware diagnostic echo payload, limited to 63 UTF-8 bytes. */
  message?: string;
};

export declare function testProtocolV2Ping(
  connectId: string,
  params?: TestProtocolV2PingParams
): Response<Success>;

export declare function deviceReboot(
  connectId: string,
  params: CommonParams & DeviceRebootParams
): Response<Success>;

export declare function deviceGetOnboardingStatus(
  connectId: string,
  params?: CommonParams
): Response<OnboardingStatus>;

export declare function deviceUploadWallpaper(
  connectId: string,
  params: CommonParams & DeviceUploadWallpaperParams
): Response<DeviceUploadWallpaperResponse>;

export declare function deviceUploadNft(
  connectId: string,
  params: CommonParams & DeviceUploadNftParams
): Response<DeviceUploadNftResponse>;

export declare function uploadPortfolio(
  connectId: string,
  params: UploadPortfolioParams
): Response<FileInfo & { portfolioUpdated: true }>;
