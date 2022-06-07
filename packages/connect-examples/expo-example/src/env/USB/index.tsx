import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { DeviceList } from '../../components/DeviceList';

const DATA = [
  {
    uuid: 'bd7acbea-c1b1-46c2-aed5-3ad53abb28ba',
  },
  {
    uuid: '3ac68afc-c605-48d3-a4f8-fbd91aa97f63',
  },
  {
    uuid: '58694a0f-3da1-471f-bd96-145571e29d72',
  },
];

export default function USB() {
  const [devices, setDevices] = useState(DATA);
  return (
    <View>
      <Text>This is USB example page, will run on desktop browser. </Text>
      <DeviceList data={devices} />
    </View>
  );
}
