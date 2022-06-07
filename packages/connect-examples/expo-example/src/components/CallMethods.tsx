import { View, Button, StyleSheet } from 'react-native';
import type { Device } from './DeviceList';

type ICallMethodProps = {
  SDK: any;
  selectedDevice: Device | null;
  setDevices: (devices: Device[]) => void;
};
export function CallMethods({ SDK, selectedDevice, setDevices }: ICallMethodProps) {
  const handleSearchDevices = async () => {
    const response = await SDK.searchDevices();
    console.log('example searchDevices response: ', response);
    setDevices(response.payload ?? []);
  };

  const handleGetFeatures = async () => {
    const response = await SDK.getFeatures({ connectId: selectedDevice?.connectId });
    console.log('example getFeatures response: ', response);
  };

  const handleCheckFirmwareRelease = async () => {
    const response = await SDK.checkFirmwareRelease({
      connectId: selectedDevice?.connectId,
    });
    console.log('example checkFirmwareRelease response: ', response);
  };

  const handleCheckBLEFirmwareRelease = async () => {
    const response = await SDK.checkBLEFirmwareRelease({
      connectId: selectedDevice?.connectId,
    });
    console.log('example checkBLEFirmwareRelease response: ', response);
  };

  const handleCheckTransportRelease = async () => {
    const response = await SDK.checkTransportRelease();
    console.log('example checkTransportRelease response: ', response);
  };

  return (
    <View style={styles.buttonContainer}>
      <Button title="search devices" onPress={() => handleSearchDevices()} />
      <Button title="get Features" onPress={() => handleGetFeatures()} />
      <Button title="check firmware release" onPress={() => handleCheckFirmwareRelease()} />
      <Button title="check ble firmware release" onPress={() => handleCheckBLEFirmwareRelease()} />
      <Button title="check transport release" onPress={() => handleCheckTransportRelease()} />
    </View>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    padding: 12,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
});
