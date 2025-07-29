import btcData from './btc';
import ethData from './eth';
import adaData from './ada';
import solData from './sol';
import dotData from './dot';

export interface ChainTestData {
  name: string;
  symbol: string;
  data: any[];
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
