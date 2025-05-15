import {
  ForwardedRef,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';

import { ListItem, Stack, Text, View, XStack } from 'tamagui';
import { FlatList, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Check } from '@tamagui/lucide-icons';
import { useIntl } from 'react-intl';
import { useAtom } from 'jotai';
import type { Features } from '@onekeyfe/hd-transport';
import HardwareSDKContext from '../provider/HardwareSDKContext';
import { Button } from './ui/Button';
import PanelView from './ui/Panel';
import { getItem, removeItem, setItem } from '../utils/storeUtil';
import { connectionTypeAtom, ConnectionType } from '../atoms/deviceConnectAtoms';

export type Device = {
  connectId: string;
  name: string;
  features?: Features;
  deviceType?: string;
};

const STORE_KEY = '@onekey/selectedDevice';
const storeSelectedDevice = async (value: Device | undefined) => {
  try {
    if (value) {
      await setItem(STORE_KEY, JSON.stringify(value));
    }
  } catch (error) {
    console.log(error);
  }
};

const getSelectedDevice = async () => {
  try {
    const value = await getItem(STORE_KEY);
    if (value !== null) {
      return JSON.parse(value) as Device;
    }
  } catch (error) {
    console.log(error);
  }
};

const removeSelectedId = async () => {
  try {
    await removeItem(STORE_KEY);
  } catch (e) {
    // remove error
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
  onSelected: (device: Device | undefined) => void;
  disableSaveDevice?: boolean;
};
export interface IDeviceListInstance {
  searchDevices: () => Promise<void> | void;
}

function DeviceListFC(
  { onSelected, disableSaveDevice = false }: IDeviceListProps,
  ref: ForwardedRef<IDeviceListInstance>
) {
  const intl = useIntl();
  const { sdk } = useContext(HardwareSDKContext);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [connectionType, setConnectionType] = useAtom(connectionTypeAtom);

  useEffect(() => {
    if (disableSaveDevice) return;
    getSelectedDevice().then(value => {
      if (value) {
        setSelectedId(value.connectId);
        onSelected(value);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectDevice = useCallback(
    (device: Device | undefined) => {
      setSelectedId(device?.connectId ?? '');
      storeSelectedDevice(device);
      onSelected(device);
    },
    [onSelected]
  );

  const searchDevices = useCallback(async () => {
    selectDevice(undefined);
    if (!sdk) return alert(intl.formatMessage({ id: 'tip__sdk_not_ready' }));

    let response;
    if (connectionType === 'webusb') {
      const promptResponse = await sdk.promptWebDeviceAccess();
      console.log('promptResponse:====>>>::: ', promptResponse);
      response = promptResponse.success
        ? { payload: [promptResponse.payload.device] }
        : { payload: [] };
    } else {
      response = await sdk.searchDevices();
    }
    const foundDevices = (response.payload as unknown as Device[]) ?? [];
    setDevices(foundDevices);
    if (Platform.OS === 'web' && foundDevices?.length) {
      const device = foundDevices[0];
      selectDevice(device);
    }
  }, [intl, sdk, selectDevice, connectionType]);

  const deviceCancel = useCallback(() => {
    if (!sdk) return alert(intl.formatMessage({ id: 'tip__sdk_not_ready' }));

    sdk.cancel();
  }, [intl, sdk]);

  const handleRemoveSelected = useCallback(() => {
    removeSelectedId();
    setSelectedId(null);
  }, []);

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

  useImperativeHandle(
    ref,
    () => ({
      searchDevices,
    }),
    [searchDevices]
  );

  const renderItem = ({ item }: { item: Device }) => {
    const connected = item.connectId === selectedId;

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
            {selectedId || intl.formatMessage({ id: 'message__no_device' })}
          </Text>
          <XStack gap={4}>
            <Picker selectedValue={connectionType} onValueChange={onSwitchConnectionType}>
              <Picker.Item label="OneKey Bridge" value="bridge" />
              <Picker.Item label="WebUSB" value="webusb" />
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
        extraData={selectedId}
      />
    </PanelView>
  );
}

export const DeviceList = forwardRef<IDeviceListInstance, IDeviceListProps>(DeviceListFC);
