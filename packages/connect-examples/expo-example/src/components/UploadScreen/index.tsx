import { Buffer } from 'buffer'
import React, { useState } from 'react';
import { Platform, Button, Image, View, Text, StyleSheet, TextInput } from 'react-native';
import { bytesToHex } from '@noble/hashes/utils';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { ActionCrop, ActionResize, manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import { DeviceUploadResourceParams, CoreApi, CommonParams, KnownDevice } from '@onekeyfe/hd-core';
import { ResourceType } from '@onekeyfe/hd-transport';

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

function getUrlExtension(url: string) {
  if (Platform.OS === 'web') {
    return url.split(';')[0].split('/')[1]
  }
  return url.split(/[#?]/)[0].split('.').pop()?.trim();
}

function UploadScreenComponent({ SDK, type, commonParams, selectedDevice }: Props) {
  const [uploadScreenParams, setUploadScreenParams] = useState<UploadResourceParams>({
    resType: 0,
  });

  const [image, setImage] = useState<string | null>(null);

  const compressImage = async (width: number, height: number) => {
    if (!image) return;
    const imageResult = await manipulateAsync(
      image,
      [
        {
          resize: {
            height,
            width,
          },
        },
      ],
      { compress: 0.1, format: SaveFormat.PNG, base64: true }
    );

    console.log(imageResult);
    const buffer = Buffer.from(imageResult.base64 ?? '', 'base64');
    const arrayBuffer = new Uint8Array(buffer);
    // const arrayBuffer = await base64ToBufferAsync(imageResult.base64 ?? '');
    console.log(arrayBuffer);
    return {
      ...imageResult,
      arrayBuffer,
    };
  };

  const handleScreenUpdate = async () => {
    const data = await compressImage(480, 800);
    const zoomData = await compressImage(144, 240)

    const params: DeviceUploadResourceParams = {
      resType: uploadScreenParams.resType === 0 ? ResourceType.WallPaper : ResourceType.Nft,
      suffix: 'png',
      dataHex: data?.arrayBuffer ? bytesToHex(data?.arrayBuffer) : '',
      thumbnailDataHex: zoomData?.arrayBuffer ? bytesToHex(zoomData.arrayBuffer) : '',
      nftMetaData: uploadScreenParams.nftMetaData ?? '',
    };

    console.log(params)

    const response = await SDK.deviceUploadResource(
      type === 'Bluetooth' ? selectedDevice?.connectId ?? '' : '',
      {
        ...commonParams,
        ...params,
      }
    );
    console.log('example firmwareUpdate response: ', response);
  };

  const pickImage = async () => {
    console.log(1);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    console.log(result);

    if (!result.cancelled) {
      setImage(result.uri);
      setUploadScreenParams({
        ...uploadScreenParams,
        // file,
        suffix: getUrlExtension(result.uri),
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Upload Screen Image & Video</Text>
      <View style={{ flexDirection: 'column' }}>
        <View style={styles.item}>
          <Text>支持 PNG 1& MP4</Text>
          {/* {image && <Text>{image}</Text>} */}
          <Button title="Pick an image from camera roll" onPress={pickImage} />
        </View>
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
    paddingVertical: 8,
  },
  input: {
    height: 35,
    borderWidth: 1,
    padding: 4,
  },
});

const UploadScreen = React.memo(UploadScreenComponent);
export { UploadScreen };
