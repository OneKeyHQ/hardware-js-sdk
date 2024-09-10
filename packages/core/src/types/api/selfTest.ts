import { SelfTest, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function selfTest(
  connectId: string,
  params: CommonParams & SelfTest
): Response<Success>;
