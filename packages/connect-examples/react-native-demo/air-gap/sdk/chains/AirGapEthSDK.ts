import { findHDPathFromAddress, generateAddressFromXpub } from '@keystonehq/bc-ur-registry-eth';
import { KeystoneEthereumSDK } from '@keystonehq/keystone-sdk';

import { removePathLastSegment } from '../accountUtils';

import type { IAirGapSDK } from '../types';

export class AirGapEthSDK extends KeystoneEthereumSDK implements IAirGapSDK {
  normalizeGetMultiAccountsPath(path: string) {
    return removePathLastSegment({
      path,
      removeCount: 2,
    });
  }

  generateAddressFromXpub(params: { xpub: string; derivePath: string }) {
    return generateAddressFromXpub(params.xpub, params.derivePath);
  }

  findHDPathFromAddress(params: {
    address: string;
    xpub: string;
    numberLimit: number;
    rootPath: string;
  }) {
    return findHDPathFromAddress(params.address, params.xpub, params.numberLimit, params.rootPath);
  }
}
