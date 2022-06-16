import { SolanaAddress as HardwareSolanaAddress } from '@onekeyfe/hd-transport/src/types/messages';
import type { CommonParams, Response } from '../params';

export type SolanaAddress = {
  path: string;
} & HardwareSolanaAddress;

export type SolanaGetAddressParams = {
  path: string | number[];
  showOnOneKey?: boolean;
};

export declare function solGetAddress(
  connectId: string,
  params: CommonParams & SolanaGetAddressParams
): Response<SolanaAddress>;

export declare function solGetAddress(
  connectId: string,
  params: CommonParams & { bundle?: SolanaGetAddressParams[] }
): Response<Array<SolanaAddress>>;
