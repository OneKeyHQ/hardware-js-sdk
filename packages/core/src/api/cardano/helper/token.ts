import { validateParams } from '../../helpers/paramsValidator';
import type {
  CardanoAssetGroup,
  AssetGroupWithTokens,
  CardanoToken,
} from '../../../types/api/cardano';
import type { PROTO } from '../../../constants';

const validateTokens = (tokenAmounts: CardanoToken[]) => {
  tokenAmounts.forEach(tokenAmount => {
    validateParams(tokenAmount, [
      { name: 'assetNameBytes', type: 'string', required: true },
      { name: 'amount', type: 'uint' },
      { name: 'mintAmount', type: 'uint', allowNegative: true },
    ]);
  });
};

const validateTokenBundle = (tokenBundle: CardanoAssetGroup[]) => {
  tokenBundle.forEach(tokenGroup => {
    validateParams(tokenGroup, [
      { name: 'policyId', type: 'string', required: true },
      { name: 'tokenAmounts', type: 'array', required: true },
    ]);

    validateTokens(tokenGroup.tokenAmounts);
  });
};

export const tokenBundleToProto = (tokenBundle: CardanoAssetGroup[]): AssetGroupWithTokens[] => {
  validateTokenBundle(tokenBundle);
  return tokenBundle.map(tokenGroup => ({
    policyId: tokenGroup.policyId,
    tokens: tokenAmountsToProto(tokenGroup.tokenAmounts),
  }));
};

const tokenAmountsToProto = (tokenAmounts: CardanoToken[]): PROTO.CardanoToken[] =>
  tokenAmounts.map(tokenAmount => ({
    asset_name_bytes: tokenAmount.assetNameBytes,
    amount: tokenAmount.amount,
    mint_amount: tokenAmount.mintAmount,
  }));
