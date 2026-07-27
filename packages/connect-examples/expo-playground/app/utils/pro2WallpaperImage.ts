export const PRO2_WALLPAPER_WIDTH = 604;
export const PRO2_WALLPAPER_HEIGHT = 1024;

const SUPPORTED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export type PreparedPro2Wallpaper = {
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  mimeType: string;
  rgba: Uint8Array;
  previewUrl: string;
  hasTransparency: boolean;
  estimatedBinSize: number;
};

export function isSupportedWallpaperMimeType(mimeType: string): boolean {
  return SUPPORTED_MIME_TYPES.has(mimeType.toLowerCase());
}

export function calculateCoverCrop(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth = PRO2_WALLPAPER_WIDTH,
  targetHeight = PRO2_WALLPAPER_HEIGHT
) {
  const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  return {
    dx: (targetWidth - drawWidth) / 2,
    dy: (targetHeight - drawHeight) / 2,
    drawWidth,
    drawHeight,
  };
}

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') return createImageBitmap(file);

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function preparePro2Wallpaper(file: File): Promise<PreparedPro2Wallpaper> {
  if (!isSupportedWallpaperMimeType(file.type)) {
    throw new Error('仅支持 PNG、JPEG/JPG 和 WebP 图片。');
  }

  const source = await loadImage(file);
  const originalWidth = source.width;
  const originalHeight = source.height;
  if (!originalWidth || !originalHeight) throw new Error('无法读取图片尺寸。');

  const canvas = document.createElement('canvas');
  canvas.width = PRO2_WALLPAPER_WIDTH;
  canvas.height = PRO2_WALLPAPER_HEIGHT;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('当前浏览器不支持 Canvas 图片转换。');

  context.clearRect(0, 0, canvas.width, canvas.height);
  const crop = calculateCoverCrop(originalWidth, originalHeight);
  context.drawImage(source, crop.dx, crop.dy, crop.drawWidth, crop.drawHeight);
  if ('close' in source && typeof source.close === 'function') source.close();

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const rgba = new Uint8Array(imageData.data);
  let hasTransparency = false;
  for (let index = 3; index < rgba.length; index += 4) {
    if (rgba[index] !== 255) {
      hasTransparency = true;
      break;
    }
  }

  const rgbStride = PRO2_WALLPAPER_WIDTH * 2;
  const estimatedBinSize =
    12 +
    rgbStride * PRO2_WALLPAPER_HEIGHT +
    (hasTransparency ? PRO2_WALLPAPER_WIDTH * PRO2_WALLPAPER_HEIGHT : 0);

  return {
    width: canvas.width,
    height: canvas.height,
    originalWidth,
    originalHeight,
    mimeType: file.type,
    rgba,
    previewUrl: canvas.toDataURL('image/png'),
    hasTransparency,
    estimatedBinSize,
  };
}
