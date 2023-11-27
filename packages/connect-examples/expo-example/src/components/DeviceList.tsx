import { useCallback, useContext, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Button, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HardwareSDKContext from '../provider/HardwareSDKContext';

export type Device = {
  connectId: string;
  name: string;
  features?: any;
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
  backgroundColor: { backgroundColor: string };
  textColor: { color: string };
};

const Item = ({ item, onPress, backgroundColor, textColor }: ItemProps) => (
  <TouchableOpacity onPress={onPress} style={[styles.item, backgroundColor]}>
    <Text style={[styles.title, textColor]}>{item.name}</Text>
  </TouchableOpacity>
);

type IDeviceListProps = {
  onSelected: (device: Device) => void;
};

export function DeviceList({ onSelected }: IDeviceListProps) {
  const { sdk } = useContext(HardwareSDKContext);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);

  useEffect(() => {
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
    const backgroundColor = item.connectId === selectedId ? '#6e3b6e' : '#f9c2ff';
    const color = item.connectId === selectedId ? 'white' : 'black';

    return (
      <Item
        item={item}
        onPress={() => {
          selectDevice(item);
        }}
        backgroundColor={{ backgroundColor }}
        textColor={{ color }}
      />
    );
  };

  return (
    <View style={styles.container}>
      <Button title="Search Devices" onPress={searchDevices} />
      <View style={styles.selectWrap}>
        <Text>当前选择设备：{selectedId || '无'}</Text>
        <Button title="清除" onPress={handleRemoveSelected} />
      </View>
      <FlatList
        data={devices}
        renderItem={renderItem}
        keyExtractor={item => item.connectId}
        extraData={selectedId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
  },
  item: {
    backgroundColor: '#f9c2ff',
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  title: {
    fontSize: 16,
  },
  selectWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
  },
});
