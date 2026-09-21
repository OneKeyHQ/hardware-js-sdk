import type { ZcashAddressScope, ZcashAddressType } from '@onekeyfe/hd-transport';

import type { CommonParams, Response } from '../params';

export type ZcashAddress = {
  path: string;
  // ZIP-316 unified address or transparent P2PKH address
  address: string;
  // ZIP-316 unified full viewing key, present when includeUfvk was requested
  ufvk?: string;
  // ZIP-32 seed fingerprint (hex), present when includeSeedFingerprint was requested
  seedFingerprint?: string;
};

export type ZcashGetAddressParams = {
  // ZIP-32 account path, m/32'/133'/account'
  path: string | number[];
  showOnOneKey?: boolean;
  diversifierIndex?: number;
  addressType?: ZcashAddressType;
  scope?: ZcashAddressScope;
  includeUfvk?: boolean;
  includeSeedFingerprint?: boolean;
};

export declare function zcashGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & ZcashGetAddressParams
): Response<ZcashAddress>;

export declare function zcashGetAddress(
  connectId: string,
  deviceId: string,
  params: CommonParams & { bundle?: ZcashGetAddressParams[] }
): Response<Array<ZcashAddress>>;
