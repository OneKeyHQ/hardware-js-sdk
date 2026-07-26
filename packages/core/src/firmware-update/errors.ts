import { type HardwareError, HardwareErrorCode, TypedError } from '@onekeyfe/hd-shared';

export const FirmwareUpdateErrorCode = {
  FirmwareManifestModeMismatch: HardwareErrorCode.FirmwareManifestModeMismatch,
  FirmwareManifestInvalid: HardwareErrorCode.FirmwareManifestInvalid,
  FirmwareManifestIntegrityMissing: HardwareErrorCode.FirmwareManifestIntegrityMissing,
  FirmwarePlanInvalid: HardwareErrorCode.FirmwarePlanInvalid,
  FirmwarePlanDigestMismatch: HardwareErrorCode.FirmwarePlanDigestMismatch,
  FirmwareArtifactsNotPrepared: HardwareErrorCode.FirmwareArtifactsNotPrepared,
  FirmwareArtifactReceiptMismatch: HardwareErrorCode.FirmwareArtifactReceiptMismatch,
  FirmwareArtifactReaderInvalid: HardwareErrorCode.FirmwareArtifactReaderInvalid,
  FirmwareArtifactReadOutOfBounds: HardwareErrorCode.FirmwareArtifactReadOutOfBounds,
  FirmwareArtifactReadTooLarge: HardwareErrorCode.FirmwareArtifactReadTooLarge,
  FirmwareCheckpointRejected: HardwareErrorCode.FirmwareCheckpointRejected,
  FirmwareTransactionConflict: HardwareErrorCode.FirmwareTransactionConflict,
  FirmwareDeviceStateConflict: HardwareErrorCode.FirmwareDeviceStateConflict,
  FirmwareReconciliationUnavailable: HardwareErrorCode.FirmwareReconciliationUnavailable,
} as const;

export type FirmwareUpdateErrorCodeValue =
  (typeof FirmwareUpdateErrorCode)[keyof typeof FirmwareUpdateErrorCode];

export const createFirmwareUpdateError = (
  errorCode: FirmwareUpdateErrorCodeValue,
  message?: string,
  params?: Record<string, unknown>
): HardwareError => TypedError(errorCode, message, params);
