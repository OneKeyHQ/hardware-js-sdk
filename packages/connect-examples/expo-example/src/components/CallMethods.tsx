import { useEffect, useState } from 'react';
import { View, Button, StyleSheet, Platform, Switch, Text, TextInput } from 'react-native';
import RNRestart from 'react-native-restart';
import { bytesToHex } from '@noble/hashes/utils';
import {
  UI_EVENT,
  UI_REQUEST,
  CoreMessage,
  UI_RESPONSE,
  CoreApi,
  FIRMWARE_EVENT,
  DEVICE,
  CommonParams,
  DeviceUploadResourceParams,
} from '@onekeyfe/hd-core';
import Compressor from 'compressorjs';

import { ResourceType } from '@onekeyfe/hd-transport';
import { Picker } from '@react-native-picker/picker';
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
import { CallTronMethods } from './CallTronMethods';
import { CallConfluxMethods } from './CallConfluxMethods';
import { CallNearMethods } from './CallNearMethods';
import { CallAptosMethods } from './CallAptosMethods';
import { CallAlgoMethods } from './CallAlgoMethods';

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
    SDK.on(UI_EVENT, (message: CoreMessage) => {
      if (message.type === UI_REQUEST.REQUEST_PIN) {
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

  const handleFirmwareUpdateV2 = async (file?: Uint8Array) => {
    const params: any = { updateType: firmwareType ? 'firmware' : 'ble' };
    if (file) {
      params.binary = file;
    }
    const response = await SDK.firmwareUpdateV2(
      type === 'Bluetooth' ? selectedDevice?.connectId : undefined,
      params
    );
    console.log('example firmwareUpdate response: ', response);
  };

  const handleCompressImage = async (file: File, width: number, height: number) =>
    new Promise<{ binary: Uint8Array; fileType: string }>((resolve, reject) => {
      const a = new Compressor(file, {
        quality: 0.6,
        resize: 'cover',
        width,
        height,
        mimeType: 'image/png',
        success(result: File | Blob) {
          console.log('compress success: ', result);

          const reader = new FileReader();
          reader.readAsArrayBuffer(result);
          reader.onload = function () {
            const arrayBuffer = reader.result;
            const array = new Uint8Array(arrayBuffer as ArrayBuffer);
            resolve({
              binary: array,
              fileType: result.type.split('/').pop() ?? '',
            });
          };
        },
        error(err) {
          reject(err);
        },
      });
    });

  const handleScreenUpdate = async () => {
    if (!uploadScreenParams?.file) return;

    const data = await handleCompressImage(uploadScreenParams.file, 480, 800);
    const zoomData = await handleCompressImage(uploadScreenParams.file, 144, 240);

    const params: DeviceUploadResourceParams = {
      resType: uploadScreenParams.resType === 0 ? ResourceType.WallPaper : ResourceType.Nft,
      suffix: data.fileType,
      dataHex: bytesToHex(data.binary),
      thumbnailDataHex: bytesToHex(zoomData.binary),
      nftMetaData: uploadScreenParams.nftMetaData ?? '',
    };

    const response = await SDK.deviceUploadResource(
      type === 'Bluetooth' ? selectedDevice?.connectId ?? '' : '',
      {
        ...optionalParams,
        ...params,
      }
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
        <Button title="cancel" onPress={() => cancel()} />
        <Button title="reset" onPress={() => RNRestart.Restart()} />
        <Button title="getLogs" onPress={() => handleGetLogs()} />
        <Button title="getPassphraseState" onPress={() => handleGetPassphraseState()} />
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
        <Button title="firmware update v2" onPress={() => handleFirmwareUpdateV2()} />
        <Button
          title="firmware update with local file"
          onPress={() => handleFirmwareUpdate(selectedFile)}
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

      <View style={styles.container}>
        <Text>Upload Screen Image & Video</Text>
        <View style={{ flexDirection: 'row' }}>
          <View style={styles.commonParamItem}>
            <Text>支持 PNG & MP4</Text>
            {Platform.OS === 'web' ? (
              <input
                type="file"
                onChange={e =>
                  onFileChange(e, (data, fileType, file) =>
                    setUploadScreenParams({
                      ...uploadScreenParams,
                      file,
                      suffix: fileType?.split('/').pop(),
                    })
                  )
                }
              />
            ) : null}
          </View>
          <View style={styles.commonParamItem}>
            <Text>文件后缀</Text>
            <TextInput
              style={styles.input}
              value={uploadScreenParams?.suffix ?? ''}
              onChangeText={v => {
                setUploadScreenParams({ ...uploadScreenParams, suffix: v });
              }}
            />
          </View>
          <View style={styles.commonParamItem}>
            <Text>资源类型</Text>
            <Picker
              selectedValue={uploadScreenParams?.resType}
              onValueChange={itemValue =>
                setUploadScreenParams({ ...uploadScreenParams, resType: itemValue })
              }
            >
              <Picker.Item label="WallPaper" value="0" />
              <Picker.Item label="NFT" value="1" />
            </Picker>
          </View>
          <View style={styles.commonParamItem}>
            <Text>NFT 数据</Text>
            <TextInput
              style={styles.input}
              value={uploadScreenParams?.nftMetaData ?? ''}
              onChangeText={v => {
                setUploadScreenParams({ ...uploadScreenParams, nftMetaData: v });
              }}
            />
          </View>
          <Button title="Upload File" onPress={() => handleScreenUpdate()} />
        </View>
      </View>

      <CallEVMMethods SDK={SDK} selectedDevice={selectedDevice} commonParams={optionalParams} />
      <CallBTCMethods SDK={SDK} selectedDevice={selectedDevice} commonParams={optionalParams} />
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
