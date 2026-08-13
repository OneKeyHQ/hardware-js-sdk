import { Buffer } from 'buffer';
import { decode as decodeJpeg } from 'jpeg-js';

import { invalidParameter } from './filesystemValidation';

const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const JPEG_CONTAINER_OVERHEAD_BYTES = 64 * 1024;
const JPEG_MAX_MEMORY_USAGE_IN_MB = 32;
const JPEG_MAX_RESOLUTION_IN_MP = 1;

export function decodeCanonicalBase64({
  value,
  parameterName,
  maxBytes,
}: {
  value: unknown;
  parameterName: string;
  maxBytes: number;
}): Uint8Array {
  if (typeof value !== 'string' || value.length === 0) {
    throw invalidParameter(`Parameter [${parameterName}] must be a non-empty Base64 string.`);
  }
  if (value.length > Math.ceil(maxBytes / 3) * 4) {
    throw invalidParameter(`Parameter [${parameterName}] exceeds the maximum supported size.`);
  }
  if (value.length % 4 !== 0 || !BASE64_PATTERN.test(value)) {
    throw invalidParameter(`Parameter [${parameterName}] must use canonical Base64 encoding.`);
  }

  const decoded = Buffer.from(value, 'base64');
  if (decoded.byteLength === 0 || decoded.byteLength > maxBytes) {
    throw invalidParameter(`Parameter [${parameterName}] exceeds the maximum supported size.`);
  }
  if (decoded.toString('base64') !== value) {
    throw invalidParameter(`Parameter [${parameterName}] must use canonical Base64 encoding.`);
  }
  return Uint8Array.from(decoded);
}

export function decodeJpegBase64ToRgba({
  jpegBase64,
  parameterName,
  expectedWidth,
  expectedHeight,
}: {
  jpegBase64: unknown;
  parameterName: string;
  expectedWidth: number;
  expectedHeight: number;
}): { width: number; height: number; data: Uint8Array } {
  const jpegBytes = decodeCanonicalBase64({
    value: jpegBase64,
    parameterName,
    maxBytes: expectedWidth * expectedHeight * 8 + JPEG_CONTAINER_OVERHEAD_BYTES,
  });
  if (jpegBytes[0] !== 0xff || jpegBytes[1] !== 0xd8) {
    throw invalidParameter(`Parameter [${parameterName}] must contain a JPEG image.`);
  }

  let decoded: { width: number; height: number; data: Uint8Array };
  try {
    decoded = decodeJpeg(jpegBytes, {
      useTArray: true,
      formatAsRGBA: true,
      tolerantDecoding: false,
      maxResolutionInMP: JPEG_MAX_RESOLUTION_IN_MP,
      maxMemoryUsageInMB: JPEG_MAX_MEMORY_USAGE_IN_MB,
    });
  } catch {
    throw invalidParameter(`Parameter [${parameterName}] must contain a valid JPEG image.`);
  }

  if (decoded.width !== expectedWidth || decoded.height !== expectedHeight) {
    throw invalidParameter(
      `Parameter [${parameterName}] must contain a ${expectedWidth}x${expectedHeight} JPEG image.`
    );
  }
  const expectedLength = expectedWidth * expectedHeight * 4;
  if (decoded.data.byteLength !== expectedLength) {
    throw invalidParameter(
      `Decoded parameter [${parameterName}] must contain ${expectedLength} RGBA bytes.`
    );
  }
  return decoded;
}
