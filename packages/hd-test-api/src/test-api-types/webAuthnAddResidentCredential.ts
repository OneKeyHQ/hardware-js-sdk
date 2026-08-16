import type { Success, WebAuthnAddResidentCredential } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function webAuthnAddResidentCredential(
  connectId: string,
  deviceId: string,
  params: CommonParams & WebAuthnAddResidentCredential
): Response<Success>;
