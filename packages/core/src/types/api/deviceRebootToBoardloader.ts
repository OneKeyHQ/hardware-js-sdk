import { Success } from '@onekeyfe/hd-transport';
import type { Response } from '../params';

export type RebootToBoardloaderParams = object;

export declare function deviceRebootToBoardloader(connectId: string): Response<Success>;
