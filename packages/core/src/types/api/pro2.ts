import type { Response } from '../params';

// ── Shared response shapes (Pro2 file system, Proto V0) ─────────────────

export type FileOpSuccess = { message?: string };

export type FileInfo = {
  path: string;
  offset: number;
  total_size: number;
  data?: Uint8Array;
  data_hash?: number;
  processed_byte?: number;
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

// ── Method signatures ─────────────────────────────────────────────────────

export declare function fileRead(
  connectId: string,
  params: { path: string; offset: number; totalSize: number }
): Response<FileInfo>;

export declare function fileWrite(
  connectId: string,
  params: {
    path: string;
    offset: number;
    totalSize: number;
    data: Uint8Array | string;
    overwrite?: boolean;
    append?: boolean;
  }
): Response<FileInfo>;

export declare function fileDelete(
  connectId: string,
  params: { path: string }
): Response<FileOpSuccess>;

export declare function dirList(connectId: string, params: { path: string }): Response<DirInfo>;

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
