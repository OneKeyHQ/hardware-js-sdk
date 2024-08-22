import { Buffer } from 'buffer';
import React, { useState, useEffect, useContext } from 'react';

import { bytesToHex } from '@noble/hashes/utils';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { Action, manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import { DeviceUploadResourceParams, getHomeScreenSize, getDeviceType } from '@onekeyfe/hd-core';
import { ResourceType } from '@onekeyfe/hd-transport';
import { Image, Label, Stack, View, XStack } from 'tamagui';
import { Platform } from 'react-native';
import { useIntl } from 'react-intl';
import { getImageSize, imageToBase64, formatBytes, generateUploadNFTParams } from './nftUtils';
import HardwareSDKContext from '../../provider/HardwareSDKContext';
import { useCommonParams } from '../../provider/CommonParamsProvider';
import { useDevice } from '../../provider/DeviceProvider';
import PanelView from '../ui/Panel';
import { Button } from '../ui/Button';
import { CommonInput } from '../CommonInput';

interface UploadResourceParams {
  suffix?: string;
  resType?: number;
  nftMetaData?: string;
  fileNameNoExt?: string;
}

function getUrlExtension(url: string) {
  if (Platform.OS === 'web') {
    return url.split(';')[0].split('/')[1];
  }
  return url.split(/[#?]/)[0].split('.').pop()?.trim();
}

export const generateUploadResParams = async ({
  uri,
  width,
  height,
  homeScreenSize,
  homeScreenThumbnailSize,
  cb,
}: {
  uri: string;
  width: number;
  height: number;
  homeScreenSize?: {
    width: number;
    height: number;
  };
  homeScreenThumbnailSize?: {
    width: number;
    height: number;
  };
  cb?: (data: { base64?: string }) => void;
}) => {
  const data = await compressHomescreen(
    uri,
    homeScreenSize?.width ?? 480,
    homeScreenSize?.height ?? 800,
    width,
    height
  );
  const zoomData = await compressHomescreen(
    uri,
    homeScreenThumbnailSize?.width ?? 144,
    homeScreenThumbnailSize?.height ?? 240,
    width,
    height
  );

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
    fileNameNoExt: undefined,
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

function UploadScreenComponent() {
  const intl = useIntl();
  const { sdk: SDK, type } = useContext(HardwareSDKContext);
  const { selectedDevice } = useDevice();
  const { commonParams } = useCommonParams();

  const [uploadScreenParams, setUploadScreenParams] = useState<UploadResourceParams>({
    resType: 0,
  });

  const [image, setImage] = useState<ImagePicker.ImageInfo | null>(null);
  const [previewData, setPreviewData] = useState<string | null>(null);
  const [nftUrl, setNftUrl] = useState(
    'https://static.unisat.io/content/f5565a87665e441edfb0da50a0f4042e0a8cbc046a568cfc1b6186299d18fe0ei0'
  );

  useEffect(() => {
    // generate nft data
    if (nftUrl) {
      const imageUrl = nftUrl;
      (async () => {
        const res = await SDK?.getFeatures();
        if (!res) return;
        if (!res.success) return;

        const deviceType = getDeviceType(res.payload);
        const screenType = uploadScreenParams?.resType?.toString() === '0' ? 'WallPaper' : 'Nft';
        const HomeScreenSize = getHomeScreenSize({
          deviceType,
          homeScreenType: screenType,
        });
        const HomeScreenThumbnailSize = getHomeScreenSize({
          deviceType,
          homeScreenType: screenType,
          thumbnail: true,
        });

        console.log('HomeScreenSize nft: ', HomeScreenSize);
        console.log('HomeScreenThumbnailSize nft: ', HomeScreenThumbnailSize);

        const { width, height } = await getImageSize(imageUrl);
        console.log('image size: ', { width, height });
        const base64 = await imageToBase64(imageUrl);
        console.log(base64);

        let uploadResParams: DeviceUploadResourceParams | undefined;
        try {
          uploadResParams = await generateUploadNFTParams({
            uri: base64,
            width,
            height,
            homeScreenSize: HomeScreenSize,
            homeScreenThumbnailSize: HomeScreenThumbnailSize,
            cb: data => {
              setImage({ uri: base64 } as any);
              setPreviewData(`data:image/png;base64,${data?.base64}` ?? null);
            },
          });
        } catch (e) {
          console.log('image operate error: ', e);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nftUrl]);

  const handleScreenUpdate = async (screenType: 'WallPaper' | 'Nft') => {
    // setPreviewData(`data:image/png;base64,${data?.base64}` ?? null);

    const res = await SDK?.getFeatures();
    if (!res) return;
    if (!res.success) return;

    const deviceType = getDeviceType(res.payload);
    const HomeScreenSize = getHomeScreenSize({
      deviceType,
      homeScreenType: screenType,
    });
    const HomeScreenThumbnailSize = getHomeScreenSize({
      deviceType,
      homeScreenType: screenType,
      thumbnail: true,
    });

    console.log('HomeScreenSize WallPaper: ', HomeScreenSize);
    console.log('HomeScreenThumbnailSize WallPaper: ', HomeScreenThumbnailSize);

    let uploadResParams: DeviceUploadResourceParams | undefined;
    if (screenType === 'WallPaper') {
      try {
        uploadResParams = await generateUploadResParams({
          uri: image?.uri ?? '',
          width: image?.width ?? 0,
          height: image?.height ?? 0,
          homeScreenSize: HomeScreenSize,
          homeScreenThumbnailSize: HomeScreenThumbnailSize,
          cb: data => {
            setPreviewData(`data:image/png;base64,${data?.base64}` ?? null);
          },
        });
        if (uploadResParams) uploadResParams.fileNameNoExt = uploadScreenParams?.fileNameNoExt;
      } catch (e) {
        console.log('image operate error: ', e);
        return;
      }
    } else {
      if (!nftUrl) {
        alert('请输入 NFT URL');
        return;
      }
      const imageUrl = nftUrl;
      const { width, height } = await getImageSize(imageUrl);
      console.log('image size: ', { width, height });
      const base64 = await imageToBase64(imageUrl);
      console.log(base64);

      try {
        uploadResParams = await generateUploadNFTParams({
          uri: base64,
          width,
          height,
          homeScreenSize: HomeScreenSize,
          homeScreenThumbnailSize: HomeScreenThumbnailSize,
          cb: data => {
            setImage({ uri: base64 } as any);
            setPreviewData(`data:image/png;base64,${data?.base64}` ?? null);
          },
        });
      } catch (e) {
        console.log('image operate error: ', e);
        return;
      }
    }

    if (uploadResParams) {
      const response = await SDK?.deviceUploadResource(
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

    if (!result.canceled) {
      const assetImage = result.assets[0];

      setImage(assetImage);
      setUploadScreenParams({
        ...uploadScreenParams,
        suffix: getUrlExtension(assetImage.uri),
      });
    }
  };

  return (
    <PanelView title="Upload Screen Image & Video">
      <XStack
        flexWrap="wrap"
        gap="$4"
        borderColor="$borderSubdued"
        borderWidth="$0.5"
        borderRadius="$2"
        padding="$2"
      >
        <Label paddingRight="$0" justifyContent="center">
          {intl.formatMessage({ id: 'label__upload_wall_paper' })}
        </Label>
        <Stack width={160} minHeight={45}>
          <Label paddingRight="$0" justifyContent="center">
            {intl.formatMessage({ id: 'label__upload_image_res_type' })}
          </Label>
          <Button onPress={pickImage}>{intl.formatMessage({ id: 'action__pick_image' })}</Button>
        </Stack>
        <CommonInput
          type="text"
          label={intl.formatMessage({ id: 'label__res_file_suffix' })}
          value={uploadScreenParams?.suffix ?? ''}
          onChange={v => {
            setUploadScreenParams({ ...uploadScreenParams, suffix: v });
          }}
        />
        <CommonInput
          type="text"
          label={intl.formatMessage({ id: 'label__res_file_name' })}
          value={uploadScreenParams?.fileNameNoExt ?? ''}
          placeholder="wp-file1-12345"
          onChange={v => {
            setUploadScreenParams({ ...uploadScreenParams, fileNameNoExt: v });
          }}
        />
        <Button onPress={() => handleScreenUpdate('WallPaper')}>
          {intl.formatMessage({ id: 'action__upload' })}
        </Button>
      </XStack>
      <XStack
        flexWrap="wrap"
        gap="$4"
        borderColor="$borderSubdued"
        borderWidth="$0.5"
        borderRadius="$2"
        padding="$2"
      >
        <Label paddingRight="$0" justifyContent="center">
          {intl.formatMessage({ id: 'label__upload_nft' })}
        </Label>
        <CommonInput
          type="text"
          label={intl.formatMessage({ id: 'label__nft_url' })}
          value={nftUrl ?? ''}
          onChange={v => {
            setNftUrl(v);
          }}
        />
        <CommonInput
          type="text"
          label={intl.formatMessage({ id: 'label__nft_data' })}
          value={uploadScreenParams?.nftMetaData ?? ''}
          onChange={v => {
            setUploadScreenParams({ ...uploadScreenParams, nftMetaData: v });
          }}
        />
        <Button onPress={() => handleScreenUpdate('Nft')}>
          {intl.formatMessage({ id: 'action__upload' })}
        </Button>
      </XStack>
      {Platform.OS === 'web' && (
        <View flexDirection="row" alignItems="center">
          <Label paddingRight="$0" justifyContent="center">
            预览
          </Label>
          {image && (
            <Image
              height={800}
              width={480}
              source={{ uri: image.uri }}
              // this resize mode for nft
              resizeMode="contain"
            />
          )}
          {previewData && (
            // NFT
            <Image height={238} width={238} source={{ uri: previewData }} />
            // HOME SCREEN
            // <Image style={{ height: 800, width: 480 }} source={{ uri: previewData }} />
          )}
        </View>
      )}
    </PanelView>
  );
}

const UploadScreen = React.memo(UploadScreenComponent);
export { UploadScreen };
