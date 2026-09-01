import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { OpenWalletSessionMode, getDeviceType } from '@onekeyfe/hd-core';

import { selectDeviceAtom } from '../../atoms/deviceAtoms';
import { executeProtocolAwareMethod } from '../../utils/protocolAwareMethod';

import type { CoreApi } from '@onekeyfe/hd-core';

type Device = {
  connectId: string;
  deviceId: string;
  deviceName: string;
  deviceType: string;
};

type Wallet = {
  id: string;
  name: string;
  deviceConnectId: string;
  passphraseState: string | undefined;
  mainWallet: boolean;
};

type Account = {
  id: string;
  name: string;
  walletId: string;
  address: string;
  path: string;
  type: string;
};

export const walletsAtom = atomWithStorage<Wallet[]>('attachToPinTest-wallets', []);
export const devicesAtom = atomWithStorage<Device[]>('attachToPinTest-devices', []);
export const accountsAtom = atomWithStorage<Account[]>('attachToPinTest-accounts', []);
export const requestStatusAtom = atom<{
  state: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
}>({
  state: 'idle',
});

export const walletByDeviceConnectIdAtom = atom(
  get => {
    const currentDevice = get(selectDeviceAtom);
    const wallets = get(walletsAtom);
    return wallets.filter(wallet => wallet.deviceConnectId === currentDevice?.connectId);
  },
  (get, set, deviceConnectId: string) => {
    const wallets = get(walletsAtom);
    return wallets.filter(wallet => wallet.deviceConnectId === deviceConnectId);
  }
);

export const getDeviceByConnectIdAtom = atom(null, (get, set, deviceConnectId: string) => {
  const devices = get(devicesAtom);
  return devices.find(device => device.connectId === deviceConnectId);
});

export const deleteWalletAtom = atom(null, (get, set, walletId: string) => {
  const wallets = get(walletsAtom);
  const wallet = wallets.find(wallet => wallet.id === walletId);
  if (!wallet) return;

  set(deleteAccountByWalletIdAtom, walletId);
  set(
    walletsAtom,
    wallets.filter(wallet => wallet.id !== walletId)
  );
});

export const deleteAccountByWalletIdAtom = atom(null, (get, set, walletId: string) => {
  const accounts = get(accountsAtom);
  set(
    accountsAtom,
    accounts.filter(account => account.walletId !== walletId)
  );
});

export const deleteAccountAtom = atom(null, (get, set, accountId: string) => {
  const accounts = get(accountsAtom);
  set(
    accountsAtom,
    accounts.filter(account => account.id !== accountId)
  );
});

export const checkAccountAddressAtom = atom(
  null,
  async (get, set, sdk: CoreApi | undefined, accountId: string) => {
    try {
      if (!sdk) {
        set(requestStatusAtom, { state: 'error', error: 'sdk not found' });
        return;
      }

      set(requestStatusAtom, { state: 'loading' });

      const savedAccounts = get(accountsAtom);
      const account = savedAccounts.find(account => account.id === accountId);
      if (!account) {
        set(requestStatusAtom, { state: 'error', error: `account not found: ${accountId}` });
        return;
      }

      const savedWallets = get(walletsAtom);
      const wallet = savedWallets.find(wallet => wallet.id === account.walletId);
      if (!wallet) {
        set(requestStatusAtom, { state: 'error', error: `wallet not found: ${accountId}` });
        return;
      }

      const { deviceConnectId } = wallet;

      // @ts-ignore
      const res = await sdk?.[`${account.type}GetAddress`](deviceConnectId, undefined, {
        path: account.path,
        showOnOneKey: false,
        passphraseState: wallet.passphraseState,
        useEmptyPassphrase: wallet.mainWallet,
      });

      if (!res.success) {
        set(requestStatusAtom, {
          state: 'error',
          error: `get ${account.type} address failed: ${res.payload?.error}`,
        });
        return;
      }

      if (res.payload?.address !== account.address) {
        set(requestStatusAtom, {
          state: 'error',
          error: `get ${account.type} address failed: ${res.payload?.error}`,
        });
        return;
      }

      set(requestStatusAtom, { state: 'success' });
      return res.payload?.address;
    } catch (error) {
      set(requestStatusAtom, {
        state: 'error',
        error: `get address failed: ${error}`,
      });
    }
  }
);

