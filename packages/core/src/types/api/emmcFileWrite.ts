import type { Params, Response } from '../params';

export interface EmmcFileWriteParams {
  payload: ArrayBuffer;
  filePath: string; // e.g. '0:boot/bootloader.bin'
  hash?: string;
}

export declare function emmcFileWrite(
  connectId: string | undefined,
  params: Params<EmmcFileWriteParams>
): Response<number>;
