import { InputScriptType, PublicKey } from '@onekeyfe/hd-transport/src/types/messages';
import type { CommonParams, Response } from '../params';

export type BTCGetPublicKeyParams = {
  path: string | number[];
  coin?: string;
  showOnOneKey?: boolean;
  scriptType?: InputScriptType;
};

export declare function btcGetPublicKey(
  connectId: string,
  params: CommonParams & BTCGetPublicKeyParams
): Response<PublicKey>;

export declare function btcGetPublicKey(
  connectId: string,
  params: CommonParams & { bundle?: BTCGetPublicKeyParams[] }
): Response<Array<PublicKey>>;
