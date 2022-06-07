import HardwareWebSdk from '@onekeyfe/hd-web-sdk';
import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { DeviceList } from '../../components/DeviceList';
import type { Device } from '../../components/DeviceList';

let isSdkInit = false;

export default function USB() {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  const sdkInit = () => {
    const settings = {
      debug: true,
      connectSrc: 'https://localhost:8088/',
    };
    HardwareWebSdk.init(settings);
  };

  useEffect(() => {
    if (!isSdkInit) {
      sdkInit();
    }
    isSdkInit = true;
  }, []);

  const handleSearchDevices = async () => {
    const response = await HardwareWebSdk.searchDevices();
    console.log('example searchDevices response: ', response);
    setDevices(response.payload ?? []);
  };

  const handleGetFeatures = async () => {
    const response = await HardwareWebSdk.getFeatures({ connectId: selectedDevice?.connectId });
    console.log('example getFeatures response: ', response);
  };

  const handleCheckFirmwareRelease = async () => {
    const response = await HardwareWebSdk.checkFirmwareRelease({
      connectId: selectedDevice?.connectId,
    });
    console.log('example checkFirmwareRelease response: ', response);
  };

  const handleCheckBLEFirmwareRelease = async () => {
    const response = await HardwareWebSdk.checkBLEFirmwareRelease({
      connectId: selectedDevice?.connectId,
    });
    console.log('example checkBLEFirmwareRelease response: ', response);
  };

  const handleCheckTransportRelease = async () => {
    const response = await HardwareWebSdk.checkTransportRelease();
    console.log('example checkTransportRelease response: ', response);
  };

  return (
    <View>
      <Text>This is USB example page, will run on desktop browser. </Text>
      <View style={styles.buttonContainer}>
        <Button title="search devices" onPress={() => handleSearchDevices()} />
        <Button title="get Features" onPress={() => handleGetFeatures()} />
        <Button title="check firmware release" onPress={() => handleCheckFirmwareRelease()} />
        <Button
          title="check ble firmware release"
          onPress={() => handleCheckBLEFirmwareRelease()}
        />
        <Button title="check transport release" onPress={() => handleCheckTransportRelease()} />
      </View>
      <DeviceList data={devices} onSelected={device => setSelectedDevice(device)} />
    </View>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    padding: '12px',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
  },
});
