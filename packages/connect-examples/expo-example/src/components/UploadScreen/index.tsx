import { Buffer } from 'buffer';
import React, { useState, useEffect } from 'react';
import { Platform, Button, View, Text, StyleSheet, TextInput, Image } from 'react-native';
import { bytesToHex } from '@noble/hashes/utils';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { Action, manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import { DeviceUploadResourceParams, CoreApi, CommonParams, KnownDevice } from '@onekeyfe/hd-core';
import { ResourceType } from '@onekeyfe/hd-transport';
import { getImageSize, imageToBase64, formatBytes, generateUploadNFTParams } from './nftUtils';

interface Props {
  SDK: CoreApi;
  type: 'Bluetooth' | 'USB';
  commonParams?: CommonParams;
  selectedDevice: KnownDevice;
}

interface UploadResourceParams {
  suffix?: string;
  resType?: number;
  nftMetaData?: string;
}

function getUrlExtension(url: string) {
  if (Platform.OS === 'web') {
    return url.split(';')[0].split('/')[1];
  }
  return url.split(/[#?]/)[0].split('.').pop()?.trim();
}

export const generateUploadResParams = async (
  uri: string,
  width: number,
  height: number,
  cb?: (data: { base64?: string }) => void
) => {
  const data = await compressHomescreen(uri, 480, 800, width, height);
  const zoomData = await compressHomescreen(uri, 144, 240, width, height);

  cb?.(data as any);

  if (!data?.arrayBuffer && !zoomData?.arrayBuffer) return;

  console.log('homescreen data byte length: ', formatBytes(data?.arrayBuffer?.byteLength ?? 0, 3));
  console.log(
    'homescreen thumbnail byte length: ',
    formatBytes(zoomData?.arrayBuffer?.byteLength ?? 0, 3)
  );

  const params: DeviceUploadResourceParams = {
    resType: ResourceType.WallPaper,
    suffix: 'jpeg',
    dataHex: bytesToHex(data?.arrayBuffer as Uint8Array),
    thumbnailDataHex: bytesToHex(zoomData?.arrayBuffer as Uint8Array),
    nftMetaData: '',
  };

  return params;
};

function getOriginX(originW: number, originH: number, scaleW: number, scaleH: number) {
  const width = Math.ceil((scaleH / originH) * originW);
  console.log(`image true width: `, width);
  console.log(`image should width: `, scaleW);
  console.log(`image true height: `, scaleH);
  if (width <= scaleW) {
    return null;
  }
  const originX = Math.ceil(Math.ceil(width / 2) - Math.ceil(scaleW / 2));
  console.log(`originX: `, originX);
  console.log(`crop size: height: ${scaleH}, width: ${scaleW}, originX: ${originX}, originY: 0`);
  return originX;
}

export const compressHomescreen = async (
  uri: string,
  width: number,
  height: number,
  originW: number,
  originH: number
) => {
  if (!uri) return;
  console.log(`width: ${width}, height: ${height}, originW: ${originW}, originH: ${originH}`);
  const actions: Action[] = [
    {
      resize: {
        height,
      },
    },
  ];
  const originX = getOriginX(originW, originH, width, height);
  if (originX !== null) {
    actions.push({
      crop: {
        height,
        width,
        originX,
        originY: 0,
      },
    });
  }
  const imageResult = await manipulateAsync(uri, actions, {
    compress: 0.9,
    format: SaveFormat.JPEG,
    base64: true,
  });

  const buffer = Buffer.from(imageResult.base64 ?? '', 'base64');
  const arrayBuffer = new Uint8Array(buffer);
  return {
    ...imageResult,
    arrayBuffer,
  };
};

function UploadScreenComponent({ SDK, type, commonParams, selectedDevice }: Props) {
  const [uploadScreenParams, setUploadScreenParams] = useState<UploadResourceParams>({
    resType: 0,
  });

  const [image, setImage] = useState<ImagePicker.ImageInfo | null>(null);
  const [previewData, setPreviewData] = useState<string | null>(null);
  const [nftUrl, setNftUrl] = useState('');

  useEffect(() => {
    // generate nft data
    if (nftUrl) {
      const imageUrl = nftUrl;
      (async () => {
        const { width, height } = await getImageSize(imageUrl);
        console.log('image size: ', { width, height });
        const base64 = await imageToBase64(imageUrl);
        console.log(base64);

        let uploadResParams: DeviceUploadResourceParams | undefined;
        try {
          uploadResParams = await generateUploadNFTParams(base64, width, height, data => {
            setImage({ uri: base64 } as any);
            setPreviewData(`data:image/png;base64,${data?.base64}` ?? null);
          });
        } catch (e) {
          console.log('image operate error: ', e);
          return;
        }

        if (uploadResParams) {
          const response = await SDK.deviceUploadResource(
            type === 'Bluetooth' ? selectedDevice?.connectId ?? '' : '',
            {
              ...commonParams,
              ...uploadResParams,
            }
          );
          console.log('example firmwareUpdate response: ', response);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nftUrl]);

  const handleScreenUpdate = async () => {
    // setPreviewData(`data:image/png;base64,${data?.base64}` ?? null);

    let uploadResParams: DeviceUploadResourceParams | undefined;
    try {
      uploadResParams = await generateUploadResParams(
        image?.uri ?? '',
        image?.width ?? 0,
        image?.height ?? 0,
        data => {
          setPreviewData(`data:image/png;base64,${data?.base64}` ?? null);
        }
      );
    } catch (e) {
      console.log('image operate error: ', e);
      return;
    }

    if (uploadResParams) {
      const response = await SDK.deviceUploadResource(
        type === 'Bluetooth' ? selectedDevice?.connectId ?? '' : '',
        {
          ...commonParams,
          ...uploadResParams,
        }
      );
      console.log('example firmwareUpdate response: ', response);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    console.log(result);

    if (!result.cancelled) {
      setImage(result);
      setUploadScreenParams({
        ...uploadScreenParams,
        suffix: getUrlExtension(result.uri),
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Upload Screen Image & Video</Text>
      <View style={{ flexDirection: Platform.OS === 'web' ? 'row' : 'column' }}>
        <View style={{ flexDirection: 'column' }}>
          <View style={styles.item}>
            <Text>支持 PNG & MP4</Text>
            {/* {image && <Text>{image}</Text>} */}
            <Button title="Pick image" onPress={pickImage} />
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
        <View style={styles.item}>
          <Text>NFT URL</Text>
          <TextInput
            style={styles.input}
            value={nftUrl}
            onChangeText={v => {
              setNftUrl(v);
            }}
          />
        </View>
        <Button title="Upload File" onPress={() => handleScreenUpdate()} />
        {Platform.OS === 'web' && (
          <View style={styles.item}>
            <Button
              title="全量覆盖 RES"
              onPress={() => SDK.deviceFullyUploadResource(selectedDevice?.connectId ?? '', {})}
            />
          </View>
        )}
      </View>
      {Platform.OS === 'web' && (
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          {image && (
            <Image
              style={{ height: 800, width: 480 }}
              source={{ uri: image.uri }}
              // this resize mode for nft
              resizeMode="contain"
            />
          )}
          {previewData && (
            <Image style={{ height: 800, width: 480 }} source={{ uri: previewData }} />
          )}
        </View>
      )}
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
