import type { CommonParams, Response } from '../params';
import type {
  DeviceCertificate,
  DeviceCertificateSignature,
  DeviceFactoryInfo,
  OnboardingStatus,
  Success,
} from '@onekeyfe/hd-transport';
import type {
  DeviceFactoryCertificateWriteParams,
  DeviceFactoryChallengeSignParams,
  DeviceFactoryInfoSetParams,
  DeviceRebootParams,
} from '../../api/protocol-v2/helpers';
import type {
  DeviceUploadWallpaperParams,
  DeviceUploadWallpaperResponse,
} from '../../api/protocol-v2/DeviceUploadWallpaper';

// Re-export implementation parameter types as the single source of truth.
export type { DeviceRebootParams, RebootTypeInput } from '../../api/protocol-v2/helpers';
export type {
  DeviceFactoryCertificateWriteParams,
  DeviceFactoryChallengeSignParams,
  DeviceFactoryInfoSetParams,
} from '../../api/protocol-v2/helpers';
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

export declare function deviceProvisionFactoryInfo(
  connectId: string,
  params: CommonParams & DeviceFactoryInfoSetParams
): Response<Success>;

export declare function deviceReadFactoryInfo(
  connectId: string,
  params?: CommonParams
): Response<DeviceFactoryInfo>;

export declare function deviceWriteFactoryCertificate(
  connectId: string,
  params: CommonParams & DeviceFactoryCertificateWriteParams
): Response<Success>;

export declare function deviceReadFactoryCertificate(
  connectId: string,
  params?: CommonParams
): Response<DeviceCertificate>;

export declare function deviceSignFactoryChallenge(
  connectId: string,
  params: CommonParams & DeviceFactoryChallengeSignParams
): Response<DeviceCertificateSignature>;

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
