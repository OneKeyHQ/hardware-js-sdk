import btcData from './btc';
import ethData from './eth';
import adaData from './ada';
import solData from './sol';
import dotData from './dot';

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
];

export { btcData, ethData, adaData, solData, dotData };
