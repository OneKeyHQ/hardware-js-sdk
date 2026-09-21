import type { CommonParams, Response } from '../params';

export type ZcashSignPcztParams = {
  // Unproved PCZT (v2, tx v6) as hex; the device signs it and returns a
  // redacted copy with signatures filled in.
  pczt: string;
};

export type ZcashSignedPczt = {
  // Signed, redacted PCZT as hex
  pczt: string;
};

export declare function zcashSignPczt(
  connectId: string,
  deviceId: string,
  params: CommonParams & ZcashSignPcztParams
): Response<ZcashSignedPczt>;
