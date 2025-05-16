import { Stack, Text, XStack, YStack, ZStack } from 'tamagui';
import React, { useCallback, useContext, useEffect } from 'react';
import { createStore, Provider, useAtom, useAtomValue, useSetAtom, useStore } from 'jotai';
import { Toast, useToastController, useToastState } from '@tamagui/toast';
import { CoreMessage, UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';
import PanelView from '../../components/ui/Panel';
import { Button } from '../../components/ui/Button';
import {
  addHiddenWalletAtom,
  requestStatusAtom,
  addWalletAtom,
  walletByDeviceConnectIdAtom,
  checkAccountAddressAtom,
  deleteWalletAtom,
  accountsAtom,
} from './atoms';
import HardwareSDKContext from '../../provider/HardwareSDKContext';

function AccountLists({ walletId }: { walletId: string }) {
  const toast = useToastController();
  const { sdk } = useContext(HardwareSDKContext);
  const savedAccounts = useAtomValue(accountsAtom);
  const accounts = savedAccounts.filter(account => account.walletId === walletId);

  const checkAccountAddressAction = useSetAtom(checkAccountAddressAtom);

  const checkAccountAddress = useCallback(
    async (accountId: string) => {
      const address = await checkAccountAddressAction(sdk, accountId);
      if (address) {
        toast.show('Successfully', {
          title: 'Success',
          message: `Address: ${address}`,
        });
      }
    },
    [checkAccountAddressAction, sdk, toast]
  );

  return (
    <YStack gap={8}>
      {accounts?.map(account => (
        <Button key={account.id} onPress={() => checkAccountAddress(account.id)}>
          {`Check ${account.type.toUpperCase()} Address: ${account.address}`}
        </Button>
      ))}
    </YStack>
  );
}

function WalletLists() {
  const wallets = useAtomValue(walletByDeviceConnectIdAtom);
  const deleteWalletAction = useSetAtom(deleteWalletAtom);

  return (
    <YStack gap={4} paddingVertical={8}>
      {wallets?.map(wallet => (
        <Stack key={wallet.id} padding={8} borderWidth={1} borderColor="gray" borderRadius={8}>
          <XStack justifyContent="space-between" alignItems="center">
            <YStack>
              <Text key={wallet.id}>{`name: ${wallet.name}`}</Text>
              {wallet.passphraseState && (
                <Text key={wallet.id}>{`passphraseState: ${wallet.passphraseState}`}</Text>
              )}
            </YStack>

            <Button onPress={() => deleteWalletAction(wallet.id)}>
              <Text>Delete</Text>
            </Button>
          </XStack>
          <AccountLists walletId={wallet.id} />
        </Stack>
      ))}
    </YStack>
  );
}

function LoadingView() {
  const [requestStatus, setRequestStatus] = useAtom(requestStatusAtom);

  if (requestStatus.state === 'idle') return null;

  if (requestStatus.state === 'loading') {
    return (
      <YStack
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        backgroundColor="rgba(0, 0, 0, 0.5)"
        justifyContent="center"
        alignItems="center"
      >
        <Text color="white">Loading</Text>
      </YStack>
    );
  }

  if (requestStatus.state === 'error') {
    return (
      <YStack
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        backgroundColor="rgba(0, 0, 0, 0.5)"
        justifyContent="center"
        alignItems="center"
      >
        <Text color="white">{requestStatus.error}</Text>
        <Button color="white" onPress={() => setRequestStatus({ state: 'idle' })}>
          Close
        </Button>
      </YStack>
    );
  }
  return null;
}

function AttachToPinTest() {
  const { sdk } = useContext(HardwareSDKContext);

  const addWalletAction = useSetAtom(addWalletAtom);
  const addHiddenWalletAction = useSetAtom(addHiddenWalletAtom);

  useEffect(() => {
    const hardwareUiEventListener = (message: CoreMessage) => {
      if (message.type === UI_REQUEST.REQUEST_PASSPHRASE) {
        setTimeout(() => {
          sdk?.uiResponse({
            type: UI_RESPONSE.RECEIVE_PASSPHRASE,
            payload: {
              value: '',
              passphraseOnDevice: true,
            },
          });
        }, 100);
      }
    };
    sdk?.on(UI_EVENT, hardwareUiEventListener);

    return () => {
      sdk?.off(UI_EVENT, hardwareUiEventListener);
    };
  }, [sdk]);

  return (
    <>
      <PanelView>
        <YStack>
          <Text>Wallets</Text>
          <WalletLists />
          <XStack gap={8}>
            <Button
              onPress={async () => {
                if (!sdk) return;
                await addWalletAction(sdk, undefined, true);
              }}
            >
              Add Wallet
            </Button>
            <Button
              onPress={async () => {
                if (!sdk) return;
                await addHiddenWalletAction(sdk, undefined);
              }}
            >
              Add Hidden Wallet
            </Button>
          </XStack>
        </YStack>
        <LoadingView />
      </PanelView>
      <PanelView>
        <Text>Attach to Pin Test</Text>
      </PanelView>
    </>
  );
}

export function AttachToPinTestProvider() {
  return <AttachToPinTest />;
}
