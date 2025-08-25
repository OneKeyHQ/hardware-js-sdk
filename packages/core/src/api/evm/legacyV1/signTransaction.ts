import { TypedCall } from '@onekeyfe/hd-transport';
import { EVMTransaction, EVMTransactionEIP1559, EVMTransactionEIP7702 } from '../../../types';
import { evmSignTx, evmSignTxEip1559, evmSignTxEip7702 } from '../latest/signTransaction';

export const signTransaction = async ({
  typedCall,
  isEIP1559,
  isEIP7702,
  addressN,
  tx,
}: {
  addressN: number[];
  tx: EVMTransaction | EVMTransactionEIP1559 | EVMTransactionEIP7702;
  isEIP1559: boolean;
  isEIP7702: boolean;
  typedCall: TypedCall;
}) => {
  if (isEIP7702) {
    return evmSignTxEip7702({
      typedCall,
      addressN,
      tx: tx as EVMTransactionEIP7702,
      supportTrezor: true,
    });
  }
  if (isEIP1559) {
    return evmSignTxEip1559({
      typedCall,
      addressN,
      tx: tx as EVMTransactionEIP1559,
      supportTrezor: true,
    });
  }

  return evmSignTx({ typedCall, addressN, tx: tx as EVMTransaction, supportTrezor: true });
};
