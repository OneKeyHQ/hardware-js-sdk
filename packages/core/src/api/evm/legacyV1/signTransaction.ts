import { EthereumSignTx, EthereumSignTxEIP1559, TypedCall } from '@onekeyfe/hd-transport';
import { EVMTransaction, EVMTransactionEIP1559 } from '../../../types';
import { cutString } from '../../helpers/stringUtils';
import { stripHexStartZeroes } from '../../helpers/hexUtils';
import { processTxRequest } from '../latest/signTransaction';

const evmSignTx = async (typedCall: TypedCall, addressN: number[], tx: EVMTransaction) => {
  const { to, value, gasPrice, gasLimit, nonce, data, chainId, txType } = tx;

  const length = data == null ? 0 : data.length / 2;

  const [first, rest] = cutString(data, 1024 * 2);

  let message: EthereumSignTx = {
    address_n: addressN,
    nonce: stripHexStartZeroes(nonce),
    gas_price: stripHexStartZeroes(gasPrice),
    gas_limit: stripHexStartZeroes(gasLimit),
    to,
    value: stripHexStartZeroes(value),
    chain_id: chainId,
  };

  if (length !== 0) {
    message = {
      ...message,
      data_length: length,
      data_initial_chunk: first,
    };
  }

  if (txType !== null) {
    message = {
      ...message,
      tx_type: txType,
    };
  }

  const response = await typedCall('EthereumSignTx', 'EthereumTxRequest', message);

  return processTxRequest({ typedCall, request: response.message, data: rest, chainId });
};

const evmSignTxEip1559 = async (
  typedCall: TypedCall,
  addressN: number[],
  tx: EVMTransactionEIP1559
) => {
  const {
    to,
    value,
    gasLimit,
    nonce,
    data,
    chainId,
    maxFeePerGas,
    maxPriorityFeePerGas,
    accessList,
  } = tx;

  const length = data == null ? 0 : data.length / 2;

  const [first, rest] = cutString(data, 1024 * 2);

  const message: EthereumSignTxEIP1559 = {
    address_n: addressN,
    nonce: stripHexStartZeroes(nonce),
    max_gas_fee: stripHexStartZeroes(maxFeePerGas),
    max_priority_fee: stripHexStartZeroes(maxPriorityFeePerGas),
    gas_limit: stripHexStartZeroes(gasLimit),
    to,
    value: stripHexStartZeroes(value),
    data_length: length,
    data_initial_chunk: first,
    chain_id: chainId,
    access_list: (accessList || []).map(a => ({
      address: a.address,
      storage_keys: a.storageKeys,
    })),
  };

  const response = await typedCall('EthereumSignTxEIP1559', 'EthereumTxRequest', message);

  return processTxRequest({ typedCall, request: response.message, data: rest });
};
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
    ? evmSignTxEip1559(typedCall, addressN, tx as EVMTransactionEIP1559)
    : evmSignTx(typedCall, addressN, tx as EVMTransaction);
