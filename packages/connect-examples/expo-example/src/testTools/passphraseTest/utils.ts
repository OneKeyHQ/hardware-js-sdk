import { CoreApi } from '@onekeyfe/hd-core';
import { StyleSheet } from 'react-native';

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
  if (testChain === 'evm') {
    const evmAddressRes = await sdk.evmGetAddress(connectId, deviceId, {
      path: "m/44'/60'/0'/0/0",
      showOnOneKey,
      passphraseState,
      useEmptyPassphrase,
    });
    return evmAddressRes;
  }
  if (testChain === 'dot') {
    // @ts-expect-error
    const ethAddressRes = await sdk.polkadotGetAddress(connectId, deviceId, {
      path: "m/44'/354'/0'/0'/0'",
      prefix: '0',
      network: 'polkadot',
      showOnOneKey,
      passphraseState,
      useEmptyPassphrase,
    });
    return ethAddressRes;
  }
  if (testChain === 'ada') {
    const adaAddressRes = await sdk.cardanoGetAddress(connectId, deviceId, {
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
    });
    return adaAddressRes;
  }
  const btcAddressRes = await sdk.btcGetAddress(connectId, deviceId, {
    path: "m/44'/0'/0'/0/0",
    coin: 'btc',
    showOnOneKey,
    passphraseState,
    useEmptyPassphrase,
  });
  return btcAddressRes;
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
