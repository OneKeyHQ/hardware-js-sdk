import { Buffer } from 'buffer';
/**
 * https://github.com/monero-project/monero/blob/v0.17.1.9/src/cryptonote_config.h
 */

const CONFIG_COMMON = {
  HASH_KEY_SUBADDRESS: Buffer.from('SubAddr', 'ascii'),
  ADDRESS_CHECKSUM_SIZE: 4,
};

const CONFIG_DNX_MAINNET = {
  CRYPTONOTE_PUBLIC_ADDRESS_BASE58_PREFIX: Buffer.from([185]),
  CRYPTONOTE_PUBLIC_INTEGRATED_ADDRESS_BASE58_PREFIX: Buffer.from([19]),
  CRYPTONOTE_PUBLIC_SUBADDRESS_BASE58_PREFIX: Buffer.from([42]),
};

const CONFIG_MAINNET = {
  CRYPTONOTE_PUBLIC_ADDRESS_BASE58_PREFIX: Buffer.from([18]),
  CRYPTONOTE_PUBLIC_INTEGRATED_ADDRESS_BASE58_PREFIX: Buffer.from([19]),
  CRYPTONOTE_PUBLIC_SUBADDRESS_BASE58_PREFIX: Buffer.from([42]),
};

const CONFIG_STAGENET = {
  CRYPTONOTE_PUBLIC_ADDRESS_BASE58_PREFIX: Buffer.from([24]),
  CRYPTONOTE_PUBLIC_INTEGRATED_ADDRESS_BASE58_PREFIX: Buffer.from([25]),
  CRYPTONOTE_PUBLIC_SUBADDRESS_BASE58_PREFIX: Buffer.from([36]),
};

const CONFIG_TESTNET = {
  CRYPTONOTE_PUBLIC_ADDRESS_BASE58_PREFIX: Buffer.from([53]),
  CRYPTONOTE_PUBLIC_INTEGRATED_ADDRESS_BASE58_PREFIX: Buffer.from([54]),
  CRYPTONOTE_PUBLIC_SUBADDRESS_BASE58_PREFIX: Buffer.from([63]),
};

export function getConfig(nettype) {
  switch (nettype) {
    case 'dnxmainnet': {
      return {
        ...CONFIG_COMMON,
        ...CONFIG_DNX_MAINNET,
      };
    }
    case 'mainnet': {
      return {
        ...CONFIG_COMMON,
        ...CONFIG_MAINNET,
      };
    }
    case 'stagenet': {
      return {
        ...CONFIG_COMMON,
        ...CONFIG_STAGENET,
      };
    }
    case 'testnet': {
      return {
        ...CONFIG_COMMON,
        ...CONFIG_TESTNET,
      };
    }
    case 'regtest': {
      return {
        ...CONFIG_COMMON,
        ...CONFIG_MAINNET,
      };
    }
    default: {
      throw new TypeError(`Invalid network type: ${nettype}`);
    }
  }
}
