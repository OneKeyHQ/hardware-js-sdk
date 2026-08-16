import type { WebAuthnCredentials } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function webAuthnListResidentCredentials(
  connectId: string,
  deviceId: string,
  params: CommonParams
): Response<WebAuthnCredentials>;
