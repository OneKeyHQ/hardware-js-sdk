import normal12 from './normal12';
import normal18 from './normal18';
import normal24 from './normal24';
import passphrase121 from './passphrase12_1';
import passphrase122 from './passphrase12_2';
import passphrase123 from './passphrase12_3';
import passphrase12Empty from './passphrase12_empty';
import passphrase181 from './passphrase18_1';
import passphrase182 from './passphrase18_2';
import passphrase183 from './passphrase18_3';
import passphrase184 from './passphrase18_4';
import passphrase241 from './passphrase24_1';
import passphrase242 from './passphrase24_2';
import passphrase243 from './passphrase24_3';
import passphrase244 from './passphrase24_4';
import unsafeNormal12 from './unsafe_normal12';
import unsafePassphrase12 from './unsafe_passphrase12';
import unsafePassphrase12Empty from './unsafe_passphrase12_empty';
import type { TestCase } from './types';

export const baseChainParams = {
  algoGetAddress: {
    path: "m/44'/283'/0'/0'/0'",
    showOnOneKey: false,
  },
  aptosGetAddress: {
    path: "m/44'/637'/0'/0'/0'",
    showOnOneKey: false,
  },
  btcGetAddress: {
    path: "m/44'/0'/0'/0/0",
    coin: 'btc',
    showOnOneKey: false,
  },
  cardanoGetAddress: {
    addressParameters: {
      addressType: 0,
      path: "m/1852'/1815'/0'/0/0",
      stakingPath: "m/1852'/1815'/0'/2/0",
      stakingKeyHash: undefined,
      paymentScriptHash: undefined,
      stakingScriptHash: undefined,
    },
    protocolMagic: 764824073,
    networkId: 1,
    derivationType: 1,
    address: '',
    showOnOneKey: false,
    isCheck: false,
  },
  confluxGetAddress: {
    path: "m/44'/503'/0'/0/0",
    chainId: 1029,
    showOnOneKey: false,
  },
  cosmosGetAddress: {
    path: "m/44'/118'/0'/0/0",
    showOnOneKey: false,
    hrp: 'cosmos',
  },
  evmGetAddress: {
    path: "m/44'/60'/0'/0/0",
    showOnOneKey: false,
  },
  filecoinGetAddress: {
    path: "m/44'/461'/0'/0/0",
    showOnOneKey: false,
  },
  kaspaGetAddress: {
    path: "m/44'/111111'/0'/0/0",
    showOnOneKey: false,
    prefix: 'kaspa',
    scheme: 'schnorr',
  },
  nearGetAddress: {
    path: "m/44'/397'/0'",
    showOnOneKey: false,
  },
  nemGetAddress: {
    path: "m/44'/43'/0'",
    showOnOneKey: false,
  },
  nexaGetAddress: {
    path: "m/44'/29223'/0'/0/0",
    showOnOneKey: false,
    prefix: 'nexa',
    scheme: 'schnorr',
  },
  polkadotGetAddress: {
    path: "m/44'/354'/0'/0'/0'",
    prefix: '0',
    network: 'polkadot',
    showOnOneKey: false,
  },
  xrpGetAddress: {
    path: "m/44'/144'/0'/0/0",
    showOnOneKey: false,
  },
  solGetAddress: {
    path: "m/44'/501'/0'/0'",
    showOnOneKey: false,
  },
  starcoinGetAddress: {
    path: "m/44'/101010'/0'/0'/0'",
    showOnOneKey: false,
  },
  stellarGetAddress: {
    path: "m/44'/148'/0'",
    showOnOneKey: false,
  },
  suiGetAddress: {
    path: "m/44'/784'/0'/0'/0'",
    showOnOneKey: false,
  },
  tronGetAddress: {
    path: "m/44'/195'/0'/0/0",
    showOnOneKey: false,
  },
  nostrGetPublicKey: {
    path: "m/44'/1237'/0'/0/0",
    showOnOneKey: false,
  },
};

export const testCases: TestCase[] = [
  normal12,
  normal18,
  normal24,
  passphrase12Empty,
  passphrase121,
  passphrase122,
  passphrase123,
  passphrase181,
  passphrase182,
  passphrase183,
  passphrase184,
  passphrase241,
  passphrase242,
  passphrase243,
  passphrase244,
  unsafeNormal12,
  unsafePassphrase12,
  unsafePassphrase12Empty,
];
