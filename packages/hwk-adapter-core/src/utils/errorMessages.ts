import { HardwareErrorCode } from '../types/errors';

/**
 * Enrich a hardware error message with actionable recovery hints.
 * Shared across adapters (Ledger, Trezor, etc.).
 */
export function enrichErrorMessage(code: HardwareErrorCode, originalMessage: string): string {
  switch (code) {
    case HardwareErrorCode.PinInvalid:
      return `${originalMessage}. Please re-enter your PIN.`;
    case HardwareErrorCode.PinCancelled:
      return `${originalMessage}. PIN entry was cancelled.`;
    case HardwareErrorCode.DeviceBusy:
      return `${originalMessage}. The device is in use by another application. Close other wallet apps and try again.`;
    case HardwareErrorCode.DeviceDisconnected:
      return `${originalMessage}. Please reconnect the device and try again.`;
    case HardwareErrorCode.DeviceLocked:
      return `${originalMessage}. Please unlock your device and try again.`;
    case HardwareErrorCode.UserRejected:
      return `${originalMessage}. The request was rejected on the device.`;
    case HardwareErrorCode.WrongApp:
      return `${originalMessage}. Please open the correct app on your device.`;
    case HardwareErrorCode.AppNotInstalled:
      return `${originalMessage}. The required app is not installed on the device.`;
    case HardwareErrorCode.DeviceOutOfMemory:
      return `${originalMessage}. Not enough free space on the device. Please uninstall some apps and try again.`;
    case HardwareErrorCode.TransportNotAvailable:
      return `${originalMessage}. Ensure the device bridge/transport is available and running.`;
    case HardwareErrorCode.FirmwareTooOld:
      return `${originalMessage}. Please update your device firmware.`;
    case HardwareErrorCode.DeviceNotInitialized:
      return `${originalMessage}. The device may need to be set up first.`;
    case HardwareErrorCode.OperationTimeout:
      return `${originalMessage}. The operation timed out. Please try again.`;
    case HardwareErrorCode.EvmBlindSigningRequired:
      return 'Ledger: Blind signing not enabled in Ethereum app.';
    case HardwareErrorCode.EvmClearSignPluginMissing:
      return 'Ledger: Required plugin not installed (install via Ledger Live).';
    case HardwareErrorCode.EvmDataTooLarge:
      return 'Ledger: Transaction data too large for device memory.';
    case HardwareErrorCode.EvmTxTypeNotSupported:
      return 'Ledger: Transaction type not supported by current Ethereum app.';
    case HardwareErrorCode.AppTooOld:
      return 'Ledger: App out of date (update via Ledger Live).';
    case HardwareErrorCode.SolanaBlindSigningRequired:
      return 'Blind signing disabled in the Solana app.';
    case HardwareErrorCode.TronCustomContractRequired:
      return 'Custom Contracts setting disabled in the Tron app.';
    case HardwareErrorCode.TronDataSigningRequired:
      return 'Transactions Data setting disabled in the Tron app.';
    case HardwareErrorCode.TronSignByHashRequired:
      return 'Sign by Hash setting disabled in the Tron app.';
    case HardwareErrorCode.BtcWalletPolicyHmacMismatch:
      return 'Wallet policy not registered or HMAC mismatch.';
    case HardwareErrorCode.BtcUnexpectedState:
      return 'Signing aborted due to unexpected device state.';
    default:
      return originalMessage;
  }
}
