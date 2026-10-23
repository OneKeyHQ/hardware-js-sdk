import type { ChainCapability } from '@onekeyfe/hwk-adapter-core';

interface KeystoneFirmwareProfile {
  variant: 'multi-coin' | 'bitcoin-only' | 'cypherpunk';
  supportedChains: readonly ChainCapability[];
}

const MULTI_COIN: KeystoneFirmwareProfile = {
  variant: 'multi-coin',
  supportedChains: ['btc', 'evm', 'sol', 'tron'],
};

const BITCOIN_ONLY: KeystoneFirmwareProfile = {
  variant: 'bitcoin-only',
  supportedChains: ['btc'],
};

const CYPHERPUNK: KeystoneFirmwareProfile = {
  variant: 'cypherpunk',
  // Firmware support alone is insufficient: this adapter has no Zcash/Monero methods yet.
  supportedChains: ['btc'],
};

/** Uses firmware metadata, never the USB descriptor or a successful public-key export. */
export function getKeystoneFirmwareProfile(
  firmwareVersion: string | undefined
): KeystoneFirmwareProfile | undefined {
  if (!firmwareVersion || firmwareVersion === '0.0.0') return undefined;
  const version = /^\d{1,4}(?:\.\d{1,4}){1,3}(?:-([a-z0-9.-]{1,40}))?$/i.exec(firmwareVersion);
  if (!version) return undefined;
  const suffix = version[1]?.toUpperCase();
  if (!suffix) return MULTI_COIN;
  if (suffix === 'C' || suffix === 'CYPHERPUNK' || suffix === 'CYPHERPUNK-B') return CYPHERPUNK;
  if (suffix === 'B' || suffix === 'BTC' || suffix === 'BTC-ONLY') return BITCOIN_ONLY;
  return undefined;
}
