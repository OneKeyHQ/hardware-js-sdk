import type { SelfTest, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function selfTest(
  connectId: string,
  params: CommonParams & SelfTest
): Response<Success>;
