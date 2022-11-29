import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { validatePath } from '../../helpers/pathUtils';
import { validateParams } from '../../helpers/paramsValidator';
import { PROTO } from '../../../constants';
import type { CardanoAddressParameters } from '../../../types/api/cardano';
import type { Device } from '../../../device/Device';

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

export const modifyAddressParametersForBackwardsCompatibility = (
  address_parameters: PROTO.CardanoAddressParametersType
): PROTO.CardanoAddressParametersType => {
  if (address_parameters.address_type === PROTO.CardanoAddressType.REWARD) {
    // older firmware expects reward address path in path field instead of staking path
    let { address_n, address_n_staking } = address_parameters;

    if (address_n.length > 0 && address_n_staking.length > 0) {
      throw ERRORS.TypedError(
        HardwareErrorCode.CallMethodInvalidParameter,
        `Only stakingPath is allowed for CardanoAddressType.REWARD`
      );
    }

    if (address_n.length > 0) {
      address_n_staking = address_n;
      address_n = [];
    }
    // TODO: version check
    // if (device.atLeast(['0', '2.4.3'])) {
    // } else if (address_n_staking.length > 0) {
    //   address_n = address_n_staking;
    //   address_n_staking = [];
    // }

    return {
      ...address_parameters,
      address_n,
      address_n_staking,
    };
  }

  return address_parameters;
};
