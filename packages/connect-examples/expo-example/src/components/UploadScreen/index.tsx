import { Buffer } from 'buffer';
import React, { useContext, useEffect, useState } from 'react';
import { bytesToHex } from '@noble/hashes/utils';
import * as ImagePicker from 'expo-image-picker';
import { SaveFormat, manipulateAsync } from 'expo-image-manipulator';
import { getDeviceType, getHomeScreenSize, getNftSize } from '@onekeyfe/hd-core';
import { ResourceType } from '@onekeyfe/hd-transport';
import { Image as ImageView, Label, Stack, View, XStack } from 'tamagui';
import { Platform } from 'react-native';
import { useIntl } from 'react-intl';

import {
  formatBytes,
  generateUploadNFTParams,
  getImageSize,
  imageSourceToRgba,
  imageToBase64,
  processImageBlur,
} from './nftUtils';
import HardwareSDKContext from '../../provider/HardwareSDKContext';
import { useCommonParams } from '../../provider/CommonParamsProvider';
import { useDevice } from '../../provider/DeviceProvider';
import { getProtocolAwareFeatures } from '../../utils/protocolAwareFeatures';
import PanelView from '../ui/Panel';
import { Button } from '../ui/Button';
import { CommonInput } from '../CommonInput';

import type { CoreApi, DeviceUploadResourceParams } from '@onekeyfe/hd-core';
import type { Action } from 'expo-image-manipulator';

interface UploadResourceParams {
  suffix?: string;
  resType?: number;
  nftMetaData?: string;
  fileNameNoExt?: string;
  blurRadius?: number;
  blurOverlayOpacity?: string;
}

