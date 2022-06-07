import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
} from 'react-native';

export type Device = {
  uuid: string;
  connectId: string;
};

type ItemProps = {
  item: Device;
  onPress: () => void;
  backgroundColor: { backgroundColor: string };
  textColor: { color: string };
};

const Item = ({ item, onPress, backgroundColor, textColor }: ItemProps) => (
  <TouchableOpacity onPress={onPress} style={[styles.item, backgroundColor]}>
    <Text style={[styles.title, textColor]}>{item.uuid}</Text>
  </TouchableOpacity>
);

type IDeviceListProps = {
  data: Device[];
  onSelected: (device: Device) => void;
};

export function DeviceList({ data, onSelected }: IDeviceListProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const renderItem = ({ item }: { item: Device }) => {
    const backgroundColor = item.uuid === selectedId ? '#6e3b6e' : '#f9c2ff';
    const color = item.uuid === selectedId ? 'white' : 'black';

    return (
      <Item
        item={item}
        onPress={() => {
          setSelectedId(item.uuid);
          onSelected(item);
        }}
        backgroundColor={{ backgroundColor }}
        textColor={{ color }}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={item => item.uuid}
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
});
