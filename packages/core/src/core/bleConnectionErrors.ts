import { HardwareErrorCode } from '@onekeyfe/hd-shared';

import type { BaseMethod } from '../api/BaseMethod';

export function isRetryableBleProtocolV2ProbeError(method: BaseMethod, error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    method.payload.connectProtocol === 'V2' &&
    message.includes('Device protocol mismatch') &&
    message.includes('expected V2') &&
    message.includes('did not respond to expected protocol')
  );
}

export function shouldStopBleConnectionPolling(method: BaseMethod, error: unknown) {
  const errorCode = (error as { errorCode?: unknown } | null)?.errorCode;
  return (
    method.payload.reuseConnectedOnly === true ||
    errorCode === HardwareErrorCode.BleRequiredUUID ||
    isRetryableBleProtocolV2ProbeError(method, error)
  );
}

export function shouldRetryBleConnection(method: BaseMethod, error: unknown) {
  if (method.payload.reuseConnectedOnly) {
    return false;
  }
  const errorCode = (error as { errorCode?: unknown } | null)?.errorCode;
  return (
    errorCode === HardwareErrorCode.BleTimeoutError ||
    errorCode === HardwareErrorCode.BleConnectedError ||
    isRetryableBleProtocolV2ProbeError(method, error)
  );
}
