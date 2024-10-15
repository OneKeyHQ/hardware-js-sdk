import { SuiAddress as HardwareSuiAddress } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type SuiAddress = {
  path: string;
  pub?: string;
  /**
   * @deprecated Use `pub` instead.
   */
  publicKey?: string;
} & HardwareSuiAddress;

export type SuiGetAddressParams = {
  path: string | number[];
  showOnOneKey?: boolean;
};

export declare function suiGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & SuiGetAddressParams
): Response<SuiAddress>;

export declare function suiGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: SuiGetAddressParams[] }
): Response<Array<SuiAddress>>;
