import type { ChainForFingerprint } from '../types/fingerprint';

export type HardwareMethodMetadata = {
  chain: ChainForFingerprint;
  allNetwork: boolean;
};

export const HARDWARE_METHOD_CATALOG = {
  evmGetAddress: { chain: 'evm', allNetwork: true },
  evmSignTransaction: { chain: 'evm', allNetwork: false },
  evmSignMessage: { chain: 'evm', allNetwork: false },
  evmSignTypedData: { chain: 'evm', allNetwork: false },
  btcGetAddress: { chain: 'btc', allNetwork: true },
  btcGetPublicKey: { chain: 'btc', allNetwork: true },
  btcSignTransaction: { chain: 'btc', allNetwork: false },
  btcSignPsbt: { chain: 'btc', allNetwork: false },
  btcSignMessage: { chain: 'btc', allNetwork: false },
  btcGetMasterFingerprint: { chain: 'btc', allNetwork: false },
  solGetAddress: { chain: 'sol', allNetwork: true },
  solSignTransaction: { chain: 'sol', allNetwork: false },
  solSignMessage: { chain: 'sol', allNetwork: false },
  tronGetAddress: { chain: 'tron', allNetwork: true },
  tronSignTransaction: { chain: 'tron', allNetwork: false },
  tronSignMessage: { chain: 'tron', allNetwork: false },
} as const satisfies Record<string, HardwareMethodMetadata>;

export type HardwareMethodName = keyof typeof HARDWARE_METHOD_CATALOG;

export type AllNetworkMethodName = {
  [K in HardwareMethodName]: (typeof HARDWARE_METHOD_CATALOG)[K]['allNetwork'] extends true
    ? K
    : never;
}[HardwareMethodName];

export const ALL_NETWORK_METHOD_NAMES = Object.entries(HARDWARE_METHOD_CATALOG)
  .filter(([, metadata]) => metadata.allNetwork)
  .map(([method]) => method) as AllNetworkMethodName[];

const ALL_NETWORK_METHOD_SET = new Set<string>(ALL_NETWORK_METHOD_NAMES);

export function getHardwareMethodMetadata(method: string): HardwareMethodMetadata | undefined {
  return HARDWARE_METHOD_CATALOG[method as HardwareMethodName];
}

export function isAllNetworkMethodName(method: string): method is AllNetworkMethodName {
  return ALL_NETWORK_METHOD_SET.has(method);
}

export function getAllNetworkMethodChain(method: AllNetworkMethodName): ChainForFingerprint {
  return HARDWARE_METHOD_CATALOG[method].chain;
}
