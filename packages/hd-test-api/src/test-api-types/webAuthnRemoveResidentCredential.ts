import type { Success, WebAuthnRemoveResidentCredential } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export declare function webAuthnRemoveResidentCredential(
  connectId: string,
  deviceId: string,
  params: CommonParams & WebAuthnRemoveResidentCredential
): Response<Success>;
