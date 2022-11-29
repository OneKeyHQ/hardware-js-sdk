import { validatePath } from '../../helpers/pathUtils';
import { validateParams } from '../../helpers/paramsValidator';
import type { PROTO } from '../../../constants';
import type { CardanoAddressParameters } from '../../../types/api/cardano';

export const validateAddressParameters = (addressParameters: CardanoAddressParameters) => {
  validateParams(addressParameters, [
    { name: 'addressType', type: 'number', required: true },
    { name: 'stakingKeyHash', type: 'string' },
    { name: 'paymentScriptHash', type: 'string' },
    { name: 'stakingScriptHash', type: 'string' },
  ]);

  if (addressParameters.path) {
    validatePath(addressParameters.path);
  }
  if (addressParameters.stakingPath) {
    validatePath(addressParameters.stakingPath);
  }

  if (addressParameters.certificatePointer) {
    validateParams(addressParameters.certificatePointer, [
      { name: 'blockIndex', type: 'number', required: true },
      { name: 'txIndex', type: 'number', required: true },
      { name: 'certificateIndex', type: 'number', required: true },
    ]);
  }
};

export const addressParametersToProto = (
  addressParameters: CardanoAddressParameters
): PROTO.CardanoAddressParametersType => {
  let path: number[] = [];
  if (addressParameters.path) {
    path = validatePath(addressParameters.path, 3);
  }

  let stakingPath: number[] = [];
  if (addressParameters.stakingPath) {
    stakingPath = validatePath(addressParameters.stakingPath, 3);
  }

  let certificatePointer;
  if (addressParameters.certificatePointer) {
    certificatePointer = {
      block_index: addressParameters.certificatePointer.blockIndex,
      tx_index: addressParameters.certificatePointer.txIndex,
      certificate_index: addressParameters.certificatePointer.certificateIndex,
    };
  }

  return {
    address_type: addressParameters.addressType,
    address_n: path,
    address_n_staking: stakingPath,
    staking_key_hash: addressParameters.stakingKeyHash,
    certificate_pointer: certificatePointer,
    script_payment_hash: addressParameters.paymentScriptHash,
    script_staking_hash: addressParameters.stakingScriptHash,
  };
};

export const addressParametersFromProto = (
  addressParameters: PROTO.CardanoAddressParametersType
): CardanoAddressParameters => {
  let certificatePointer;
  if (addressParameters.certificate_pointer) {
    certificatePointer = {
      blockIndex: addressParameters.certificate_pointer.block_index,
      txIndex: addressParameters.certificate_pointer.tx_index,
      certificateIndex: addressParameters.certificate_pointer.certificate_index,
    };
  }

  return {
    addressType: addressParameters.address_type,
    path: addressParameters.address_n,
    stakingPath: addressParameters.address_n_staking,
    stakingKeyHash: addressParameters.staking_key_hash,
    certificatePointer,
  };
};
