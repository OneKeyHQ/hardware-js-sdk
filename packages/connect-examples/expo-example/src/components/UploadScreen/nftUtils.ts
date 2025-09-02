import { Image as ImageView } from 'react-native';
import { Action, manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { DeviceUploadResourceParams } from '@onekeyfe/hd-core';
import { bytesToHex } from '@noble/hashes/utils';
import { ResourceType } from '@onekeyfe/hd-transport';
import { canvasRGBA as blurCanvasRGBA } from 'stackblur-canvas';

import axios from 'axios';

function buildHtmlImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    // @ts-ignore
    image.onerror = e => reject(e);
    image.src = dataUrl;
  });
}

function htmlImageToCanvas({
  image,
  width,
  height,
}: {
  image: HTMLImageElement;
  width: number;
  height: number;
}) {
  const canvas = document.createElement('canvas');
  canvas.height = height;
  canvas.width = width;

  const ctx = canvas.getContext('2d');
  if (ctx == null) {
    throw new Error('2D context is null');
  }

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0);

  return { canvas, ctx };
}

function stripBase64UriPrefix(base64Uri: string): string {
  return base64Uri.replace(/^data:image\/\w+;base64,/, '');
}

export async function processImageBlur({
  base64Data,
  blurRadius = 100,
  overlayOpacity = 0.2,
}: {
  base64Data: string;
  blurRadius?: number;
  overlayOpacity?: number;
}): Promise<{
  hex: string;
  width: number;
  height: number;
}> {
  if (!base64Data || typeof base64Data !== 'string') {
    throw new Error('Invalid base64 data');
  }

  if (!base64Data.startsWith('data:image/')) {
    // eslint-disable-next-line no-param-reassign
    base64Data = `data:image/jpeg;base64,${base64Data}`;
  }

  const img = await buildHtmlImage(base64Data);

  try {
    // 1. create canvas
    const { canvas, ctx } = htmlImageToCanvas({
      image: img,
      width: img.width,
      height: img.height,
    });

    // 2. add black semi-transparent mask
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = `rgba(0, 0, 0, ${overlayOpacity})`;
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalCompositeOperation = 'source-over';

    // 3. apply blur effect
    if (blurRadius > 0) {
      try {
        blurCanvasRGBA(canvas, 0, 0, canvas.width, canvas.height, Math.min(blurRadius, 400));
      } catch (blurError) {
        console.warn('blur processing failed, skip blur effect:', blurError);
      }
    }

    const base64Uri = canvas.toDataURL('image/jpeg');

    const base64 = stripBase64UriPrefix(base64Uri);
    const buffer = Buffer.from(base64, 'base64');
    const hex = buffer.toString('hex');

    return {
      hex: hex || '',
      width: canvas.width,
      height: canvas.height,
    };
  } catch (error) {
    throw new Error(`Canvas processing failed: ${(error as Error).message}`);
  }
}

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
    ImageView.getSize(
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

function getOriginY(originW: number, originH: number, scaleW: number, scaleH: number) {
  const height = Math.ceil((scaleW / originW) * originH);
  console.log(`image true height: `, height);
  console.log(`image should height: `, scaleH);
  console.log(`image true width: `, scaleW);
  if (height <= scaleH) {
    return null;
  }
  const originY = Math.ceil(Math.ceil(height / 2) - Math.ceil(scaleH / 2));
  console.log(`originY: `, originY);
  console.log(`crop size: height: ${scaleH}, width: ${scaleW}, , originX: 0, originY: ${originY}`);
  return originY;
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
  const aspectRatioLonger = originW > originH;
  const aspectRatioEqueal = originW === originH;

  const actions: Action[] = [];
  if (!isThumbnail) {
    actions.push({
      resize: { width },
    });
  } else {
    actions.push({
      resize: {
        width: aspectRatioLonger ? undefined : width,
        height: aspectRatioLonger ? height : undefined,
      },
    });
  }

  if (isThumbnail && !aspectRatioEqueal) {
    if (aspectRatioLonger) {
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
    } else {
      const originY = getOriginY(originW, originH, width, height);
      if (originY !== null) {
        actions.push({
          crop: {
            height,
            width,
            originX: 0,
            originY,
          },
        });
      }
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

export const generateUploadNFTParams = async ({
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
  const data = await compressNFT(
    uri,
    homeScreenSize?.width ?? 480,
    homeScreenSize?.height ?? 800,
    width,
    height,
    false
  );
  const zoomData = await compressNFT(
    uri,
    homeScreenThumbnailSize?.width ?? 238,
    homeScreenThumbnailSize?.width ?? 238,
    width,
    height,
    true
  );

  const blurData = await processImageBlur({
    base64Data: data?.base64 ?? '',
    blurRadius: blurRadius ?? 100,
    overlayOpacity: blurOverlayOpacity ?? 0.2,
  });

  cb?.(zoomData as any);

  if (!data?.arrayBuffer && !zoomData?.arrayBuffer) return;

  console.log('nft data byte length: ', formatBytes(data?.arrayBuffer?.byteLength ?? 0, 3));
  console.log(
    'nft thumbnail byte length: ',
    formatBytes(zoomData?.arrayBuffer?.byteLength ?? 0, 3)
  );

  const metaData = {
    header: 'Hello onekey',
    subheader: 'Hello NFT',
    network: 'BNB Chain',
    owner: '0x1234',
  };
  let metadataBuf = Buffer.from(JSON.stringify(metaData));
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
    blurDataHex: blurData.hex,
    nftMetaData,
  };

  return params;
};
