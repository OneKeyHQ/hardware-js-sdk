import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { getScriptType, isMultisigPath, fromHardened } from '../../helpers/pathUtils';
import bitcoin from '../../../data/coins/bitcoin.json';

export type BitcoinInfo = {
  name: string;
  slip44: number;
  label: string;
};

export const getCoinInfo = (path: number[] | undefined, coin: string | undefined) => {
  let coinInfo: BitcoinInfo | undefined;
  if (coin) {
    const coinName = coin.toLowerCase();
    coinInfo = bitcoin.find(
      c => c.name.toLowerCase() === coinName || c.label.toLowerCase() === coinName
    );
  } else if (path) {
    const slip44 = fromHardened(path[1]);
    coinInfo = bitcoin.find(c => c.slip44 === slip44);
  }

  if (!coinInfo) {
    if (coin) {
      throw ERRORS.TypedError(
        HardwareErrorCode.CallMethodInvalidParameter,
        `Invalid coin name: ${coin}`
      );
    } else if (path) {
      throw ERRORS.TypedError(
        HardwareErrorCode.CallMethodInvalidParameter,
        `Invalid path: ${path[0]}`
      );
    } else {
      throw ERRORS.TypedError(HardwareErrorCode.CallMethodInvalidParameter);
    }
  }

  return coinInfo;
};

export const getCoinAndScriptType = (
  path: number[],
  coin: string | undefined,
  multisig?: boolean
) => {
  const coinName = getCoinInfo(path, coin).name;

  let isMultisig = multisig;
  if (isMultisig === undefined) {
    isMultisig = isMultisigPath(path);
  }

  let scriptType = getScriptType(path);
  if (scriptType === 'SPENDMULTISIG' && !isMultisig) {
    scriptType = 'SPENDADDRESS';
  }

  return {
    coinName,
    scriptType: scriptType ?? 'SPENDADDRESS',
  };
};
