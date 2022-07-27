import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Button,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  data: Device[];
  onSelected: (device: Device) => void;
};

export function DeviceList({ data, onSelected }: IDeviceListProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    getSelectedId().then(value => {
      if (value) {
        setSelectedId(value);
        onSelected({ connectId: value } as Device);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderItem = ({ item }: { item: Device }) => {
    const backgroundColor = item.connectId === selectedId ? '#6e3b6e' : '#f9c2ff';
    const color = item.connectId === selectedId ? 'white' : 'black';

    return (
      <Item
        item={item}
        onPress={() => {
          setSelectedId(item.connectId);
          storeSelectedId(item.connectId);
          onSelected(item);
        }}
        backgroundColor={{ backgroundColor }}
        textColor={{ color }}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.seleteWrap}>
        <Text>当前选择设备：{selectedId}</Text>
        <Button title="清除" onPress={() => removeSelectedId()} />
      </View>
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={item => item.connectId}
        extraData={selectedId}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: StatusBar.currentHeight || 0,
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
  seleteWrap: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
});
