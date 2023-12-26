import { InputScriptType, OwnershipProof } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type BTCAuthorizeCoinJoin = {
  path: string | number[];
  coin?: string;
  scriptType?: InputScriptType;
  coordinator: string;
  max_total_fee: number;
  fee_per_anonymity?: number;
  amount_unit?: number;
};

export declare function btcAuthorizeCoinJoin(
  connectId: string,
  deviceId: string,
  params: CommonParams & BTCAuthorizeCoinJoin
): Response<OwnershipProof>;
