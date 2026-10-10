import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { Buffer } from 'buffer';

import { BaseMethod } from '../BaseMethod';
import { invalidParameter, validateParams } from '../helpers/paramsValidator';
import { getScriptType, validatePath } from '../helpers/pathUtils';

import type { BabylonDeriveContextHash, CanonicalBitcoinNetwork } from '@onekeyfe/hd-transport';
import type { BTCDeriveContextHashParams } from '../../types';

const NETWORKS: Record<BTCDeriveContextHashParams['network'], CanonicalBitcoinNetwork> = {
  'bitcoin-mainnet': 'BITCOIN_MAINNET',
  'bitcoin-testnet': 'BITCOIN_TESTNET',
  'bitcoin-signet': 'BITCOIN_SIGNET',
  'bitcoin-regtest': 'BITCOIN_REGTEST',
};

export default class BTCDeriveContextHash extends BaseMethod<BabylonDeriveContextHash> {
  strictCheckDeviceSupport = true;

  init() {
    this.checkDeviceId = true;
    this.allowUsePreInitialize = true;

    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'appName', type: 'string', required: true },
      { name: 'context', type: 'string', required: true },
      { name: 'network', type: 'string', required: true },
    ]);

    const { path, appName, context, network } = this.payload;
    if (typeof appName !== 'string' || !/^[a-z0-9-]{1,64}$/.test(appName)) {
      throw invalidParameter(
        'appName must contain 1..64 ASCII lowercase letters, digits or hyphens'
      );
    }
    if (typeof context !== 'string' || !/^(?:[0-9a-f]{2}){1,1024}$/.test(context)) {
      throw invalidParameter('context must be 1..1024 bytes of lowercase hex without a prefix');
    }
    if (typeof network !== 'string' || !Object.prototype.hasOwnProperty.call(NETWORKS, network)) {
      throw invalidParameter('Unsupported Bitcoin network');
    }

    // Reject malformed or overflowing indices before validatePath can truncate them.
    if (
      (typeof path === 'string' &&
        (!/^m(?:\/\d+'?)+$/i.test(path) ||
          path
            .split('/')
            .slice(1)
            .some(index => Number(index.replace("'", '')) >= 0x80000000))) ||
      (Array.isArray(path) &&
        path.some(index => !Number.isInteger(index) || index < 0 || index > 0xffffffff))
    ) {
      throw invalidParameter('Not a valid BIP-32 path');
    }
    const addressN = validatePath(path, 3);

    this.params = {
      address_n: addressN,
      script_type: getScriptType(addressN),
      app_name: Buffer.from(appName, 'ascii').toString('hex'),
      context,
      network: NETWORKS[network as BTCDeriveContextHashParams['network']],
    };
  }

  getVersionRange() {
    return { classic1s: { min: '3.21.0' } };
  }

  async run() {
    const { message } = await this.device.commands.typedCall(
      'BabylonDeriveContextHash',
      'BabylonDerivedContextHash',
      this.params
    );
    if (typeof message.secret !== 'string' || !/^[0-9a-f]{64}$/.test(message.secret)) {
      throw ERRORS.TypedError(
        HardwareErrorCode.CallMethodError,
        'Invalid Babylon context hash response'
      );
    }
    return message;
  }
}
