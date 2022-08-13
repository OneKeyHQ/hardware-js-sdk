import { KnownDevice } from '@onekeyfe/hd-core';
import { useState } from 'react';
import { View, Button, Text } from 'react-native';
import deviceUtils from '../utils/deviceUtils';
import * as HidUtils from '../utils/hidDemo';

export default function MockConnect() {
  const [devices, setDevices] = useState<KnownDevice[]>([]);
  const [device, setDevice] = useState<KnownDevice | null>(null);
  function getDeviceLists() {
    deviceUtils.startDeviceScan(res => {
      if (res.success) {
        setDevices(res.payload as KnownDevice[]);
      } else {
        setDevices([]);
      }
    });
  }

  function connect(device: KnownDevice) {
    deviceUtils.stopScan();
    try {
      deviceUtils.ensureConnected(device.connectId ?? '');
    } catch (err) {
      console.log(err);
    }
  }

  return (
    <View>
      <Button title="scan" onPress={() => getDeviceLists()} />
      <Text>设备列表</Text>
      {devices.map(d => (
        <Button key={d.connectId} title={d.connectId ?? ''} onPress={() => connect(d)} />
      ))}

      <Text>HID</Text>
      <Button title="getDevices" onPress={() => HidUtils.getDevices()} />
      <Button title="requestDevice" onPress={() => HidUtils.requestDevice()} />
      <Button title="open" onPress={() => HidUtils.open()} />
      <Button title="send" onPress={() => HidUtils.send()} />
    </View>
  );
}
