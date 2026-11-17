import btcData from './btc';
import ethData from './eth';
import adaData from './ada';
import solData from './sol';
import dotData from './dot';
import zcashApi from '../../../data/zcash';
import moneroApi from '../../../data/monero';

import type { PlaygroundProps } from '../../../components/Playground';

/**
 * Chain method entry for automation tests.
 * Extends PlaygroundProps with confirmation metadata for signing methods.
 * - confirmCount: number of button presses before final gesture (default 1)
 * - noSlide: if true, no slide-confirm needed (most signMessage methods)
 */
export type ChainMethodEntry = PlaygroundProps & {
  confirmCount?: number;
  noSlide?: boolean;
};

export interface ChainTestData {
  name: string;
  symbol: string;
  data: ChainMethodEntry[];
}

// Batch suites use address-only presets; signing needs wallet-provided data and key export is manual.
const zcashData = zcashApi.filter(entry => entry.method === 'zcashGetAddress');
const moneroData = moneroApi.filter(entry => entry.method === 'moneroGetAddress');

export const chainTestData: ChainTestData[] = [
  {
    name: 'Bitcoin',
    symbol: 'BTC',
    data: btcData,
  },
  {
    name: 'Ethereum',
    symbol: 'ETH',
    data: ethData,
  },
  {
    name: 'Cardano',
    symbol: 'ADA',
    data: adaData,
  },
  {
    name: 'Solana',
    symbol: 'SOL',
    data: solData,
  },
  {
    name: 'Polkadot',
    symbol: 'DOT',
    data: dotData,
  },
  { name: 'Monero', symbol: 'XMR', data: moneroData },
  { name: 'Zcash', symbol: 'ZEC', data: zcashData },
];

export { btcData, ethData, adaData, solData, dotData, zcashData, moneroData };
