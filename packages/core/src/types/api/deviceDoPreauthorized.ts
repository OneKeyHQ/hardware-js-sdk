import { Success, DoPreauthorized } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function deviceDoPreauthorized(
  connectId: string,
  params: CommonParams & DoPreauthorized
): Response<Success>;
