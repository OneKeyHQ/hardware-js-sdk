import { forwardRef, useCallback, useContext, useImperativeHandle } from 'react';
import { ListItem, Stack, Text, View, XStack } from 'tamagui';
import { FlatList, Platform } from 'react-native';
import { Check } from '@tamagui/lucide-icons';
import { useIntl } from 'react-intl';
import { useAtomValue, useSetAtom } from 'jotai';

import HardwareSDKContext from '../provider/HardwareSDKContext';
import { isElectronBleRuntime } from '../utils/hardwareInstance';
import { Button } from './ui/Button';
import PanelView from './ui/Panel';
import { deviceActionsAtom, deviceListAtom, selectDeviceAtom } from '../atoms/deviceAtoms';

import type { Features } from '@onekeyfe/hd-core';
import type { ForwardedRef } from 'react';

export type Device = {
  connectId: string;
  name: string;
  features?: Features;
  deviceType?: string;
  id?: string;
  state?: string;
  connectProtocol?: 'V1' | 'V2';
};

type ItemProps = {
  item: Device;
  onPress: () => void;
  connected: boolean;
};

const Item = ({ item, onPress, connected }: ItemProps) => {
  const intl = useIntl();

  return (
    <ListItem
      onPress={onPress}
      backgroundColor={connected ? '$bgInfo' : '$bgHover'}
      icon={connected ? Check : undefined}
      flexWrap="wrap"
      borderWidth="$px"
      borderColor="$border"
      gap="$4"
    >
      <ListItem.Text>{item.name}</ListItem.Text>
      <ListItem.Text>{item.deviceType}</ListItem.Text>
      <ListItem.Text>{item.connectProtocol ?? 'Unknown protocol'}</ListItem.Text>
      <ListItem.Text>{item.connectId}</ListItem.Text>
      <Button onPress={onPress}>{intl.formatMessage({ id: 'action__connect_device' })}</Button>
    </ListItem>
  );
};

type IDeviceListProps = {
  disableSaveDevice?: boolean;
};
export interface IDeviceListInstance {
  searchDevices: () => Promise<void> | void;
}

function DeviceListFC(
  { disableSaveDevice = false }: IDeviceListProps,
  ref: ForwardedRef<IDeviceListInstance>
) {
  const intl = useIntl();
  const { sdk } = useContext(HardwareSDKContext);
  const selectedDevice = useAtomValue(selectDeviceAtom);
  const devices = useAtomValue(deviceListAtom);
  const setDeviceActions = useSetAtom(deviceActionsAtom);

  const selectDevice = useCallback(
    (device: Device | undefined) => {
      setDeviceActions({ type: 'select', payload: device });
    },
    [setDeviceActions]
  );

  const searchDevices = useCallback(async () => {
    selectDevice(undefined);
    if (!sdk) return alert(intl.formatMessage({ id: 'tip__sdk_not_ready' }));

    let foundDevices: Device[] = [];
    const useElectronBle = isElectronBleRuntime();
    if (Platform.OS === 'web' && !useElectronBle) {
      const accessResponse = await sdk.promptWebDeviceAccess();
      if (accessResponse.success && accessResponse.payload.device) {
        foundDevices = [accessResponse.payload.device as unknown as Device];
      }
    }

    // Keep already-authorized devices discoverable when the permission dialog is cancelled.
    if (foundDevices.length === 0) {
      const response = await sdk.searchDevices();
      if (response.success) {
        foundDevices = (response.payload as unknown as Device[]) ?? [];
      }
    }

    setDeviceActions({ type: 'setList', payload: foundDevices });

    if (Platform.OS === 'web' && !useElectronBle && foundDevices.length > 0) {
      selectDevice(foundDevices[0]);
    }
  }, [intl, sdk, selectDevice, setDeviceActions]);

  const deviceCancel = useCallback(() => {
    if (!sdk) return alert(intl.formatMessage({ id: 'tip__sdk_not_ready' }));

    sdk.cancel();
  }, [intl, sdk]);

  const handleRemoveSelected = useCallback(() => {
    setDeviceActions({ type: 'clear' });
  }, [setDeviceActions]);

  let transportLabel = 'Bluetooth';
  if (Platform.OS === 'web') {
    transportLabel = isElectronBleRuntime() ? 'Desktop BLE' : 'WebUSB';
  }

  useImperativeHandle(
    ref,
    () => ({
      searchDevices,
    }),
    [searchDevices]
  );

  const renderItem = ({ item }: { item: Device }) => {
    const connected = item.connectId === selectedDevice?.connectId;

    return (
      <Item
        item={item}
        onPress={() => {
          selectDevice(item);
        }}
        connected={connected}
      />
    );
  };

  return (
    <PanelView>
      {disableSaveDevice ? (
        <Text fontSize={16} fontWeight="bold">
          {intl.formatMessage({ id: 'message__search_device_and_connect_device' })}
        </Text>
      ) : (
        <View flexDirection="row" justifyContent="space-between" flexWrap="wrap">
          <Text fontSize={15}>
            {intl.formatMessage({ id: 'message__current_selector_device' })}
            {selectedDevice?.connectId || intl.formatMessage({ id: 'message__no_device' })}
          </Text>
          <XStack gap={4}>
            <Text>{transportLabel}</Text>
            <Button onPress={handleRemoveSelected}>
              {intl.formatMessage({ id: 'action__clean_device' })}
            </Button>
          </XStack>
        </View>
      )}
      <Stack flexDirection="row" gap="$2">
        <Button width="80%" disabled={!sdk} variant="primary" size="medium" onPress={searchDevices}>
          {intl.formatMessage({ id: 'action__search_device' })}
        </Button>
        <Button
          width="20%"
          disabled={!sdk}
          variant="secondary"
          size="medium"
          onPress={deviceCancel}
        >
          {intl.formatMessage({ id: 'action__cancel' })}
        </Button>
      </Stack>
      <FlatList
        data={devices}
        renderItem={renderItem}
        keyExtractor={item => item.connectId}
        extraData={selectedDevice?.connectId}
      />
    </PanelView>
  );
}

export const DeviceList = forwardRef<IDeviceListInstance, IDeviceListProps>(DeviceListFC);
