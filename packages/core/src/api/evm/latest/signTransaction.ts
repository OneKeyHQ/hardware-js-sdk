import {
  EthereumSignTx,
  EthereumSignTxEIP1559,
  EthereumTxRequestOneKey,
  MessageResponse,
  TypedCall,
} from '@onekeyfe/hd-transport';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { EVMSignedTx, EVMTransaction, EVMTransactionEIP1559 } from '../../../types';
import { cutString } from '../../helpers/stringUtils';
import { stripHexStartZeroes } from '../../helpers/hexUtils';

export const processTxRequest = async ({
  typedCall,
  request,
  data,
  chainId,
  supportTrezor,
}: {
  typedCall: TypedCall;
  request: EthereumTxRequestOneKey;
  data: string;
  chainId?: number | undefined;
  supportTrezor?: boolean;
}): Promise<EVMSignedTx> => {
  if (!request.data_length) {
    let v = request.signature_v;
    const r = request.signature_r;
    const s = request.signature_s;

    if (v == null || r == null || s == null) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'processTxRequest: Unexpected request'
      );
    }

    // if v is not 27 or 28, it is a legacy transaction
    if (chainId && v <= 1) {
      v += 2 * chainId + 35;
    }

    return Promise.resolve({
      v: `0x${v.toString(16)}`,
      r: `0x${r}`,
      s: `0x${s}`,
    });
  }

  const [first, rest] = cutString(data, request.data_length * 2);

  let response: MessageResponse<'EthereumTxRequestOneKey'> | MessageResponse<'EthereumTxRequest'>;
  if (supportTrezor) {
    response = await typedCall('EthereumTxAck', 'EthereumTxRequest', {
      data_chunk: first,
    });
  } else {
    response = await typedCall('EthereumTxAckOneKey', 'EthereumTxRequestOneKey', {
      data_chunk: first,
    });
  }

  return processTxRequest({
    typedCall,
    request: response.message,
    data: rest,
    chainId,
    supportTrezor,
  });
};

const evmSignTx = async ({
  typedCall,
  addressN,
  tx,
  supportTrezor,
}: {
  typedCall: TypedCall;
  addressN: number[];
  tx: EVMTransaction;
  supportTrezor?: boolean;
}) => {
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

  let response;
  if (supportTrezor) {
    response = await typedCall('EthereumSignTx', 'EthereumTxRequest', message);
  } else {
    response = await typedCall('EthereumSignTxOneKey', 'EthereumTxRequestOneKey', message);
  }

  return processTxRequest({
    typedCall,
    request: response.message,
    data: rest,
    chainId,
    supportTrezor,
  });
};

const evmSignTxEip1559 = async ({
  typedCall,
  addressN,
  tx,
  supportTrezor,
}: {
  typedCall: TypedCall;
  addressN: number[];
  tx: EVMTransactionEIP1559;
  supportTrezor?: boolean;
}) => {
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

  let response;
  if (supportTrezor) {
    response = await typedCall('EthereumSignTxEIP1559', 'EthereumTxRequest', message);
  } else {
    response = await typedCall('EthereumSignTxEIP1559OneKey', 'EthereumTxRequestOneKey', message);
  }

  return processTxRequest({ typedCall, request: response.message, data: rest, supportTrezor });
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
    ? evmSignTxEip1559({ typedCall, addressN, tx: tx as EVMTransactionEIP1559 })
    : evmSignTx({ typedCall, addressN, tx: tx as EVMTransaction });
