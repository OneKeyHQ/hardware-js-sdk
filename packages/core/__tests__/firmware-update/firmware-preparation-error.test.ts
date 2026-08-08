import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { normalizeFirmwarePreparationError } from '../../src/api/firmware/FirmwarePreparationError';

describe('normalizeFirmwarePreparationError', () => {
  test('preserves structured firmware invariant errors', () => {
    const error = ERRORS.TypedError(
      HardwareErrorCode.RuntimeError,
      'Firmware must be prepared by the external firmware host',
      {
        firmwareUpdateCode: 'FirmwareArtifactsNotPrepared',
        artifactName: 'firmware',
      }
    );

    expect(normalizeFirmwarePreparationError(error)).toBe(error);
  });

  test('wraps ordinary preparation failures as firmware download errors', () => {
    const error = normalizeFirmwarePreparationError(new Error('request failed'));

    expect(error).toMatchObject({
      errorCode: HardwareErrorCode.FirmwareUpdateDownloadFailed,
      message: 'request failed',
    });
  });
});
