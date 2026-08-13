import { Buffer } from 'buffer';
import { encode as encodeJpeg } from 'jpeg-js';

import { decodeCanonicalBase64, decodeJpegBase64ToRgba } from '../src/api/helpers/base64Data';

const createJpegBase64 = (width: number, height: number) => {
  const rgba = new Uint8Array(width * height * 4).fill(0xff);
  return encodeJpeg({ width, height, data: rgba }, 80).data.toString('base64');
};

describe('Base64 resource data', () => {
  test('decodes canonical Base64 to a detached Uint8Array', () => {
    const decoded = decodeCanonicalBase64({
      value: 'AQID',
      parameterName: 'packageBase64',
      maxBytes: 3,
    });

    expect(decoded).toBeInstanceOf(Uint8Array);
    expect(Array.from(decoded)).toEqual([1, 2, 3]);
  });

  test.each(['', 'not-base64', 'AB==', 'data:image/jpeg;base64,AQID'])(
    'rejects non-canonical Base64 input %p',
    value => {
      expect(() =>
        decodeCanonicalBase64({ value, parameterName: 'data', maxBytes: 1024 })
      ).toThrow();
    }
  );

  test('rejects oversized Base64 before decoding', () => {
    const value = Buffer.alloc(64 * 1024 + 17).toString('base64');
    expect(() =>
      decodeCanonicalBase64({ value, parameterName: 'data', maxBytes: 64 * 1024 })
    ).toThrow('maximum supported size');
  });

  test('decodes and validates a JPEG with the expected dimensions', () => {
    const decoded = decodeJpegBase64ToRgba({
      jpegBase64: createJpegBase64(2, 1),
      parameterName: 'jpegBase64',
      expectedWidth: 2,
      expectedHeight: 1,
    });

    expect(decoded).toMatchObject({ width: 2, height: 1 });
    expect(decoded.data).toHaveLength(8);
  });

  test('rejects non-JPEG bytes and unexpected dimensions', () => {
    expect(() =>
      decodeJpegBase64ToRgba({
        jpegBase64: 'AQID',
        parameterName: 'jpegBase64',
        expectedWidth: 2,
        expectedHeight: 1,
      })
    ).toThrow('JPEG image');
    expect(() =>
      decodeJpegBase64ToRgba({
        jpegBase64: createJpegBase64(2, 1),
        parameterName: 'jpegBase64',
        expectedWidth: 1,
        expectedHeight: 1,
      })
    ).toThrow('1x1');
  });
});
