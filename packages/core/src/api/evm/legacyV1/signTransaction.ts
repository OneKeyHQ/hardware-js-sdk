import { TypedCall } from '@onekeyfe/hd-transport';
import { EVMTransaction, EVMTransactionEIP1559 } from '../../../types';
import { evmSignTx, evmSignTxEip1559 } from '../latest/signTransaction';

export const signTransaction = async ({
  typedCall,
  isEIP1559,
  addressN,
  tx,
}: {
  addressN: number[];
  tx: EVMTransaction | EVMTransactionEIP1559;
  isEIP1559: boolean;
  typedCall: TypedCall;
}) =>
  isEIP1559
    ? evmSignTxEip1559({
        typedCall,
        addressN,
        tx: tx as EVMTransactionEIP1559,
        supportTrezor: true,
      })
    : evmSignTx({ typedCall, addressN, tx: tx as EVMTransaction, supportTrezor: true });
