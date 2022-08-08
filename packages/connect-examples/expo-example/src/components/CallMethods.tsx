import { useEffect, useState } from 'react';
import { View, Button, StyleSheet, Platform, Switch, Text, TextInput } from 'react-native';
import RNRestart from 'react-native-restart';
import {
  UI_EVENT,
  UI_REQUEST,
  CoreMessage,
  UI_RESPONSE,
  CoreApi,
  LOG_EVENT,
  FIRMWARE_EVENT,
  DEVICE,
  CommonParams,
} from '@onekeyfe/hd-core';
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
  type: 'Bluetooth' | 'USB';
};
export function CallMethods({ SDK, type }: ICallMethodProps) {
  const [showPinInput, setShowPinInput] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedFile, setSelectedFile] = useState<Uint8Array>();
  const [firmwareType, setFirmwareType] = useState<boolean>(false);

  const [optionalParams, setOptionalParams] = useState<CommonParams>();

  useEffect(() => {
    // 监听 SDK 事件
    if (registerListener) {
      return;
    }
    SDK.on(UI_EVENT, (message: CoreMessage) => {
      if (message.type === UI_REQUEST.REQUEST_PIN) {
        SDK.uiResponse({
          type: UI_RESPONSE.RECEIVE_PIN,
          payload: '@@ONEKEY_INPUT_PIN_IN_DEVICE',
        });
      }
    });

    // SDK.on(LOG_EVENT, (message: CoreMessage) => {
    //   if (Array.isArray(message.payload)) {
    //     const msg = message.payload.join(' ');
    //     console.log('receive log event: ', msg);
    //   }
    // });

    SDK.on(FIRMWARE_EVENT, (message: CoreMessage) => {
      console.log('example get firmware event: ', message);
    });

    SDK.on(DEVICE.FEATURES, (message: CoreMessage) => {
      console.log('example get features event: ', message);
    });

    SDK.on(DEVICE.CONNECT, (message: CoreMessage) => {
      console.log('example get connect event: ', message);
    });

    SDK.on(DEVICE.DISCONNECT, (message: CoreMessage) => {
      console.log('example get disconnect event: ', message);
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
    if (response.success) {
      setSelectedDevice({ ...selectedDevice, features: response.payload } as Device);
    }
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

  const handleCheckBridgeStatus = async () => {
    const response = await SDK.checkBridgeStatus();
    console.log('example checkBridgeStatus response: ', response);
  };

  const handleFirmwareUpdate = async (file?: Uint8Array) => {
    const params: any = { updateType: firmwareType ? 'firmware' : 'ble' };
    if (file) {
      params.binary = file;
    }
    const response = await SDK.firmwareUpdate(
      type === 'Bluetooth' ? selectedDevice?.connectId : undefined,
      params
    );
    console.log('example firmwareUpdate response: ', response);
  };

  const onFileChange = (e: any) => {
    const file = e.target.files?.[0];
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = function () {
      const arrayBuffer = reader.result;
      const array = new Uint8Array(arrayBuffer as ArrayBuffer);
      setSelectedFile(array);
    };
  };

  const cancel = () => {
    SDK.cancel(selectedDevice?.connectId);
  };

  const handleGetLogs = async () => {
    const res = await SDK.getLogs();
    console.log('example getLogs response: ', res);
  };

  const handleRequestWebUsbDevice = async () => {
    const res = await SDK.requestWebUsbDevice();
    console.log('example requestWebUsbDevice response: ', res);
  };

  return (
    <View>
      <View style={styles.container}>
        <View style={styles.buttonContainer}>
          <Button title="search devices" onPress={() => handleSearchDevices()} />
          <Button title="get Features" onPress={() => handleGetFeatures()} />
          <Button title="check firmware release" onPress={() => handleCheckFirmwareRelease()} />
          <Button
            title="check ble firmware release"
            onPress={() => handleCheckBLEFirmwareRelease()}
          />
          <Button title="check transport release" onPress={() => handleCheckTransportRelease()} />
          <Button title="check bridge status" onPress={() => handleCheckBridgeStatus()} />
          <Button title="cancel" onPress={() => cancel()} />
          <Button title="reset" onPress={() => RNRestart.Restart()} />
          <Button title="getLogs" onPress={() => handleGetLogs()} />
          <Button title="requestWebUsbDevice" onPress={() => handleRequestWebUsbDevice()} />
        </View>
        {showPinInput && (
          <ReceivePin
            value={pinValue}
            onChange={val => setPinValue(val)}
            onConfirm={val => onConfirmPin(val)}
          />
        )}

        <View style={styles.buttonContainer}>
          <View>
            <Text>升级固件类型：{firmwareType ? 'firmware' : 'ble'}</Text>
            <Switch onValueChange={() => setFirmwareType(!firmwareType)} value={firmwareType} />
          </View>
          <Button title="firmware update" onPress={() => handleFirmwareUpdate()} />
          <Button
            title="firmware update with local file"
            onPress={() => handleFirmwareUpdate(selectedFile)}
          />
          {Platform.OS === 'web' ? <input type="file" onChange={onFileChange} /> : null}
        </View>

        <DeviceList data={devices} onSelected={device => setSelectedDevice(device)} />
      </View>

      <View style={styles.container}>
        <h3>Common Parameters</h3>
        <View style={{ flexDirection: 'row' }}>
          <View style={styles.commonParamItem}>
            <Text>保持 Session</Text>
            <Switch
              value={!!optionalParams?.keepSession}
              onValueChange={v => setOptionalParams({ ...optionalParams, keepSession: v })}
            />
          </View>
          <View style={styles.commonParamItem}>
            <Text>重试次数</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={optionalParams?.retryCount?.toString() ?? ''}
              onChangeText={v => {
                const newText = v.replace(/[^\d]+/, '');
                setOptionalParams({ ...optionalParams, retryCount: parseInt(newText) });
              }}
            />
          </View>
          <View style={styles.commonParamItem}>
            <Text>重试间隔时长</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={optionalParams?.pollIntervalTime?.toString() ?? ''}
              onChangeText={v => {
                const newText = v.replace(/[^\d]+/, '');
                setOptionalParams({ ...optionalParams, pollIntervalTime: parseInt(newText) });
              }}
            />
          </View>
          <View style={styles.commonParamItem}>
            <Text>连接超时事件</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={optionalParams?.timeout?.toString() ?? ''}
              onChangeText={v => {
                const newText = v.replace(/[^\d]+/, '');
                setOptionalParams({ ...optionalParams, timeout: parseInt(newText) });
              }}
            />
          </View>
        </View>
      </View>

      <CallEVMMethods SDK={SDK} selectedDevice={selectedDevice} commonParams={optionalParams} />
      <CallBTCMethods SDK={SDK} selectedDevice={selectedDevice} />
      <CallDeviceMethods SDK={SDK} selectedDevice={selectedDevice} />
      <CallOtherMethods SDK={SDK} selectedDevice={selectedDevice} />
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
  container: {
    flexDirection: 'column',
    borderRadius: 12,
    borderColor: '#cccccc',
    borderWidth: 1,
    overflow: 'hidden',
    margin: 12,
    padding: 12,
    height: 'auto',
  },
  commonParamItem: {
    flexDirection: 'column',
    paddingStart: 12,
    paddingEnd: 12,
  },
  input: {
    height: 35,
    borderWidth: 1,
    padding: 4,
  },
});
