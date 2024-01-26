export const INDEX_MARK = '$$INDEX$$';
export const CHANGE_MARK = '$$CHANGE$$';
export const ADDRESS_INDEX_MARK = '$$ADDRESS_INDEX$$';

export const baseParams = {
  cardanoGetPublicKey: {
    path: `m/1852'/1815'/${INDEX_MARK}'/0/0`,
    showOnOneKey: false,
  },
  aptosGetPublicKey: {
    path: `m/44'/637'/${INDEX_MARK}'/0'/0'`,
    showOnOneKey: false,
  },
  btcGetPublicKey: {
    path: `m/44'/0'/0'/0/${INDEX_MARK}`,
    coin: 'btc',
    showOnOneKey: false,
  },
  cosmosGetPublicKey: {
    path: `m/44'/118'/0'/0/${INDEX_MARK}`,
    showOnOneKey: false,
    curve: 'secp256k1',
  },
  evmGetPublicKey: {
    path: `m/44'/60'/0'/0/${INDEX_MARK}`,
    showOnOneKey: false,
  },
  nostrGetPublicKey: {
    path: `m/44'/1237'/${INDEX_MARK}'/0/0`,
    showOnOneKey: false,
  },
  polkadotGetAddress: {
    path: `m/44'/354'/${INDEX_MARK}'/0'/0'`,
    prefix: '0',
    network: 'polkadot',
    showOnOneKey: false,
  },
  xrpGetAddress: {
    path: `m/44'/144'/${INDEX_MARK}'/0/0`,
    showOnOneKey: false,
  },
  suiGetPublicKey: {
    path: `m/44'/784'/${INDEX_MARK}'/0'/0'`,
    showOnOneKey: false,
  },
};
