import type { Response } from '../params';
import type {
  DevFirmwareTarget,
  DevFirmwareUpdateStatus,
  DevInfoTargets,
  DevInfoTypes,
  DevRebootType,
  FactoryDeviceInfo,
  ProtoVersion,
  ProtocolV2DeviceInfo,
  Success,
} from '@onekeyfe/hd-transport';

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

export type PathInfoResult = {
  exist: boolean;
  size: number;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  readonly?: boolean;
  hidden?: boolean;
  system?: boolean;
  archive?: boolean;
  directory?: boolean;
};

export type DevRebootParams = {
  rebootType?: DevRebootType | string | number;
  reboot_type?: DevRebootType | string | number;
};

export type DevGetDeviceInfoParams = {
  targets?: DevInfoTargets;
  types?: DevInfoTypes;
  targetHw?: boolean;
  targetFw?: boolean;
  targetBt?: boolean;
  targetSe1?: boolean;
  targetSe2?: boolean;
  targetSe3?: boolean;
  targetSe4?: boolean;
  targetStatus?: boolean;
  includeVersion?: boolean;
  includeBuildId?: boolean;
  includeHash?: boolean;
  includeSpecific?: boolean;
};

export type DevFirmwareUpdateParams = {
  targets?: DevFirmwareTarget[];
  targetId?: DevFirmwareTarget['target_id'] | string | number;
  target_id?: DevFirmwareTarget['target_id'] | string | number;
  path?: string;
};

export type FactoryDeviceInfoSettingsParams = {
  serial_no?: string;
  serialNo?: string;
  cpu_info?: string;
  cpuInfo?: string;
  pre_firmware?: string;
  preFirmware?: string;
};

// ── Method signatures ─────────────────────────────────────────────────────

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
  params: { path: string }
): Response<PathInfoResult>;

export declare function getProtoVersion(connectId: string): Response<ProtoVersion>;

export declare function ping(connectId: string, params?: { message?: string }): Response<Success>;

export declare function devReboot(connectId: string, params: DevRebootParams): Response<Success>;

export declare function devGetDeviceInfo(
  connectId: string,
  params?: DevGetDeviceInfoParams
): Response<ProtocolV2DeviceInfo>;

export declare function devFirmwareUpdate(
  connectId: string,
  params: DevFirmwareUpdateParams
): Response<Success>;

export declare function devGetFirmwareUpdateStatus(
  connectId: string
): Response<DevFirmwareUpdateStatus>;

export declare function factoryDeviceInfoSettings(
  connectId: string,
  params: FactoryDeviceInfoSettingsParams
): Response<Success>;

export declare function factoryGetDeviceInfo(connectId: string): Response<FactoryDeviceInfo>;

export declare function filesystemFixPermission(connectId: string): Response<Success>;

export declare function filesystemFileRead(
  connectId: string,
  params: Parameters<typeof fileRead>[1]
): ReturnType<typeof fileRead>;

export declare function filesystemFileWrite(
  connectId: string,
  params: Parameters<typeof fileWrite>[1]
): ReturnType<typeof fileWrite>;

export declare function filesystemFileDelete(
  connectId: string,
  params: Parameters<typeof fileDelete>[1]
): ReturnType<typeof fileDelete>;

export declare function filesystemDirList(
  connectId: string,
  params: Parameters<typeof dirList>[1]
): ReturnType<typeof dirList>;

export declare function filesystemDirMake(
  connectId: string,
  params: Parameters<typeof dirMake>[1]
): ReturnType<typeof dirMake>;

export declare function filesystemDirRemove(
  connectId: string,
  params: Parameters<typeof dirRemove>[1]
): ReturnType<typeof dirRemove>;

export declare function filesystemPathInfoQuery(
  connectId: string,
  params: Parameters<typeof pathInfo>[1]
): ReturnType<typeof pathInfo>;

export declare function filesystemFormat(connectId: string): Response<Success>;
