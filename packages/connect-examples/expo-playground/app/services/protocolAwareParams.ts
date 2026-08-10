import { Buffer } from 'buffer';

const normalizeBase64File = (value: unknown): unknown => {
  if (typeof value === 'string') return value;
  if (value instanceof ArrayBuffer) {
    return Buffer.from(value).toString('base64');
  }
  if (ArrayBuffer.isView(value)) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength).toString('base64');
  }
  return value;
};

export const normalizeProtocolAwareParams = (
  method: string,
  params: Record<string, unknown>
): Record<string, unknown> => {
  const normalized = { ...params };

  if (method === 'openWalletSession') {
    delete normalized.useEmptyPassphrase;
    delete normalized.initSession;
    if (normalized.mode !== 'resume-hidden') {
      delete normalized.deviceId;
      delete normalized.passphraseState;
    }
  }

  if (method === 'deviceUploadWallpaper') {
    normalized.jpegBase64 = normalizeBase64File(normalized.jpegBase64);
  }

  if (method === 'deviceUploadNft') {
    normalized.imageJpegBase64 = normalizeBase64File(normalized.imageJpegBase64);
    normalized.thumbnailJpegBase64 = normalizeBase64File(normalized.thumbnailJpegBase64);
  }

  if (method === 'uploadPortfolio') {
    normalized.packageBase64 = normalizeBase64File(normalized.packageBase64);
  }

  return normalized;
};
