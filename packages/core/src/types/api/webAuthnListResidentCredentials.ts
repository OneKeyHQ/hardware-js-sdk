import { WebAuthnCredentials } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export declare function webAuthnListResidentCredentials(
  connectId: string,
  deviceId: string,
  params: CommonParams
): Response<WebAuthnCredentials>;
