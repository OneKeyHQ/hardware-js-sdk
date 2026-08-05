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

  if (method === 'deviceUploadNft') {
    normalized.image = {
      width: normalized.imageWidth,
      height: normalized.imageHeight,
      rgba: normalized.imageRgba,
    };
    normalized.thumbnail = {
      width: normalized.thumbnailWidth,
      height: normalized.thumbnailHeight,
      rgba: normalized.thumbnailRgba,
    };
    for (const field of [
      'imageWidth',
      'imageHeight',
      'imageRgba',
      'thumbnailWidth',
      'thumbnailHeight',
      'thumbnailRgba',
    ]) {
      delete normalized[field];
    }
  }

  return normalized;
};
