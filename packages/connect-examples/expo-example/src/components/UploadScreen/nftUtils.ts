import { Image } from 'react-native';
import { Action, manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { DeviceUploadResourceParams } from '@onekeyfe/hd-core';
import { bytesToHex } from '@noble/hashes/utils';
import { ResourceType } from '@onekeyfe/hd-transport';

import axios from 'axios';

export function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
}

export const getImageSize: (
  imageUrl: string
) => Promise<{ width: number; height: number }> = imageUrl =>
  new Promise((resolve, reject) => {
    Image.getSize(
      imageUrl,
      (width: number, height: number) => {
        resolve({ width, height });
      },
      (error: any) => reject(error)
    );
  });

/**
 *	use axios to convert image url to base64
 * @param image
 */
export const imageToBase64 = async (image: string) => {
  const response = await axios.get(image, {
    responseType: 'arraybuffer',
  });
  const buffer = Buffer.from(response.data, 'binary').toString('base64');
  return `data:${response.headers['content-type']};base64,${buffer}`;
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

export const compressNFT = async (
  uri: string,
  width: number,
  height: number,
  originW: number,
  originH: number,
  isThumbnail: boolean
) => {
  if (!uri) return;
  console.log(`width: ${width}, height: ${height}, originW: ${originW}, originH: ${originH}`);
  const actions: Action[] = [
    {
      resize: {
        height: isThumbnail ? height : undefined,
        width: isThumbnail ? undefined : width,
      },
    },
  ];
  if (isThumbnail) {
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
  }
  const imageResult = await manipulateAsync(uri, actions, {
    compress: 0.9,
    format: SaveFormat.JPEG,
    base64: true,
  });

  console.log('imageResult ====> : ', imageResult);

  const buffer = Buffer.from(imageResult.base64 ?? '', 'base64');
  const arrayBuffer = new Uint8Array(buffer);
  return {
    ...imageResult,
    arrayBuffer,
  };
};

export const generateUploadNFTParams = async (
  uri: string,
  width: number,
  height: number,
  cb?: (data: { base64?: string }) => void
) => {
  const data = await compressNFT(uri, 480, 800, width, height, false);
  const zoomData = await compressNFT(uri, 238, 238, width, height, true);

  cb?.(data as any);

  if (!data?.arrayBuffer && !zoomData?.arrayBuffer) return;

  console.log('nft data byte length: ', formatBytes(data?.arrayBuffer?.byteLength ?? 0, 3));
  console.log(
    'nft thumbnail byte length: ',
    formatBytes(zoomData?.arrayBuffer?.byteLength ?? 0, 3)
  );

  const metaData = {
    header: 'Hello onekey',
    // subheader: 'Hello NFT',
    subheader:
      'javascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascriptjavascript',
    network: 'BNB Chain',
    owner: '0x1234',
  };
  let metadataBuf = Buffer.from(JSON.stringify(metaData));
  console.log('1');
  if (metadataBuf.length > 1024 * 2) {
    metaData.subheader = '';
    metadataBuf = Buffer.from(JSON.stringify(metaData));
  }
  const nftMetaData = bytesToHex(metadataBuf);

  const params: DeviceUploadResourceParams = {
    resType: ResourceType.Nft,
    suffix: 'jpg',
    dataHex: bytesToHex(data?.arrayBuffer as Uint8Array),
    thumbnailDataHex: bytesToHex(zoomData?.arrayBuffer as Uint8Array),
    nftMetaData,
  };

  return params;
};
