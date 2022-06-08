import { fromHardened } from '../api/helpers/pathUtils';
import bitcoin from '../data/coins/bitcoin.json';

const btcCoins = bitcoin.map(coin => coin.name);

export type BitcoinInfo = {
  name: string;
  slip44: number;
  label: string;
};

export default class CoinManager {
  static getCoins(): string[] {
    return btcCoins;
  }

  static getBitcoinCoinInfo(info: { name?: string; path?: number[] }): BitcoinInfo | undefined {
    let coinInfo: BitcoinInfo | undefined;
    if (info.name) {
      const coinName = info.name.toLowerCase();
      coinInfo = bitcoin.find(
        c => c.name.toLowerCase() === coinName || c.label.toLowerCase() === coinName
      );
    } else if (info.path) {
      const slip44 = fromHardened(info.path[1]);
      coinInfo = bitcoin.find(c => c.slip44 === slip44);
    }

    return coinInfo;
  }
}
