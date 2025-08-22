import { AptosMessageSignature as HardwareAptosMessageSignature } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type AptosSignInMessageSignature = {
  path: string;
} & HardwareAptosMessageSignature;

export type AptosSignInMessageParams = {
  path: string | number[];
  payload: string;
};

export declare function aptosSignInMessage(
  connectId: string,
  deviceId: string,
  params: CommonParams & AptosSignInMessageParams
): Response<AptosSignInMessageSignature>;
