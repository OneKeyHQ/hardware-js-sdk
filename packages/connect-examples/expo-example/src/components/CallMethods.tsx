import { useEffect, useState } from 'react';
import { View, Button, StyleSheet, Platform, Switch, Text, TextInput } from 'react-native';
import RNRestart from 'react-native-restart';
import {
  UI_EVENT,
  UI_REQUEST,
  CoreMessage,
  UI_RESPONSE,
  CoreApi,
  FIRMWARE_EVENT,
  DEVICE,
  CommonParams,
  KnownDevice,
  LowLevelCoreApi,
} from '@onekeyfe/hd-core';

import { ReceivePin } from './ReceivePin';
import { Device, DeviceList } from './DeviceList';
import { UploadScreen } from './UploadScreen/index';
import { CallEVMMethods } from './CallEVMMethods';
import { CallBTCMethods } from './CallBTCMethods';
import { CallDeviceMethods } from './CallDeviceMethods';
import { CallStarcoinMethods } from './CallStarcoinMethods';
import { CallNEMMethods } from './CallNEMMethods';
import { CallSolanaMethods } from './CallSolanaMethods';
import { CallStellarMethods } from './CallStellarMethods';
import { CallOtherMethods } from './CallOtherMethods';
import { CallTronMethods } from './CallTronMethods';
import { CallConfluxMethods } from './CallConfluxMethods';
import { CallNearMethods } from './CallNearMethods';
import { CallAptosMethods } from './CallAptosMethods';
import { CallAlgoMethods } from './CallAlgoMethods';
import { CallCosmosMethods } from './CallCosmosMethods';
import { CallXrpMethods } from './CallXrpMethods';
import { CallSuiMethods } from './CallSuiMethods';
import { CallCardanoMethods } from './CallCardanoMethods';
import { CallFilecoinMethods } from './CallFilecoinMethods';
import { CallPolkadotMethods } from './CallPolkadotMethods';
import { CallKaspaMethods } from './CallKaspaMethods';

let registerListener = false;

