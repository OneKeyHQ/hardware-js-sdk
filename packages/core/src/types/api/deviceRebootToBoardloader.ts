import { Success, RebootToBoardloader } from '@onekeyfe/hd-transport';
import type { Response } from '../params';

export type RebootToBoardloaderParams = RebootToBoardloader;

export declare function deviceRebootToBoardloader(connectId: string): Response<Success>;
