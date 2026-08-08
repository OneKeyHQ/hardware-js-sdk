import { StyleSheet } from 'react-native';

import { executeProtocolAwareMethod } from '../../utils/protocolAwareMethod';

import type { CoreApi } from '@onekeyfe/hd-core';

export type TestChain = 'btc' | 'evm' | 'dot' | 'ada';

export const requestAddress = async ({
  sdk,
  testChain,
  connectId,
  deviceId,
  passphraseState,
  useEmptyPassphrase,
  showOnOneKey = false,
}: {
  sdk: CoreApi;
  testChain: TestChain;
  connectId: string;
  deviceId: string;
  showOnOneKey?: boolean;
  passphraseState?: string;
  useEmptyPassphrase?: boolean;
}) => {
  let method: string;
  let params: Record<string, unknown>;

  if (testChain === 'evm') {
    method = 'evmGetAddress';
    params = {
      path: "m/44'/60'/0'/0/0",
      showOnOneKey,
      passphraseState,
      useEmptyPassphrase,
    };
  } else if (testChain === 'dot') {
    method = 'polkadotGetAddress';
    params = {
      path: "m/44'/354'/0'/0'/0'",
      prefix: '0',
      network: 'polkadot',
      showOnOneKey,
      passphraseState,
      useEmptyPassphrase,
    };
  } else if (testChain === 'ada') {
    method = 'cardanoGetAddress';
    params = {
      addressParameters: {
        addressType: 0,
        path: "m/1852'/1815'/0'/0/0",
        stakingPath: "m/1852'/1815'/0'/2/0",
      },
      protocolMagic: 764824073,
      networkId: 1,
      derivationType: 1,
      address: '',
      showOnOneKey,
      isCheck: false,
      passphraseState,
      useEmptyPassphrase,
    };
  } else {
    method = 'btcGetAddress';
    params = {
      path: "m/44'/0'/0'/0/0",
      coin: 'btc',
      showOnOneKey,
      passphraseState,
      useEmptyPassphrase,
    };
  }

  return executeProtocolAwareMethod({
    sdk,
    method,
    connectId,
    deviceId,
    params,
  });
};

export const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  subContainer: {
    width: '100%',
    marginTop: 16,
    padding: 10,
    backgroundColor: '#FFF',
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 8,
  },
  fullItem: {
    width: '100%',
  },
  resultItem: {
    width: '100%',
    flexDirection: 'row',
  },
  item: {
    margin: 16,
  },
  input: {
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 4,
    padding: 6,
    margin: 2,
    fontSize: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  responseInput: {
    backgroundColor: '#f7f7f7',
    minHeight: 200,
  },
});
