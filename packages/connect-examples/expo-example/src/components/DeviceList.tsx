import { ForwardedRef, forwardRef, useCallback, useContext, useEffect, useImperativeHandle } from 'react';

import { ListItem, Stack, Text, View, XStack } from 'tamagui';
import { FlatList, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Check } from '@tamagui/lucide-icons';
import { useIntl } from 'react-intl';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import type { Features } from '@onekeyfe/hd-transport';
import HardwareSDKContext from '../provider/HardwareSDKContext';
import { Button } from './ui/Button';
import PanelView from './ui/Panel';
import { getItem, setItem } from '../utils/storeUtil';
import { connectionTypeAtom, ConnectionType } from '../atoms/deviceConnectAtoms';
import { selectDeviceAtom, deviceListAtom, deviceActionsAtom } from '../atoms/deviceAtoms';

export type Device = {
  connectId: string;
  name: string;
  features?: Features;
  deviceType?: string;
};

const CONNECTION_TYPE_STORE_KEY = '@onekey/connectionType';

const storeConnectionType = async (value: ConnectionType) => {
  try {
    await setItem(CONNECTION_TYPE_STORE_KEY, value);
  } catch (error) {
    console.log('Error storing connection type:', error);
  }
};

const getStoredConnectionType = async (): Promise<ConnectionType | null> => {
  try {
    const value = await getItem(CONNECTION_TYPE_STORE_KEY);
    return value as ConnectionType | null;
  } catch (error) {
    console.log('Error getting stored connection type:', error);
    return null;
  }
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
  const [connectionType, setConnectionType] = useAtom(connectionTypeAtom);

  // Initialize connection type from storage on mount
  useEffect(() => {
    getStoredConnectionType().then(storedType => {
      if (storedType) {
        setConnectionType(storedType);
      }
    });
  }, [setConnectionType]);

  const selectDevice = useCallback(
    (device: Device | undefined) => {
      setDeviceActions({ type: 'select', payload: device });
    },
    [setDeviceActions]
  );

  const searchDevices = useCallback(async () => {
    selectDevice(undefined);
    if (!sdk) return alert(intl.formatMessage({ id: 'tip__sdk_not_ready' }));

    let response;
    if (connectionType === 'webusb') {
      const promptResponse = await sdk.promptWebDeviceAccess();
      response = promptResponse.success
        ? { payload: [promptResponse.payload.device] }
        : { payload: [] };
    } else {
      response = await sdk.searchDevices();
    }
    const foundDevices = (response.payload as unknown as Device[]) ?? [];
    setDeviceActions({ type: 'setList', payload: foundDevices });
    if (Platform.OS === 'web' && foundDevices?.length) {
      const device = foundDevices[0];
      selectDevice(device);
    }
  }, [intl, sdk, selectDevice, connectionType, setDeviceActions]);

  const deviceCancel = useCallback(() => {
    if (!sdk) return alert(intl.formatMessage({ id: 'tip__sdk_not_ready' }));

    sdk.cancel();
  }, [intl, sdk]);

  const handleRemoveSelected = useCallback(() => {
    setDeviceActions({ type: 'clear' });
  }, [setDeviceActions]);

  const onSwitchConnectionType = useCallback(
    async (value: ConnectionType) => {
      if (value === connectionType) return;

      const previousConnectionType = connectionType;

      try {
        // Update connection type and persist manually
        setConnectionType(value);
        await storeConnectionType(value);

        // Restart desktop client when switching between desktop-web-ble and other modes
        const needsRestart =
          Platform.OS === 'web' &&
          (previousConnectionType === 'desktop-web-ble' || value === 'desktop-web-ble') &&
          previousConnectionType !== value;

        // @ts-expect-error
        if (needsRestart && window.desktopApi?.restart) {
          // @ts-expect-error
          window.desktopApi.restart();
          return; // Exit early as the app will restart
        }

        // @ts-expect-error
        const res = await sdk?.switchTransport(value);
        console.log('switchTransport res:====>>>::: ', res);

        // Clear device list when switching connection type
        setDeviceActions({ type: 'setList', payload: [] });
        selectDevice(undefined);
      } catch (error) {
        console.error('Failed to switch connection type:', error);
        // Rollback on error and persist the rollback
        setConnectionType(previousConnectionType);
        await storeConnectionType(previousConnectionType);
        alert(
          intl.formatMessage({ id: 'tip__switch_connection_type_failed' }) ||
            'Failed to switch connection type'
        );
      }
    },
    [sdk, setConnectionType, connectionType, intl, selectDevice, setDeviceActions]
  );

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
            <Picker selectedValue={connectionType} onValueChange={onSwitchConnectionType}>
              <Picker.Item label="OneKey Bridge" value="bridge" />
              <Picker.Item label="WebUSB" value="webusb" />
              <Picker.Item label="Desktop Web BLE" value="desktop-web-ble" />
            </Picker>
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