export const addWalletAtom = atom(
  null,
  async (
    get,
    set,
    sdk: CoreApi,
    name: string | undefined,
    mainWallet: boolean,
    passphraseState: string | undefined = undefined
  ) => {
    const device = get(selectDeviceAtom);

    const deviceConnectId = device?.connectId ?? '';
    const deviceId = device?.features?.device_id ?? '';
    set(requestStatusAtom, { state: 'loading' });

    const res1 = await executeProtocolAwareMethod({
      sdk,
      method: 'evmGetAddress',
      connectId: deviceConnectId,
      deviceId,
      protocol: device?.connectProtocol,
      params: {
        path: "m/44'/60'/0'/0/0",
        showOnOneKey: false,
        useEmptyPassphrase: mainWallet,
        passphraseState,
      },
    });
    if (!res1.success) {
      console.log('get evm address failed', res1);
      set(requestStatusAtom, {
        state: 'error',
        error: `get evm address failed: ${res1.payload?.code} ${res1.payload?.error}`,
      });
      return;
    }

    const res2 = await executeProtocolAwareMethod({
      sdk,
      method: 'btcGetAddress',
      connectId: deviceConnectId,
      deviceId,
      protocol: device?.connectProtocol,
      params: {
        path: "m/44'/0'/0'/0/0",
        showOnOneKey: false,
        useEmptyPassphrase: mainWallet,
        passphraseState,
      },
    });
    if (!res2.success) {
      set(requestStatusAtom, {
        state: 'error',
        error: `get btc address failed: ${res2.payload?.code} ${res2.payload?.error}`,
      });
      return;
    }

    // save device
    let deviceSave = set(getDeviceByConnectIdAtom, deviceConnectId);
    if (!deviceSave) {
      const deviceType = getDeviceType(device?.features);
      deviceSave = {
        connectId: deviceConnectId,
        deviceId,
        deviceName: device?.name ?? '',
        deviceType: deviceType ?? '',
      };
      const devices = get(devicesAtom);
      set(devicesAtom, [...devices, deviceSave]);
    }

    // save wallet
    const walletName = `${mainWallet ? '' : 'Hidden-'}Wallet-${
      name || res2.payload?.address.slice(-4)
    }`;

    // find wallet by name
    const wallet = get(walletsAtom).find(
      wallet => wallet.name === walletName && wallet.deviceConnectId === deviceConnectId
    );
    if (wallet) {
      set(requestStatusAtom, {
        state: 'error',
        error: `wallet already exists: ${walletName}`,
      });
      return;
    }

    const walletSave: Wallet = {
      id: Date.now().toString(),
      name: walletName,
      deviceConnectId,
      passphraseState,
      mainWallet,
    };

    set(walletsAtom, [...get(walletsAtom), walletSave]);

    // save account
    const accountEvmSave = {
      id: Date.now().toString(),
      name: `${walletSave.name}--EVM`,
      walletId: walletSave.id,
      address: res1.payload?.address ?? '',
      path: res1.payload?.path ?? '',
      type: 'evm',
    };
    const accountBtcSave = {
      id: Date.now().toString(),
      name: `${walletSave.name}--BTC`,
      walletId: walletSave.id,
      address: res2.payload?.address ?? '',
      path: res2.payload?.path ?? '',
      type: 'btc',
    };

    const accounts = get(accountsAtom);
    set(accountsAtom, [...accounts, accountEvmSave, accountBtcSave]);
    set(requestStatusAtom, { state: 'success' });

    return {
      wallet: walletSave,
      accounts: [accountEvmSave, accountBtcSave],
    };
  }
);

export const addHiddenWalletAtom = atom(
  null,
  async (get, set, sdk: CoreApi, name: string | undefined) => {
    const device = get(selectDeviceAtom);
    const deviceConnectId = device?.connectId ?? '';
    set(requestStatusAtom, { state: 'loading' });

    const res = await sdk.openWalletSession(deviceConnectId, {
      mode: OpenWalletSessionMode.SelectHidden,
    });
    if (!res.success) {
      set(requestStatusAtom, {
        state: 'error',
        error: `open wallet session failed: ${res.payload?.code} ${res.payload?.error}`,
      });
      return;
    }
    if (res.payload.walletType !== 'hidden') {
      set(requestStatusAtom, {
        state: 'error',
        error: 'open wallet session failed: expected a hidden wallet',
      });
      return;
    }

    return set(addWalletAtom, sdk, name, false, res.payload.passphraseState);
  }
);
