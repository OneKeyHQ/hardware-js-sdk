import { Reboot, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function reboot(connectId: string, params: CommonParams & Reboot): Response<Success>;
