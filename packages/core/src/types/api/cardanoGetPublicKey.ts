import type { CommonParams, Response } from '../params';
import { PROTO } from '../../constants';

export type CardanoPublicKey = {
  path: number[];
  serializedPath: string;
  xpub: string;
  node: PROTO.HDNodeType;
};

export type CardanoPublicKeyParams = {
  address_n: number[];
  derivation_type: number;
  show_display: boolean;
};

export type CardanoPublicKeyMethodParams = {
  path: string | number[];
  derivationType?: number;
  showOnOneKey?: boolean;
};

export declare function cardanoGetPublicKey(
  connectId: string,
  deviceId: string,
  params: CommonParams & CardanoPublicKeyMethodParams
): Response<CardanoPublicKey>;

export declare function cardanoGetPublicKey(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: CardanoPublicKeyMethodParams[] }
): Response<CardanoPublicKey[]>;
