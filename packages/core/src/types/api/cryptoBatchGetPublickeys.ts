import type { EcdsaPublicKeys } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type PatchParams = {
  path: string;
  show_display?: boolean;
};

export type BatchGetPublickeysParams = {
  paths: PatchParams[];
  ecdsa_curve_name: string;
};

export declare function cryptoBatchGetPublickeys(
  connectId: string,
  deviceId: string,
  params: CommonParams & BatchGetPublickeysParams
): Response<EcdsaPublicKeys>;
