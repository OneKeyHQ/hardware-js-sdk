import type { DeviceFirmwareRange } from '../../../types';
import type { ProtocolType } from '@onekeyfe/hd-transport';

function isCoinNameInList(coinName: string, coinNames: (string | undefined)[]) {
  for (let i = 0; i < coinNames.length; i++) {
    const coin_name = coinNames[i];
    if (coin_name?.toLowerCase() === coinName?.toLowerCase()) {
      return true;
    }
  }
  return false;
}

export function getBitcoinForkVersionRange(params: (string | undefined)[]): DeviceFirmwareRange {
  if (isCoinNameInList('Neurai', params)) {
    return {
      model_mini: {
        min: '3.7.0',
      },
      model_touch: {
        min: '4.9.0',
      },
    };
  }

  // No version restrictions for other coins
  return {};
}

export function getBitcoinForkSupportedProtocols(
  params: (string | undefined)[]
): readonly ProtocolType[] {
  return isCoinNameInList('Neurai', params) ? ['V1'] : ['V1', 'V2'];
}
