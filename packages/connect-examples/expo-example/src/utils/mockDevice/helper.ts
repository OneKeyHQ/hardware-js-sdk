import * as bip39 from '@scure/bip39';
import { HDKey as Scep256k1HDKey } from '@scure/bip32';
import { HDKey as Ed25519HDKey } from 'micro-ed25519-hdkey';

export function mnemonicToSeed(mnemonic: string, passphrase?: string) {
  return Buffer.from(bip39.mnemonicToSeedSync(mnemonic.trim(), passphrase));
}

export function deriveKeyPairWithPath(
  seed: Buffer,
  path: string,
  type: 'ed25519' | 'secp256k1' = 'secp256k1'
) {
  const HDKey = type === 'ed25519' ? Ed25519HDKey : Scep256k1HDKey;
  const master = HDKey.fromMasterSeed(seed);
  const keyPair = master.derive(path);

  return keyPair;
}
