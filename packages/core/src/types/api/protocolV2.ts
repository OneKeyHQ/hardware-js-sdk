import type { CommonParams, Response } from '../params';
import type {
  DevFirmwareUpdateStatus,
  FactoryDeviceInfo,
  OnboardingStatus,
  ProtoVersion,
  ProtocolV2DeviceInfo,
  Success,
} from '@onekeyfe/hd-transport';
import type {
  DeviceFirmwareUpdateParams,
  DeviceRebootParams,
  FactoryDeviceInfoSettingsParams,
} from '../../api/protocol-v2/helpers';
import type { DeviceGetDeviceInfoParams } from '../../api/protocol-v2/DeviceGetDeviceInfo';

// 参数类型单源：以 api/protocol-v2 的实现为准（type-only re-export，无运行时依赖）
export type {
  DeviceFirmwareTargetInput,
  DeviceFirmwareUpdateParams,
  DeviceRebootParams,
  FactoryDeviceInfoSettingsParams,
  RebootTypeInput,
} from '../../api/protocol-v2/helpers';
export type {
  DeviceGetDeviceInfoParams,
  DeviceGetDeviceInfoTargets,
  DeviceGetDeviceInfoTypes,
} from '../../api/protocol-v2/DeviceGetDeviceInfo';

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

// proto 中 FilesystemPathInfo 的全部字段均为 required，类型与之保持一致
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

export declare function getProtoVersion(
  connectId: string,
  params?: CommonParams
): Response<ProtoVersion>;

export declare function ping(
  connectId: string,
  params?: CommonParams & { message?: string }
): Response<Success>;

export declare function deviceReboot(
  connectId: string,
  params: CommonParams & DeviceRebootParams
): Response<Success>;

export declare function deviceGetDeviceInfo(
  connectId: string,
  params?: CommonParams & DeviceGetDeviceInfoParams
): Response<ProtocolV2DeviceInfo>;

export declare function deviceGetOnboardingStatus(
  connectId: string,
  params?: CommonParams
): Response<OnboardingStatus>;

export declare function deviceFirmwareUpdate(
  connectId: string,
  params: CommonParams & DeviceFirmwareUpdateParams
): Response<Success | DevFirmwareUpdateStatus>;

export declare function deviceGetFirmwareUpdateStatus(
  connectId: string,
  params?: CommonParams
): Response<DevFirmwareUpdateStatus>;

export declare function factoryDeviceInfoSettings(
  connectId: string,
  params: FactoryDeviceInfoSettingsParams
): Response<Success>;

export declare function factoryGetDeviceInfo(connectId: string): Response<FactoryDeviceInfo>;

export declare function filesystemFixPermission(connectId: string): Response<Success>;

export declare function filesystemFileRead(
  connectId: string,
  params: {
    path: string;
    offset?: number;
    totalSize?: number;
    chunkLen?: number;
    uiPercentage?: number;
  }
): Response<FileInfo>;

export declare function filesystemFileWrite(
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
  }
): Response<FileInfo>;

export declare function filesystemFileDelete(
  connectId: string,
  params: { path: string }
): Response<FileOpSuccess>;

export declare function filesystemDirList(
  connectId: string,
  params: { path: string; depth?: number }
): Response<DirInfo>;

export declare function filesystemDirMake(
  connectId: string,
  params: { path: string }
): Response<FileOpSuccess>;

export declare function filesystemDirRemove(
  connectId: string,
  params: { path: string }
): Response<FileOpSuccess>;

export declare function filesystemPathInfoQuery(
  connectId: string,
  params: { path: string }
): Response<PathInfoResult>;

export declare function filesystemFormat(connectId: string): Response<Success>;

export declare function filesystemDiskControl(
  connectId: string,
  // enable 收紧为 boolean | 0 | 1（兼容历史的 '0' / '1' 字符串输入，内部归一化为 0/1）
  params: CommonParams & { enable: boolean | 0 | 1; timeoutMs?: number | string }
): Response<Success>;
