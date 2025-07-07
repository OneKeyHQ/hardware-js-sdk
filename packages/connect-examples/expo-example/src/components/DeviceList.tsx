import {
  ForwardedRef,
  forwardRef,
  useCallback,
  useContext,
  useImperativeHandle,
  memo,
} from 'react';

import { ListItem, Stack, Text, View, XStack } from 'tamagui';
import { FlatList, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Check } from '@tamagui/lucide-icons';
import { useIntl } from 'react-intl';
import { getDefaultStore, useAtomValue, useSetAtom } from 'jotai';
import type { Features } from '@onekeyfe/hd-transport';
import { ONEKEY_WEBUSB_FILTER } from '@onekeyfe/hd-shared';
import HardwareSDKContext from '../provider/HardwareSDKContext';
import { Button } from './ui/Button';
import PanelView from './ui/Panel';
import { connectionTypeAtom, ConnectionType } from '../atoms/deviceConnectAtoms';
import { selectDeviceAtom, deviceListAtom, deviceActionsAtom } from '../atoms/deviceAtoms';

export type Device = {
  connectId: string;
  name: string;
  deviceId: string;
  bleName?: string;
  features?: Features;
  deviceType?: string;
};

type ItemProps = {
  item: Device;
  onPress: () => void;
  connected: boolean;
};

const Item = memo(({ item, onPress, connected }: ItemProps) => {
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
      <ListItem.Text>{item.connectId}</ListItem.Text>
      <Button onPress={onPress}>{intl.formatMessage({ id: 'action__connect_device' })}</Button>
    </ListItem>
  );
});

Item.displayName = 'Item';

type IDeviceListProps = {
  disableSaveDevice?: boolean;
};

export interface IDeviceListInstance {
  searchDevices: () => Promise<void> | void;
}

const DeviceFlatListFC = memo(() => {
  const selectedDevice = useAtomValue(selectDeviceAtom);
  const devices = useAtomValue(deviceListAtom);
  const setDeviceActions = useSetAtom(deviceActionsAtom);

  const renderItem = useCallback(
    // eslint-disable-next-line react/no-unused-prop-types
    ({ item }: { item: Device }) => {
      const connected = selectedDevice?.connectId === item.connectId;

      return (
        <Item
          item={item}
          onPress={() => {
            setDeviceActions({ type: 'select', payload: item });
          }}
          connected={connected}
        />
      );
    },
    [selectedDevice, setDeviceActions]
  );

  return <FlatList data={devices} renderItem={renderItem} keyExtractor={item => item.connectId} />;
});

DeviceFlatListFC.displayName = 'DeviceFlatListFC';

function DeviceCurrentDeviceFC() {
  const intl = useIntl();
  const selectedDevice = useAtomValue(selectDeviceAtom);

  return (
    <Text fontSize={15}>
      {intl.formatMessage({ id: 'message__current_selector_device' })}
      {selectedDevice?.connectId || intl.formatMessage({ id: 'message__no_device' })}
    </Text>
  );
}

function DeviceConnectionTypePickerFC() {
  const { sdk } = useContext(HardwareSDKContext);
  const connectionType = useAtomValue(connectionTypeAtom);
  const setConnectionType = useSetAtom(connectionTypeAtom);

  const onSwitchConnectionType = useCallback(
    async (value: ConnectionType) => {
      console.log('value:====>>>::: ', value);
      setConnectionType(value);
      // @ts-expect-error
      const res = await sdk?.switchTransport(value);
      console.log('switchTransport res:====>>>::: ', res);
    },
    [sdk, setConnectionType]
  );

  return (
    <Picker selectedValue={connectionType} onValueChange={onSwitchConnectionType}>
      <Picker.Item label="OneKey Bridge" value="bridge" />
      <Picker.Item label="WebUSB" value="webusb" />
    </Picker>
  );
}

function DeviceListFC(
  { disableSaveDevice = false }: IDeviceListProps,
  ref: ForwardedRef<IDeviceListInstance>
) {
  const intl = useIntl();
  const { sdk } = useContext(HardwareSDKContext);
  const setDeviceActions = useSetAtom(deviceActionsAtom);

  const selectDevice = useCallback(
    (device: Device | undefined) => {
      setDeviceActions({ type: 'select', payload: device || undefined });
    },
    [setDeviceActions]
  );

  const searchDevices = useCallback(async () => {
    selectDevice(undefined);
    if (!sdk) return alert(intl.formatMessage({ id: 'tip__sdk_not_ready' }));
    const connectionType = getDefaultStore().get(connectionTypeAtom);
    // @ts-expect-error
    await sdk?.switchTransport(connectionType);
    if (connectionType === 'webusb') {
      const connectedDevice = await window.navigator.usb.requestDevice({
        filters: ONEKEY_WEBUSB_FILTER,
      });
      if (!connectedDevice) {
        throw new Error('No device selected');
      }
    }
    const response = await sdk.searchDevices();

    const foundDevices = (response.payload as unknown as Device[]) ?? [];
    setDeviceActions({ type: 'setList', payload: foundDevices });

    if (Platform.OS === 'web' && foundDevices?.length) {
      const device = foundDevices[0];
      selectDevice(device);
    }
  }, [intl, sdk, selectDevice, setDeviceActions]);

  const deviceCancel = useCallback(() => {
    if (!sdk) return alert(intl.formatMessage({ id: 'tip__sdk_not_ready' }));

    sdk.cancel();
  }, [intl, sdk]);

  const handleRemoveSelected = useCallback(() => {
    setDeviceActions({ type: 'clear' });
  }, [setDeviceActions]);

  useImperativeHandle(
    ref,
    () => ({
      searchDevices,
    }),
    [searchDevices]
  );

  return (
    <PanelView>
      {disableSaveDevice ? (
        <Text fontSize={16} fontWeight="bold">
          {intl.formatMessage({ id: 'message__search_device_and_connect_device' })}
        </Text>
      ) : (
        <View flexDirection="row" justifyContent="space-between" flexWrap="wrap">
          <DeviceCurrentDeviceFC />
          <XStack gap={4}>
            <DeviceConnectionTypePickerFC />
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
      <DeviceFlatListFC />
    </PanelView>
  );
}

export const DeviceList = forwardRef<IDeviceListInstance, IDeviceListProps>(DeviceListFC);
