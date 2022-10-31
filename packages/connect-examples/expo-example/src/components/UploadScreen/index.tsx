import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Button } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { bytesToHex } from '@noble/hashes/utils';
import { DeviceUploadResourceParams, CoreApi, CommonParams, KnownDevice } from '@onekeyfe/hd-core';
import { ResourceType } from '@onekeyfe/hd-transport';

import Compressor from 'compressorjs';

interface Props {
  SDK: CoreApi;
  type: 'Bluetooth' | 'USB';
  commonParams?: CommonParams;
  selectedDevice: KnownDevice;
}

interface UploadResourceParams {
  suffix?: string;
  file?: File;
  resType?: number;
  nftMetaData?: string;
}

function UploadScreen({ SDK, type, commonParams, selectedDevice }: Props) {
  const [uploadScreenParams, setUploadScreenParams] = useState<UploadResourceParams>({
    resType: 0,
  });

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = function () {
      const arrayBuffer = reader.result;
      const array = new Uint8Array(arrayBuffer as ArrayBuffer);
      setUploadScreenParams({
        ...uploadScreenParams,
        file,
        suffix: file.type?.split('/').pop(),
      });
    };
  };

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
        ...commonParams,
        ...params,
      }
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

  return (
    <View style={styles.container}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Upload Screen Image & Video</Text>
      <View style={{ flexDirection: 'row', paddingVertical: 16 }}>
        <View style={styles.item}>
          <Text>支持 PNG & MP4</Text>
          <input type="file" onChange={e => onFileChange(e)} />
        </View>
        <View style={styles.item}>
          <Text>文件后缀</Text>
          <TextInput
            style={styles.input}
            value={uploadScreenParams?.suffix ?? ''}
            onChangeText={v => {
              setUploadScreenParams({ ...uploadScreenParams, suffix: v });
            }}
          />
        </View>
        <View style={styles.item}>
          <Text>资源类型</Text>
          {/* @ts-expect-error */}
          <Picker
            selectedValue={uploadScreenParams?.resType}
            onValueChange={itemValue =>
              setUploadScreenParams({ ...uploadScreenParams, resType: itemValue })
            }
          >
            {/* @ts-expect-error */}
            <Picker.Item label="WallPaper" value="0" />
            {/* @ts-expect-error */}
            <Picker.Item label="NFT" value="1" />
          </Picker>
        </View>
        <View style={styles.item}>
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
  );
}

const styles = StyleSheet.create({
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
  item: {
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

export { UploadScreen };
