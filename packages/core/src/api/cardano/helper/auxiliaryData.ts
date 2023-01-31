import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import {
  validateAddressParameters,
  addressParametersToProto,
  modifyAddressParametersForBackwardsCompatibility,
} from './addressParameters';
import { validateParams } from '../../helpers/paramsValidator';
import { validatePath } from '../../helpers/pathUtils';
import type {
  CardanoAuxiliaryData,
  CardanoGovernanceRegistrationDelegation,
  CardanoGovernanceRegistrationParameters,
} from '../../../types/api/cardano';
import { PROTO } from '../../../constants';

const MAX_DELEGATION_COUNT = 32;

const transformDelegation = (
  delegation: CardanoGovernanceRegistrationDelegation
): PROTO.CardanoGovernanceRegistrationDelegation => {
  validateParams(delegation, [
    { name: 'votingPublicKey', type: 'string', required: true },
    { name: 'weight', type: 'uint', required: true },
  ]);

  return {
    voting_public_key: delegation.votingPublicKey,
    weight: delegation.weight,
  };
};

const transformGovernanceRegistrationParameters = (
  governanceRegistrationParameters: CardanoGovernanceRegistrationParameters
): PROTO.CardanoGovernanceRegistrationParametersType => {
  validateParams(governanceRegistrationParameters, [
    { name: 'votingPublicKey', type: 'string' },
    { name: 'stakingPath', required: true },
    { name: 'nonce', type: 'uint', required: true },
    { name: 'format', type: 'number' },
    { name: 'delegations', type: 'array', allowEmpty: true },
    { name: 'votingPurpose', type: 'uint' },
  ]);
  validateAddressParameters(governanceRegistrationParameters.rewardAddressParameters);

  const { delegations } = governanceRegistrationParameters;
  if (delegations && delegations.length > MAX_DELEGATION_COUNT) {
    throw ERRORS.TypedError(
      HardwareErrorCode.CallMethodInvalidParameter,
      `At most ${MAX_DELEGATION_COUNT} delegations are allowed in a governance registration`
    );
  }

  return {
    voting_public_key: governanceRegistrationParameters.votingPublicKey,
    staking_path: validatePath(governanceRegistrationParameters.stakingPath, 3),
    reward_address_parameters: addressParametersToProto(
      governanceRegistrationParameters.rewardAddressParameters
    ),
    nonce: governanceRegistrationParameters.nonce as unknown as number,
    format: governanceRegistrationParameters.format,
    delegations: delegations?.map(transformDelegation) as any,
    voting_purpose: governanceRegistrationParameters.votingPurpose,
  };
};

export const transformAuxiliaryData = (
  auxiliaryData: CardanoAuxiliaryData
): PROTO.CardanoTxAuxiliaryData => {
  validateParams(auxiliaryData, [
    {
      name: 'hash',
      type: 'string',
    },
  ]);

  let governanceRegistrationParameters;
  if (auxiliaryData.governanceRegistrationParameters) {
    governanceRegistrationParameters = transformGovernanceRegistrationParameters(
      auxiliaryData.governanceRegistrationParameters
    );
  }

  return {
    hash: auxiliaryData.hash,
    governance_registration_parameters: governanceRegistrationParameters,
  };
};

export const modifyAuxiliaryDataForBackwardsCompatibility = (
  auxiliary_data: PROTO.CardanoTxAuxiliaryData
): PROTO.CardanoTxAuxiliaryData => {
  const { governance_registration_parameters } = auxiliary_data;
  if (governance_registration_parameters) {
    governance_registration_parameters.reward_address_parameters =
      modifyAddressParametersForBackwardsCompatibility(
        governance_registration_parameters.reward_address_parameters
      );

    return {
      ...auxiliary_data,
      governance_registration_parameters,
    };
  }

  return auxiliary_data;
};
