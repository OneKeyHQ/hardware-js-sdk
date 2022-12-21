import { validateParams } from '../../helpers/paramsValidator';
import { validatePath } from '../../helpers/pathUtils';
import type { PROTO } from '../../../constants';

export type Path = number[];

export type InputWithPath = {
  input: PROTO.CardanoTxInput;
  path?: Path;
};

export type CollateralInputWithPath = {
  collateralInput: PROTO.CardanoTxCollateralInput;
  path?: Path;
};

export const transformInput = (input: any): InputWithPath => {
  validateParams(input, [
    { name: 'prev_hash', type: 'string', required: true },
    { name: 'prev_index', type: 'number', required: true },
  ]);
  return {
    input: {
      prev_hash: input.prev_hash,
      prev_index: input.prev_index,
    },
    path: input.path ? validatePath(input.path, 5) : undefined,
  };
};

export const transformCollateralInput = (collateralInput: any): CollateralInputWithPath => {
  validateParams(collateralInput, [
    { name: 'prev_hash', type: 'string', required: true },
    { name: 'prev_index', type: 'number', required: true },
  ]);
  return {
    collateralInput: {
      prev_hash: collateralInput.prev_hash,
      prev_index: collateralInput.prev_index,
    },
    path: collateralInput.path ? validatePath(collateralInput.path, 5) : undefined,
  };
};

export const transformReferenceInput = (referenceInput: any): PROTO.CardanoTxReferenceInput => {
  validateParams(referenceInput, [
    { name: 'prev_hash', type: 'string', required: true },
    { name: 'prev_index', type: 'number', required: true },
  ]);
  return {
    prev_hash: referenceInput.prev_hash,
    prev_index: referenceInput.prev_index,
  };
};
