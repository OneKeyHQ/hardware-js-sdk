import { InputScriptType, MultisigRedeemScriptType, OwnershipProof } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type BTCGetOwnershipProof = {
  path: string | number[];
  coin?: string;
  multisig?: MultisigRedeemScriptType;
  scriptType?: InputScriptType;
  user_confirmation?: boolean;
  ownership_ids?: string[];
  commitment_data?: string;
};

export declare function btcGetOwnershipProof(
  connectId: string,
  deviceId: string,
  params: CommonParams & BTCGetOwnershipProof
): Response<OwnershipProof>;
