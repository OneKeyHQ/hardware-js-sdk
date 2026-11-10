import type { ChainForFingerprint } from '../types/fingerprint';

export type HardwareMethodMetadata = {
  chain: ChainForFingerprint;
  allNetwork: boolean;
  /** Whether repeating the method after an ambiguous transport failure is safe. */
  replayAfterTransportFailure: 'safe' | 'unsafe';
};

export const HARDWARE_METHOD_CATALOG = {
  evmGetAddress: { chain: 'evm', allNetwork: true, replayAfterTransportFailure: 'safe' },
  evmSignTransaction: {
    chain: 'evm',
    allNetwork: false,
    replayAfterTransportFailure: 'unsafe',
  },
  evmSignMessage: { chain: 'evm', allNetwork: false, replayAfterTransportFailure: 'unsafe' },
  evmSignTypedData: { chain: 'evm', allNetwork: false, replayAfterTransportFailure: 'unsafe' },
  btcGetAddress: { chain: 'btc', allNetwork: true, replayAfterTransportFailure: 'safe' },
  btcGetPublicKey: { chain: 'btc', allNetwork: true, replayAfterTransportFailure: 'safe' },
  btcSignTransaction: {
    chain: 'btc',
    allNetwork: false,
    replayAfterTransportFailure: 'unsafe',
  },
  btcSignPsbt: { chain: 'btc', allNetwork: false, replayAfterTransportFailure: 'unsafe' },
  btcSignMessage: { chain: 'btc', allNetwork: false, replayAfterTransportFailure: 'unsafe' },
  btcGetMasterFingerprint: {
    chain: 'btc',
    allNetwork: false,
    replayAfterTransportFailure: 'safe',
  },
  solGetAddress: { chain: 'sol', allNetwork: true, replayAfterTransportFailure: 'safe' },
  solSignTransaction: {
    chain: 'sol',
    allNetwork: false,
    replayAfterTransportFailure: 'unsafe',
  },
  solSignMessage: { chain: 'sol', allNetwork: false, replayAfterTransportFailure: 'unsafe' },
  tronGetAddress: { chain: 'tron', allNetwork: true, replayAfterTransportFailure: 'safe' },
  tronSignTransaction: {
    chain: 'tron',
    allNetwork: false,
    replayAfterTransportFailure: 'unsafe',
  },
  tronSignMessage: { chain: 'tron', allNetwork: false, replayAfterTransportFailure: 'unsafe' },
  zcashGetFullViewingKey: {
    chain: 'zcash',
    allNetwork: false,
    replayAfterTransportFailure: 'safe',
  },
  zcashGetShieldedAddress: {
    chain: 'zcash',
    allNetwork: false,
    replayAfterTransportFailure: 'safe',
  },
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

const SAFE_NON_CHAIN_METHODS = new Set(['getFeatures', 'authenticateDevice']);

/**
 * Conservative replay gate used only after a call may have reached hardware.
 * Unknown methods and device mutations are unsafe by default.
 */
export function canReplayHardwareMethodAfterTransportFailure(method: string): boolean {
  return (
    getHardwareMethodMetadata(method)?.replayAfterTransportFailure === 'safe' ||
    SAFE_NON_CHAIN_METHODS.has(method)
  );
}

export function isAllNetworkMethodName(method: string): method is AllNetworkMethodName {
  return ALL_NETWORK_METHOD_SET.has(method);
}

export function getAllNetworkMethodChain(method: AllNetworkMethodName): ChainForFingerprint {
  return HARDWARE_METHOD_CATALOG[method].chain;
}