type ProtocolV2NftParams = Parameters<CoreApi['deviceUploadNft']>[1];

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
  blurRadius,
  blurOverlayOpacity,
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
  blurRadius?: number;
  blurOverlayOpacity?: number;
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

  const blurData = await processImageBlur({
    base64Data: data?.base64 ?? '',
    blurRadius: blurRadius ?? 100,
    overlayOpacity: blurOverlayOpacity ?? 0.2,
  });

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
    blurDataHex: blurData.hex,
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
  const [isLoading, setIsLoading] = useState(false);
  const [uploadResParams, setUploadResParams] = useState<DeviceUploadResourceParams | undefined>();
  const [protocolV2NftParams, setProtocolV2NftParams] = useState<ProtocolV2NftParams | undefined>();
  const [preparedNftProtocol, setPreparedNftProtocol] = useState<'V1' | 'V2'>();

  useEffect(() => {
    setUploadResParams(undefined);
    setProtocolV2NftParams(undefined);
    setPreparedNftProtocol(undefined);
  }, [selectedDevice?.connectId]);

  const loadNftData = async () => {
    if (!nftUrl) {
      alert('Please enter NFT URL');
      return;
    }

    if (!SDK) {
      alert('SDK not initialized');
      return;
    }

    setIsLoading(true);
    setUploadResParams(undefined);
    setProtocolV2NftParams(undefined);
    setPreparedNftProtocol(undefined);
    try {
      console.log('Loading NFT data...');
      const res = await getProtocolAwareFeatures(
        SDK,
        selectedDevice?.connectId,
        undefined,
        selectedDevice?.connectProtocol
      );
      if (!res) {
        alert('Failed to get device features');
        return;
      }
      if (!res.success) {
        alert('Failed to get device features');
        return;
      }

      const deviceType = getDeviceType(res.payload);
      const isProtocolV2 =
        selectedDevice?.connectProtocol === 'V2' || res.payload.protocol === 'V2';
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

      const { width, height } = await getImageSize(nftUrl);
      console.log('image size: ', { width, height });
      const base64 = await imageToBase64(nftUrl);

      try {
        if (isProtocolV2) {
          const imageSize = getNftSize({ deviceType });
          const thumbnailSize = getNftSize({ deviceType, thumbnail: true });
          if (!imageSize || !thumbnailSize) {
            throw new Error(`NFT dimensions are not configured for ${deviceType}`);
          }

          const [rgba, thumbnailRgba] = await Promise.all([
            imageSourceToRgba(base64, imageSize.width, imageSize.height),
            imageSourceToRgba(base64, thumbnailSize.width, thumbnailSize.height),
          ]);
          setProtocolV2NftParams({
            ...commonParams,
            image: { ...imageSize, rgba },
            thumbnail: { ...thumbnailSize, rgba: thumbnailRgba },
            title: uploadScreenParams.fileNameNoExt || 'OneKey NFT',
            subtitle: uploadScreenParams.nftMetaData || '',
          });
          setUploadResParams(undefined);
          setPreparedNftProtocol('V2');
          setImage({ uri: base64 } as ImagePicker.ImageInfo);
          setPreviewData(base64);
          alert('Protocol V2 NFT data loaded successfully');
          return;
        }

        const params = await generateUploadNFTParams({
          uri: base64,
          width,
          height,
          homeScreenSize: HomeScreenSize,
          homeScreenThumbnailSize: HomeScreenThumbnailSize,
          blurRadius: uploadScreenParams?.blurRadius ?? 100,
          blurOverlayOpacity: parseFloat(uploadScreenParams?.blurOverlayOpacity ?? '0.2'),
          cb: data => {
            setImage({ uri: base64 } as any);
            setPreviewData(data?.base64 ? `data:image/png;base64,${data.base64}` : null);
          },
        });

        setUploadResParams(params);
        setProtocolV2NftParams(undefined);
        setPreparedNftProtocol('V1');
        alert('NFT data loaded successfully');
      } catch (e) {
        console.log('image operate error: ', e);
        alert('Failed to process NFT image');
      }
    } catch (error) {
      console.error('Error loading NFT data:', error);
      alert('Error loading NFT data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleScreenUpdate = async (screenType: 'WallPaper' | 'Nft') => {
    setIsLoading(true);
    try {
      if (screenType === 'WallPaper') {
        if (!image) {
          alert('Please select an image first');
          return;
        }

        const res = SDK
          ? await getProtocolAwareFeatures(
              SDK,
              selectedDevice?.connectId,
              undefined,
              selectedDevice?.connectProtocol
            )
          : undefined;
        if (!res) {
          alert('Failed to get device features');
          return;
        }
        if (!res.success) {
          alert('Failed to get device features');
          return;
        }

        const deviceType = getDeviceType(res.payload);
        const isProtocolV2 =
          selectedDevice?.connectProtocol === 'V2' || res.payload.protocol === 'V2';
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

        if (isProtocolV2) {
          if (!HomeScreenSize) {
            throw new Error(`Wallpaper dimensions are not configured for ${deviceType}`);
          }
          const rgba = await imageSourceToRgba(
            image.uri,
            HomeScreenSize.width,
            HomeScreenSize.height
          );
          const response = await SDK?.deviceUploadWallpaper(selectedDevice?.connectId ?? '', {
            ...commonParams,
            width: HomeScreenSize.width,
            height: HomeScreenSize.height,
            rgba,
            fileName: uploadScreenParams.fileNameNoExt,
          });
          if (!response?.success) {
            throw new Error(response?.payload?.error || 'Protocol V2 wallpaper upload failed');
          }
          console.log('Protocol V2 wallpaper upload response: ', response);
          alert('Wallpaper uploaded successfully');
          return;
        }

        let params: DeviceUploadResourceParams | undefined;
        try {
          params = await generateUploadResParams({
            uri: image.uri ?? '',
            width: image.width ?? 0,
            height: image.height ?? 0,
            homeScreenSize: HomeScreenSize,
            homeScreenThumbnailSize: HomeScreenThumbnailSize,
            blurRadius: uploadScreenParams?.blurRadius ?? 100,
            blurOverlayOpacity: parseFloat(uploadScreenParams?.blurOverlayOpacity ?? '0.2'),
            cb: data => {
              setPreviewData(data?.base64 ? `data:image/png;base64,${data.base64}` : null);
            },
          });
          if (params) params.fileNameNoExt = uploadScreenParams?.fileNameNoExt;
        } catch (e) {
          console.log('image operate error: ', e);
          alert('Failed to process image');
          return;
        }

        if (params) {
          const response = await SDK?.deviceUploadResource(
            type === 'Bluetooth' ? selectedDevice?.connectId ?? '' : '',
            {
              ...commonParams,
              ...params,
            }
          );
          console.log('example firmwareUpdate response: ', response);
          alert('Wallpaper uploaded successfully');
        }
      } else {
        if (!uploadResParams && !protocolV2NftParams) {
          alert('Please load NFT data first');
          return;
        }

        if (preparedNftProtocol === 'V2') {
          if (!protocolV2NftParams) {
            throw new Error('Please reload NFT data for the selected Protocol V2 device');
          }
          if (!selectedDevice?.connectId) {
            throw new Error('Please connect the selected Protocol V2 device again');
          }
          const response = await SDK?.deviceUploadNft(
            selectedDevice.connectId,
            protocolV2NftParams
          );
          if (!response?.success) {
            throw new Error(response?.payload?.error || 'Protocol V2 NFT upload failed');
          }
          console.log('Protocol V2 NFT upload response: ', response);
          alert('NFT uploaded successfully');
          return;
        }

        if (preparedNftProtocol !== 'V1' || !uploadResParams) {
          throw new Error('Please reload NFT data for the selected Protocol V1 device');
        }

        const response = await SDK?.deviceUploadResource(
          type === 'Bluetooth' ? selectedDevice?.connectId ?? '' : '',
          {
            ...commonParams,
            ...uploadResParams,
            nftMetaData: uploadScreenParams?.nftMetaData || '',
          }
        );
        console.log('example firmwareUpdate response: ', response);
        alert('NFT uploaded successfully');
      }
    } catch (error) {
      console.error('Error uploading:', error);
      alert('Error uploading to device');
    } finally {
      setIsLoading(false);
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

  const isInputDisabled = isLoading;

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
          <Button onPress={pickImage} disabled={isLoading}>
            {intl.formatMessage({ id: 'action__pick_image' })}
          </Button>
        </Stack>
        <CommonInput
          type="text"
          label={intl.formatMessage({ id: 'label__res_file_suffix' })}
          value={uploadScreenParams?.suffix ?? ''}
          onChange={v => {
            if (!isInputDisabled) {
              setUploadScreenParams({ ...uploadScreenParams, suffix: v });
            }
          }}
        />
        <CommonInput
          type="text"
          label={intl.formatMessage({ id: 'label__res_file_name' })}
          value={uploadScreenParams?.fileNameNoExt ?? ''}
          placeholder="wp-file1-12345"
          onChange={v => {
            if (!isInputDisabled) {
              setUploadScreenParams({ ...uploadScreenParams, fileNameNoExt: v });
            }
          }}
        />
        <CommonInput
          type="number"
          label="Blur Radius"
          value={uploadScreenParams?.blurRadius?.toString() ?? '100'}
          placeholder="100"
          onChange={v => {
            if (!isInputDisabled) {
              try {
                parseInt(v);
              } catch (e) {
                alert('Blur Radius must be a number');
                return;
              }
              setUploadScreenParams({ ...uploadScreenParams, blurRadius: parseInt(v) });
            }
          }}
        />
        <CommonInput
          type="text"
          label="Blur Overlay Opacity"
          value={uploadScreenParams?.blurOverlayOpacity ?? '0.2'}
          placeholder="0.2"
          onChange={v => {
            if (!isInputDisabled) {
              setUploadScreenParams({ ...uploadScreenParams, blurOverlayOpacity: v });
            }
          }}
        />
        <Button onPress={() => handleScreenUpdate('WallPaper')} disabled={isLoading || !image}>
          {isLoading ? 'Uploading...' : intl.formatMessage({ id: 'action__upload' })}
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
            if (!isInputDisabled) {
              setNftUrl(v);
            }
          }}
        />
        <CommonInput
          type="text"
          label={intl.formatMessage({ id: 'label__nft_data' })}
          value={uploadScreenParams?.nftMetaData ?? ''}
          onChange={v => {
            if (!isInputDisabled) {
              setUploadScreenParams({ ...uploadScreenParams, nftMetaData: v });
            }
          }}
        />
        <CommonInput
          type="number"
          label="Blur Radius"
          value={uploadScreenParams?.blurRadius?.toString() ?? '100'}
          placeholder="100"
          onChange={v => {
            if (!isInputDisabled) {
              try {
                parseInt(v);
              } catch (e) {
                alert('Blur Radius must be a number');
                return;
              }
              setUploadScreenParams({ ...uploadScreenParams, blurRadius: parseInt(v) });
            }
          }}
        />
        <CommonInput
          type="text"
          label="Blur Overlay Opacity"
          value={uploadScreenParams?.blurOverlayOpacity ?? '0.2'}
          placeholder="0.2"
          onChange={v => {
            if (!isInputDisabled) {
              setUploadScreenParams({ ...uploadScreenParams, blurOverlayOpacity: v });
            }
          }}
        />
        <Button onPress={loadNftData} disabled={isLoading || !nftUrl} marginRight="$2">
          {isLoading ? 'Loading...' : 'Load NFT Data'}
        </Button>
        <Button
          onPress={() => handleScreenUpdate('Nft')}
          disabled={isLoading || (!uploadResParams && !protocolV2NftParams)}
        >
          {isLoading ? 'Uploading...' : intl.formatMessage({ id: 'action__upload' })}
        </Button>
      </XStack>
      {Platform.OS === 'web' && (
        <View flexDirection="row" alignItems="center">
          <Label paddingRight="$0" justifyContent="center">
            预览
          </Label>
          {image && (
            <ImageView
              height={800}
              width={480}
              source={{ uri: image.uri }}
              // this resize mode for nft
              resizeMode="contain"
            />
          )}
          {previewData && (
            // NFT
            <ImageView height={238} width={238} source={{ uri: previewData }} />
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
