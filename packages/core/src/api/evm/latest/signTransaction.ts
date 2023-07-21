import {
  EthereumDefinitions,
  EthereumSignTx,
  EthereumSignTxEIP1559,
  EthereumTxRequest,
  EthereumTxRequestOneKey,
  MessageResponse,
  TypedCall,
} from '@onekeyfe/hd-transport';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { EVMSignedTx, EVMTransaction, EVMTransactionEIP1559 } from '../../../types';
import { cutString } from '../../helpers/stringUtils';
import { stripHexStartZeroes } from '../../helpers/hexUtils';
import { Device } from '../../../device/Device';
import { getEvmDefinitionParams } from './getEthereumDefinitions';

export const processTxRequest = async (
  typedCall: TypedCall,
  request: EthereumTxRequest | EthereumTxRequestOneKey,
  supportTrezor: boolean,
  data: string,
  chain_id?: number | undefined
): Promise<EVMSignedTx> => {
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
    if (chain_id && v <= 1) {
      v += 2 * chain_id + 35;
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

  return processTxRequest(typedCall, response.message, supportTrezor, rest, chain_id);
};

const evmSignTx = async (
  typedCall: TypedCall,
  addressN: number[],
  tx: EVMTransaction,
  definitions: EthereumDefinitions | undefined,
  supportTrezor: boolean
) => {
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
    definitions,
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
    message = {
      ...message,
      definitions,
    };
    response = await typedCall('EthereumSignTx', 'EthereumTxRequest', message);
  } else {
    response = await typedCall('EthereumSignTxOneKey', 'EthereumTxRequestOneKey', message);
  }

  return processTxRequest(typedCall, response.message, supportTrezor, rest, chainId);
};

const evmSignTxEip1559 = async (
  typedCall: TypedCall,
  addressN: number[],
  tx: EVMTransactionEIP1559,
  definitions: EthereumDefinitions | undefined,
  supportTrezor: boolean
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

  let message: EthereumSignTxEIP1559 = {
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
    definitions,
  };

  let response;
  if (supportTrezor) {
    message = {
      ...message,
      definitions,
    };
    response = await typedCall('EthereumSignTxEIP1559', 'EthereumTxRequest', message);
  } else {
    response = await typedCall('EthereumSignTxEIP1559OneKey', 'EthereumTxRequestOneKey', message);
  }

  return processTxRequest(typedCall, response.message, supportTrezor, rest);
};
export const signTransaction = async ({
  typedCall,
  isEIP1559,
  device,
  addressN,
  tx,
  supportTrezor,
}: {
  addressN: number[];
  tx: EVMTransaction | EVMTransactionEIP1559;
  isEIP1559: boolean;
  supportTrezor: boolean;
  typedCall: TypedCall;
  device: Device;
}) => {
  const definitionParams = await getEvmDefinitionParams({
    addressN,
    chainId: tx.chainId,
    contractAddress: tx.data ? tx.to : undefined,
    device,
  });

  return isEIP1559
    ? evmSignTxEip1559(
        typedCall,
        addressN,
        tx as EVMTransactionEIP1559,
        definitionParams,
        supportTrezor
      )
    : evmSignTx(typedCall, addressN, tx as EVMTransaction, definitionParams, supportTrezor);
};
