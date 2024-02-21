import { useCallback, useContext, useEffect, useState } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { H5, ListItem, Text, View } from 'tamagui';
import { FlatList, Platform } from 'react-native';
import { Check } from '@tamagui/lucide-icons';
import HardwareSDKContext from '../provider/HardwareSDKContext';
import { Button } from './ui/Button';
import PanelView from './ui/Panel';

export type Device = {
  connectId: string;
  name: string;
  features?: any;
  deviceType?: string;
};

const STORE_KEY = '@onekey/selectedId';
const storeSelectedId = async (value: string) => {
  try {
    await AsyncStorage.setItem(STORE_KEY, value);
  } catch (error) {
    console.log(error);
  }
};

const getSelectedId = async () => {
  try {
    const value = await AsyncStorage.getItem(STORE_KEY);
    if (value !== null) {
      return value;
    }
  } catch (error) {
    console.log(error);
  }
};

const removeSelectedId = async () => {
  try {
    await AsyncStorage.removeItem(STORE_KEY);
  } catch (e) {
    // remove error
  }
};

type ItemProps = {
  item: Device;
  onPress: () => void;
  connected: boolean;
};

const Item = ({ item, onPress, connected }: ItemProps) => (
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
    <Button onPress={onPress}>Connect</Button>
  </ListItem>
);

type IDeviceListProps = {
  onSelected: (device: Device) => void;
  disableSaveDevice?: boolean;
};

export function DeviceList({ onSelected, disableSaveDevice = false }: IDeviceListProps) {
  const { sdk } = useContext(HardwareSDKContext);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);

  useEffect(() => {
    if (disableSaveDevice) return;
    getSelectedId().then(value => {
      if (value) {
        setSelectedId(value);
        onSelected({ connectId: value } as Device);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectDevice = useCallback(
    (device: Device) => {
      setSelectedId(device.connectId);
      storeSelectedId(device.connectId);
      onSelected(device);
    },
    [onSelected]
  );

  const searchDevices = useCallback(async () => {
    if (!sdk) return console.log('sdk is not ready');

    const response = await sdk.searchDevices();
    console.log('example searchDevices response: ', response);
    const foundDevices = (response.payload as unknown as Device[]) ?? [];
    setDevices(foundDevices);
    if (Platform.OS === 'web' && foundDevices?.length) {
      const device = foundDevices[0];
      selectDevice(device);
    }
  }, [sdk, selectDevice]);

  const handleRemoveSelected = useCallback(() => {
    removeSelectedId();
    setSelectedId(null);
  }, []);

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
          搜索并连接设备
        </Text>
      ) : (
        <View flexDirection="row" justifyContent="space-between" flexWrap="wrap">
          <Text fontSize={15}>当前选择设备：{selectedId || '无'}</Text>
          <Button onPress={handleRemoveSelected}>清除</Button>
        </View>
      )}

      <Button variant="primary" size="large" onPress={searchDevices}>
        Search Devices
      </Button>
      <FlatList
        data={devices}
        renderItem={renderItem}
        keyExtractor={item => item.connectId}
        extraData={selectedId}
      />
    </PanelView>
  );
}
