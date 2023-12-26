import { SetU2FCounter, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function setU2FCounter(
  connectId?: string,
  params?: CommonParams & SetU2FCounter
): Response<Success>;
