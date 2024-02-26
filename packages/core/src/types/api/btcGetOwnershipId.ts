import { InputScriptType, MultisigRedeemScriptType, OwnershipId } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

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
