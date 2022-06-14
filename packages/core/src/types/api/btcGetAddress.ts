import {
  Address,
  InputScriptType,
  MultisigRedeemScriptType,
} from '@onekeyfe/hd-transport/src/types/messages';
import type { CommonParams, Response } from '../params';

export type BTCAddress = {
  path: string;
} & Address;

export type BTCGetAddressParams = {
  path: string | number[];
  coin?: string;
  showOnOneKey?: boolean;
  multisig?: MultisigRedeemScriptType;
  scriptType?: InputScriptType;
};

export declare function btcGetAddress(
  connectId: string,
  params: CommonParams & BTCGetAddressParams
): Response<BTCAddress>;

export declare function btcGetAddress(
  connectId: string,
  params: CommonParams & { bundle?: BTCGetAddressParams[] }
): Response<Array<BTCAddress>>;
