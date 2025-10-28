import { KeystoneBitcoinSDK } from '@keystonehq/keystone-sdk';

import { removePathLastSegment } from '../accountUtils';

import type { IAirGapSDK } from '../types';

export class AirGapBtcSDK extends KeystoneBitcoinSDK implements IAirGapSDK {
  normalizeGetMultiAccountsPath(path: string) {
    return removePathLastSegment({
      path,
      removeCount: 2,
    });
  }
}
