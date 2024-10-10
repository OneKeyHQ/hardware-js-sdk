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
  CardanoCVoteRegistrationParameters,
  CardanoCVoteRegistrationDelegation,
} from '../../../types/api/cardano';
import { PROTO } from '../../../constants';

const MAX_DELEGATION_COUNT = 32;

const transformDelegation = (
  delegation: CardanoCVoteRegistrationDelegation
): PROTO.CardanoCVoteRegistrationDelegation => {
  // @ts-expect-error votingPublicKey is a legacy param kept for backward compatibility (for now)
  if (delegation.votingPublicKey) {
    console.warn('Please use votePublicKey instead of votingPublicKey.');
    // @ts-expect-error
    delegation.votePublicKey = delegation.votingPublicKey;
  }

  validateParams(delegation, [
    { name: 'votingPublicKey', type: 'string', required: true },
    { name: 'weight', type: 'uint', required: true },
  ]);

  return {
    vote_public_key: delegation.votePublicKey,
    weight: delegation.weight,
  };
};

const transformCvoteRegistrationParameters = (
  cVoteRegistrationParameters: CardanoCVoteRegistrationParameters
): PROTO.CardanoCVoteRegistrationParametersType => {
  // votingPublicKey and rewardAddressParameters are legacy params kept for backward compatibility (for now)
  // @ts-expect-error
  if (cVoteRegistrationParameters.votingPublicKey) {
    console.warn('Please use votePublicKey instead of votingPublicKey.');
    // @ts-expect-error
    cVoteRegistrationParameters.votePublicKey = cVoteRegistrationParameters.votingPublicKey;
  }
  // @ts-expect-error
  if (cVoteRegistrationParameters.rewardAddressParameters) {
    console.warn('Please use paymentAddressParameters instead of rewardAddressParameters.');
    cVoteRegistrationParameters.paymentAddressParameters =
      // @ts-expect-error
      cVoteRegistrationParameters.rewardAddressParameters;
  }

  validateParams(cVoteRegistrationParameters, [
    { name: 'votePublicKey', type: 'string' },
    { name: 'stakingPath', required: true },
    { name: 'nonce', type: 'uint', required: true },
    { name: 'format', type: 'number' },
    { name: 'delegations', type: 'array', allowEmpty: true },
    { name: 'votingPurpose', type: 'uint' },
    { name: 'paymentAddress', type: 'string' },
  ]);
  const { paymentAddressParameters } = cVoteRegistrationParameters;
  validateAddressParameters(paymentAddressParameters);

  const { delegations } = cVoteRegistrationParameters;
  if (delegations && delegations.length > MAX_DELEGATION_COUNT) {
    throw ERRORS.TypedError(
      HardwareErrorCode.CallMethodInvalidParameter,
      `At most ${MAX_DELEGATION_COUNT} delegations are allowed in a governance registration`
    );
  }

  return {
    vote_public_key: cVoteRegistrationParameters.votePublicKey,
    staking_path: validatePath(cVoteRegistrationParameters.stakingPath, 3),
    payment_address_parameters: paymentAddressParameters
      ? addressParametersToProto(paymentAddressParameters)
      : undefined,
    nonce: cVoteRegistrationParameters.nonce as unknown as number,
    format: cVoteRegistrationParameters.format,
    delegations: delegations?.map(transformDelegation) ?? [],
    voting_purpose: cVoteRegistrationParameters.votingPurpose,
    payment_address: cVoteRegistrationParameters.paymentAddress,
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

  let cVoteRegistrationParameters;
  if (auxiliaryData.cVoteRegistrationParameters) {
    cVoteRegistrationParameters = transformCvoteRegistrationParameters(
      auxiliaryData.cVoteRegistrationParameters
    );
  }

  return {
    hash: auxiliaryData.hash,
    cvote_registration_parameters: cVoteRegistrationParameters,
  };
};

export const modifyAuxiliaryDataForBackwardsCompatibility = (
  auxiliary_data: PROTO.CardanoTxAuxiliaryData
): PROTO.CardanoTxAuxiliaryData => {
  const { cvote_registration_parameters } = auxiliary_data;
  if (cvote_registration_parameters?.payment_address_parameters) {
    cvote_registration_parameters.payment_address_parameters =
      modifyAddressParametersForBackwardsCompatibility(
        cvote_registration_parameters.payment_address_parameters
      );

    return {
      ...auxiliary_data,
      cvote_registration_parameters,
    };
  }

  return auxiliary_data;
};
