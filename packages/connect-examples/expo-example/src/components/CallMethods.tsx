import { useEffect, useState } from 'react';
import { View, Button, StyleSheet } from 'react-native';
import { UI_EVENT, UI_REQUEST, CoreMessage, UI_RESPONSE, CoreApi } from '@onekeyfe/hd-core';
import { ReceivePin } from './ReceivePin';
import { Device, DeviceList } from './DeviceList';
import { CallEVMMethods } from './CallEVMMethods';
import { CallBTCMethods } from './CallBTCMethods';
import { CallDeviceMethods } from './CallDeviceMethods';
import { CallStarcoinMethods } from './CallStarcoinMethods';
import { CallNEMMethods } from './CallNEMMethods';
import { CallSolanaMethods } from './CallSolanaMethods';
import { CallStellarMethods } from './CallStellarMethods';
import { CallOtherMethods } from './CallOtherMethods';

let registerListener = false;

type ICallMethodProps = {
  SDK: CoreApi;
};
export function CallMethods({ SDK }: ICallMethodProps) {
  const [showPinInput, setShowPinInput] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  useEffect(() => {
    // 监听 SDK 事件
    if (registerListener) {
      return;
    }
    SDK.on(UI_EVENT, (message: CoreMessage) => {
      console.log(message);

      if (message.type === UI_REQUEST.REQUEST_PIN) {
        setShowPinInput(true);
      }
    });
    registerListener = true;
  }, [SDK]);

  // 输入 pin 码的确认回调
  function onConfirmPin(payload: string) {
    SDK.uiResponse({ type: UI_RESPONSE.RECEIVE_PIN, payload });
    setShowPinInput(false);
  }

  // 取消输入 pin 码
  function onPinCancel() {
    SDK.cancel('pin-cancelled');
  }

  const handleSearchDevices = async () => {
    const response = await SDK.searchDevices();
    console.log('example searchDevices response: ', response);
    setDevices((response.payload as unknown as Device[]) ?? []);
  };

  const handleGetFeatures = async () => {
    const response = await SDK.getFeatures(selectedDevice?.connectId);
    console.log('example getFeatures response: ', response);
  };

  const handleCheckFirmwareRelease = async () => {
    const response = await SDK.checkFirmwareRelease(selectedDevice?.connectId);
    console.log('example checkFirmwareRelease response: ', response);
  };

  const handleCheckBLEFirmwareRelease = async () => {
    const response = await SDK.checkBLEFirmwareRelease(selectedDevice?.connectId);
    console.log('example checkBLEFirmwareRelease response: ', response);
  };

  const handleCheckTransportRelease = async () => {
    const response = await SDK.checkTransportRelease();
    console.log('example checkTransportRelease response: ', response);
  };

  return (
    <View>
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
      {showPinInput && (
        <ReceivePin
          value={pinValue}
          onChange={val => setPinValue(val)}
          onConfirm={val => onConfirmPin(val)}
        />
      )}
      <DeviceList data={devices} onSelected={device => setSelectedDevice(device)} />
      <CallDeviceMethods SDK={SDK} selectedDevice={selectedDevice} />
      <CallOtherMethods SDK={SDK} selectedDevice={selectedDevice} />
      <CallEVMMethods SDK={SDK} selectedDevice={selectedDevice} />
      <CallBTCMethods SDK={SDK} selectedDevice={selectedDevice} />
      <CallStarcoinMethods SDK={SDK} selectedDevice={selectedDevice} />
      <CallNEMMethods SDK={SDK} selectedDevice={selectedDevice} />
      <CallSolanaMethods SDK={SDK} selectedDevice={selectedDevice} />
      <CallStellarMethods SDK={SDK} selectedDevice={selectedDevice} />
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
