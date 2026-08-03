import type { HardwareConnectProtocol } from '@onekeyfe/hd-shared';

export interface CommonParams {
  keepSession?: boolean;
  /**
   * polling connect max retry count
   */
  retryCount?: number;
  /**
   * polling interval time
   */
  pollIntervalTime?: number;
  /**
   * Timeout time for single polling
   */
  timeout?: number;
  /**
   * DeviceInfoGet timeout during Protocol V2 initialization.
   */
  protocolV2DeviceInfoTimeoutMs?: number;
  /**
   * passphrase state
   */
  passphraseState?: string;
  /**
   * Use empty passphrase
   */
  useEmptyPassphrase?: boolean;
  /**
   * Every init session
   */
  initSession?: boolean;

  /**
   * Use derive cardano
   */
  deriveCardano?: boolean;

  // Detect hardware that is in bootloader mode and return an error
  detectBootloaderDevice?: boolean;

  /**
   * Skip web device prompt
   */
  skipWebDevicePrompt?: boolean;

  /**
   * Skip passphrase check
   */
  skipPassphraseCheck?: boolean;

  /**
   * Only connect device, not initialize device, only ble connect
   */
  onlyConnectBleDevice?: boolean;

  /**
   * Use pre-initialized device state (BLE only)
   */
  usePreInitialize?: boolean;

  /**
   * Strictly expected transport protocol. The SDK actively verifies this value and
   * rejects a mismatch. After a successful probe, the cached protocol is also strict.
   */
  connectProtocol?: HardwareConnectProtocol;

  /**
   * Ignore a previously bound protocol for this call and actively detect the
   * protocol again. Intended for the first verified connection or explicit recovery.
   */
  forceProtocolDetection?: boolean;
}

export type Params<T> = CommonParams & T & { bundle?: undefined };

export interface Unsuccessful {
  success: false;
  payload: { error: string; code?: string | number };
}

export interface Success<T> {
  success: true;
  payload: T;
}

export type Response<T> = Promise<Success<T> | Unsuccessful>;