export type ICallMethodProps = {
  HardwareLowLevelSDK?: LowLevelCoreApi;
  SDK: CoreApi;
  type: 'Bluetooth' | 'USB';
};
export function CallMethods({ HardwareLowLevelSDK, SDK, type }: ICallMethodProps) {
  const [showPinInput, setShowPinInput] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedFile, setSelectedFile] = useState<Uint8Array>();
  const [firmwareType, setFirmwareType] = useState<boolean>(true);

  const [optionalParams, setOptionalParams] = useState<CommonParams>();
  const [uploadScreenParams, setUploadScreenParams] = useState<{
    suffix?: string;
    file?: File;
    resType?: number;
    nftMetaData?: string;
  }>({
    resType: 0,
  });

  useEffect(() => {
    // 监听 SDK 事件
    if (registerListener) {
      return;
    }

    HardwareLowLevelSDK?.addHardwareGlobalEventListener(params => {
      SDK.emit?.(params.event, { ...params });
    });

    SDK.on(UI_EVENT, (message: CoreMessage) => {
      console.log('TopLEVEL EVENT ===>>>>: ', message);
      if (message.type === UI_REQUEST.REQUEST_PIN) {
        // setShowPinInput(true);
        SDK.uiResponse({
          type: UI_RESPONSE.RECEIVE_PIN,
          payload: '@@ONEKEY_INPUT_PIN_IN_DEVICE',
        });
      }
      if (message.type === UI_REQUEST.REQUEST_PASSPHRASE) {
        setTimeout(() => {
          SDK.uiResponse({
            type: UI_RESPONSE.RECEIVE_PASSPHRASE,
            payload: {
              value: '',
              passphraseOnDevice: true,
              save: false,
            },
          });
        }, 2000);
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
  }, [SDK, HardwareLowLevelSDK]);

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

  const handleCheckBridgeRelease = async () => {
    const response = await SDK.checkBridgeRelease(selectedDevice?.connectId, {
      willUpdateFirmwareVersion: '4.2.0',
    });
    console.log('example checkBridgeRelease response: ', response);
  };

  const handleCheckBootloaderRelease = async () => {
    const response = await SDK.checkBootloaderRelease(selectedDevice?.connectId, {
      willUpdateFirmwareVersion: '3.0.0',
    });
    console.log('example checkBootloader response: ', response);
  };

  const handleUpdateBootloader = async () => {
    const response = await SDK.deviceUpdateBootloader(selectedDevice?.connectId ?? '');
    console.log('example deviceUpdateBootloader response: ', response);
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

  const handleFirmwareUpdateV2 = async () => {
    const params: any = {
      updateType: firmwareType ? 'firmware' : 'ble',
      // version: [4, 2, 0],
      platform: 'web',
      forcedUpdateRes: false,
    };

    if (selectedFile) {
      params.binary = selectedFile;
    }
    const response = await SDK.firmwareUpdateV2(
      type === 'Bluetooth' ? selectedDevice?.connectId : undefined,
      params
    );
    console.log('example firmwareUpdate response: ', response);
  };

  const onFileChange = (
    e: any,
    callback: (data: Uint8Array, fileType?: string, file?: File) => void
  ) => {
    const file = e.target.files?.[0];
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = function () {
      const arrayBuffer = reader.result;
      const array = new Uint8Array(arrayBuffer as ArrayBuffer);
      callback(array, file.type, file);
    };
  };

  const cancel = () => {
    SDK.cancel(selectedDevice?.connectId);
  };

  const handleGetLogs = async () => {
    const res = await SDK.getLogs();
    console.log('example getLogs response: ', res);
  };

  const handleGetPassphraseState = async () => {
    const res = await SDK.getPassphraseState(selectedDevice?.connectId);
    console.log('example getLogs response: ', res);
  };

  const handleRequestWebUsbDevice = async () => {
    const res = await SDK.requestWebUsbDevice();
    console.log('example requestWebUsbDevice response: ', res);
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
        <Button title="check bridge status" onPress={() => handleCheckBridgeStatus()} />
        <Button title="check bridge release" onPress={() => handleCheckBridgeRelease()} />
        <Button title="check bootloader release" onPress={() => handleCheckBootloaderRelease()} />
        <Button title="cancel" onPress={() => cancel()} />
        <Button title="reset" onPress={() => RNRestart.Restart()} />
        <Button title="getLogs" onPress={() => handleGetLogs()} />
        <Button title="getPassphraseState" onPress={() => handleGetPassphraseState()} />
        <Button title="requestWebUsbDevice" onPress={() => handleRequestWebUsbDevice()} />
        <Button title="updateBootloader" onPress={() => handleUpdateBootloader()} />
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
        <Button title="firmware update v2" onPress={() => handleFirmwareUpdateV2()} />
        <Button
          title="firmware update with local file"
          // onPress={() => handleFirmwareUpdate(selectedFile)}
          onPress={() => handleFirmwareUpdateV2()}
        />
        {Platform.OS === 'web' ? (
          <input type="file" onChange={e => onFileChange(e, data => setSelectedFile(data))} />
        ) : null}
      </View>

      <DeviceList data={devices} onSelected={device => setSelectedDevice(device)} />

      <View style={styles.container}>
        <Text>Common Parameters</Text>
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
          <View style={styles.commonParamItem}>
            <Text>passphrase State</Text>
            <TextInput
              style={styles.input}
              value={optionalParams?.passphraseState ?? ''}
              onChangeText={v => {
                setOptionalParams({ ...optionalParams, passphraseState: v });
              }}
            />
          </View>
          <View style={styles.commonParamItem}>
            <Text>init session</Text>
            <Switch
              value={!!optionalParams?.initSession}
              onValueChange={v => setOptionalParams({ ...optionalParams, initSession: v })}
            />
          </View>
        </View>
      </View>

      <UploadScreen
        SDK={SDK}
        type={type}
        selectedDevice={selectedDevice as KnownDevice}
        commonParams={optionalParams}
      />

      <CallBTCMethods SDK={SDK} selectedDevice={selectedDevice} commonParams={optionalParams} />
      <CallEVMMethods SDK={SDK} selectedDevice={selectedDevice} commonParams={optionalParams} />
      <CallDeviceMethods SDK={SDK} selectedDevice={selectedDevice} />
      <CallOtherMethods SDK={SDK} selectedDevice={selectedDevice} />
      <CallStarcoinMethods
        SDK={SDK}
        selectedDevice={selectedDevice}
        commonParams={optionalParams}
      />
      <CallNEMMethods SDK={SDK} selectedDevice={selectedDevice} commonParams={optionalParams} />
      <CallSolanaMethods SDK={SDK} selectedDevice={selectedDevice} commonParams={optionalParams} />
      <CallStellarMethods SDK={SDK} selectedDevice={selectedDevice} commonParams={optionalParams} />
      <CallTronMethods SDK={SDK} selectedDevice={selectedDevice} commonParams={optionalParams} />
      <CallConfluxMethods SDK={SDK} selectedDevice={selectedDevice} commonParams={optionalParams} />
      <CallNearMethods SDK={SDK} selectedDevice={selectedDevice} commonParams={optionalParams} />
      <CallAptosMethods SDK={SDK} selectedDevice={selectedDevice} commonParams={optionalParams} />
      <CallAlgoMethods SDK={SDK} selectedDevice={selectedDevice} commonParams={optionalParams} />
      <CallCosmosMethods SDK={SDK} selectedDevice={selectedDevice} commonParams={optionalParams} />
      <CallXrpMethods SDK={SDK} selectedDevice={selectedDevice} commonParams={optionalParams} />
      <CallCardanoMethods SDK={SDK} selectedDevice={selectedDevice} commonParams={optionalParams} />
      <CallSuiMethods SDK={SDK} selectedDevice={selectedDevice} commonParams={optionalParams} />
      <CallFilecoinMethods
        SDK={SDK}
        selectedDevice={selectedDevice}
        commonParams={optionalParams}
      />
      <CallPolkadotMethods
        SDK={SDK}
        selectedDevice={selectedDevice}
        commonParams={optionalParams}
      />
      <CallKaspaMethods SDK={SDK} selectedDevice={selectedDevice} commonParams={optionalParams} />
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
