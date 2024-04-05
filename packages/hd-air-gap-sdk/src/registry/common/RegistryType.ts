// cbor registry types: https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md
// Map<name, tag>

export class RegistryType {
  // eslint-disable-next-line no-useless-constructor, no-empty-function
  constructor(private type: string, private tag?: number) {}

  getTag = () => this.tag;

  getType = () => this.type;
}

export const RegistryTypes = {
  UUID: new RegistryType('uuid', 37),
  BYTES: new RegistryType('bytes', undefined),
  CRYPTO_HDKEY: new RegistryType('crypto-hdkey', 303),
  CRYPTO_KEYPATH: new RegistryType('crypto-keypath', 304),
  CRYPTO_COIN_INFO: new RegistryType('crypto-coin-info', 305),
  CRYPTO_ECKEY: new RegistryType('crypto-eckey', 306),
  CRYPTO_OUTPUT: new RegistryType('crypto-output', 308),
  CRYPTO_PSBT: new RegistryType('crypto-psbt', 310),
  CRYPTO_ACCOUNT: new RegistryType('crypto-account', 311),
  CRYPTO_MULTI_ACCOUNTS: new RegistryType('crypto-multi-accounts', 1103),
  QR_HARDWARE_CALL: new RegistryType('qr-hardware-call', 1201),
  KEY_DERIVATION_CALL: new RegistryType('key-derivation-call', 1301),
  KEY_DERIVATION_SCHEMA: new RegistryType('key-derivation-schema', 1302),

  ETH_SIGN_REQUEST: new RegistryType('eth-sign-request', 401),
  ETH_SIGNATURE: new RegistryType('eth-signature', 402),
  ETH_NFT_ITEM: new RegistryType('eth-nft-item', 403),
};
