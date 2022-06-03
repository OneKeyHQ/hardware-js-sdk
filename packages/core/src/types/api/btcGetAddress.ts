import {
  Address,
  InputScriptType,
  MultisigRedeemScriptType,
} from '@onekeyfe/hd-transport/src/types/messages';
import type { CommonParams, Response } from '../params';

export type BTCGetAddressParams = {
  path: string | number[];
  coin?: string;
  showOnOneKey?: boolean;
  multisig?: MultisigRedeemScriptType;
  scriptType?: InputScriptType;
};

export declare function btcGetAddress(
  params: CommonParams & BTCGetAddressParams
): Response<Address>;

export declare function btcGetAddress(
  params: CommonParams & { bundle?: BTCGetAddressParams[] }
): Response<Array<Address>>;
