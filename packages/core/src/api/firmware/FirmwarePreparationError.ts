import { ERRORS, HardwareError, HardwareErrorCode } from '@onekeyfe/hd-shared';

export const normalizeFirmwarePreparationError = (error: unknown) => {
  if (error instanceof HardwareError && error.params?.firmwareUpdateCode) {
    return error;
  }

  return ERRORS.TypedError(
    HardwareErrorCode.FirmwareUpdateDownloadFailed,
    error instanceof Error ? error.message : String(error)
  );
};
