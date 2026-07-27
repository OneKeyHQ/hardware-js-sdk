import { HDNodeWallet } from 'ethers';

import type { MultisigMnemonics } from './readMnemonics';

export const ETH_DERIVATION_PATH = "m/44'/60'/0'/0/0";

export type DerivedEthSigner = {
  address: string;
  wallet: HDNodeWallet;
};

export function deriveEthSigners(mnemonics: MultisigMnemonics): DerivedEthSigner[] {
  return mnemonics.map(mnemonic => {
    const wallet = HDNodeWallet.fromPhrase(mnemonic, undefined, ETH_DERIVATION_PATH);
    return { address: wallet.address, wallet };
  });
}

