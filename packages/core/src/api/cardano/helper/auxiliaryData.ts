import {
  validateAddressParameters,
  addressParametersToProto,
  modifyAddressParametersForBackwardsCompatibility,
} from './addressParameters';
import { validateParams } from '../../helpers/paramsValidator';
import { validatePath } from '../../helpers/pathUtils';
import type {
  CardanoAuxiliaryData,
  CardanoCatalystRegistrationParameters,
} from '../../../types/api/cardano';
import { PROTO } from '../../../constants';

const transformCatalystRegistrationParameters = (
  catalystRegistrationParameters: CardanoCatalystRegistrationParameters
  // @ts-expect-error
): PROTO.CardanoCatalystRegistrationParametersType => {
  validateParams(catalystRegistrationParameters, [
    { name: 'votingPublicKey', type: 'string', required: true },
    { name: 'stakingPath', required: true },
    { name: 'nonce', type: 'uint', required: true },
  ]);
  validateAddressParameters(catalystRegistrationParameters.rewardAddressParameters);

  return {
    voting_public_key: catalystRegistrationParameters.votingPublicKey,
    staking_path: validatePath(catalystRegistrationParameters.stakingPath, 3),
    reward_address_parameters: addressParametersToProto(
      catalystRegistrationParameters.rewardAddressParameters
    ),
    nonce: catalystRegistrationParameters.nonce,
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

  let catalystRegistrationParameters;
  if (auxiliaryData.catalystRegistrationParameters) {
    catalystRegistrationParameters = transformCatalystRegistrationParameters(
      auxiliaryData.catalystRegistrationParameters
    );
  }

  return {
    hash: auxiliaryData.hash,
    // @ts-expect-error
    catalyst_registration_parameters: catalystRegistrationParameters,
  };
};

export const modifyAuxiliaryDataForBackwardsCompatibility = (
  auxiliary_data: PROTO.CardanoTxAuxiliaryData
): PROTO.CardanoTxAuxiliaryData => {
  // @ts-expect-error
  const { catalyst_registration_parameters } = auxiliary_data;
  if (catalyst_registration_parameters) {
    catalyst_registration_parameters.reward_address_parameters =
      modifyAddressParametersForBackwardsCompatibility(
        catalyst_registration_parameters.reward_address_parameters
      );

    return {
      ...auxiliary_data,
      // @ts-expect-error
      catalyst_registration_parameters,
    };
  }

  return auxiliary_data;
};
