import type { Reboot, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function reboot(connectId: string, params: CommonParams & Reboot): Response<Success>;
