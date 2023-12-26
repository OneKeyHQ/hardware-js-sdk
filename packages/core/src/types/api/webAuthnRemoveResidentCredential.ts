import { Success, WebAuthnRemoveResidentCredential } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function webAuthnRemoveResidentCredential(
  connectId: string,
  deviceId: string,
  params: CommonParams & WebAuthnRemoveResidentCredential
): Response<Success>;
