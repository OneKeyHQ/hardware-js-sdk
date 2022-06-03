import CoinManager from '../../data-manager/CoinManager';
import { getScriptType, isMultisigPath } from './pathUtils';

export const getCoinAndScriptType = (
  path: number[],
  coin: string | undefined,
  multisig?: boolean
) => {
  let coin_name: string | undefined;
  if (coin) {
    coin_name = CoinManager.getBitcoinCoinInfo({ name: coin })?.name;
    if (!coin_name) {
      throw new Error(`Invalid coin name: ${coin}`);
    }
  } else {
    coin_name = CoinManager.getBitcoinCoinInfo({ path })?.name;
  }

  let isMultisig = multisig;
  if (isMultisig === undefined) {
    isMultisig = isMultisigPath(path);
  }

  let scriptType = getScriptType(path);
  if (scriptType === 'SPENDMULTISIG' && !isMultisig) {
    scriptType = 'SPENDADDRESS';
  }

  return {
    coin_name,
    script_type: scriptType ?? 'SPENDADDRESS',
  };
};
