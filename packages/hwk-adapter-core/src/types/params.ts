/**
 * Common parameters accepted by all chain methods.
 * Matches @onekeyfe/hd-core CommonParams interface.
 */
export interface CommonParams {
  keepSession?: boolean;
  retryCount?: number;
  pollIntervalTime?: number;
  timeout?: number;
  passphraseState?: string;
  useEmptyPassphrase?: boolean;
  initSession?: boolean;
  deriveCardano?: boolean;
  detectBootloaderDevice?: boolean;
  skipWebDevicePrompt?: boolean;
  skipPassphraseCheck?: boolean;
  onlyConnectBleDevice?: boolean;
}
