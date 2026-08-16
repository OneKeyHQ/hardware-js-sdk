import type {
  InputScriptType,
  MultisigRedeemScriptType,
  OwnershipId,
} from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '@onekeyfe/hd-core';

export type BTCGetOwnershipId = {
  path: string | number[];
  coin?: string;
  multisig?: MultisigRedeemScriptType;
  scriptType?: InputScriptType;
};

export declare function btcGetOwnershipId(
  connectId: string,
  deviceId: string,
  params: CommonParams & BTCGetOwnershipId
): Response<OwnershipId>;
