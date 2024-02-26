import { Success, WebAuthnAddResidentCredential } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function webAuthnAddResidentCredential(
  connectId: string,
  deviceId: string,
  params: CommonParams & WebAuthnAddResidentCredential
): Response<Success>;
