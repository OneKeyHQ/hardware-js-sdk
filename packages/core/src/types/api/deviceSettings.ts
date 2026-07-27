import type { Enum_SafetyCheckLevel, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type DeviceSettingsParams = {
  language?: string;
  label?: string;
  usePassphrase?: boolean;
  /** Protocol V1 only. */
  homescreen?: string;
  /** Protocol V1 only. */
  passphraseSource?: number;
  autoLockDelayMs?: number;
  /** Protocol V1 only. */
  displayRotation?: number;
  /** Protocol V1 only. */
  passphraseAlwaysOnDevice?: boolean;
  /** Protocol V1 only. Uses Enum_SafetyCheckLevel numeric values. */
  safetyChecks?: Enum_SafetyCheckLevel;
  /** Protocol V1 only; the current Protocol V2 schema has no matching field. */
  experimentalFeatures?: boolean;
  autoShutdownDelayMs?: number;
  /** Protocol V1 only; opens the legacy device-side brightness flow. */
  changeBrightness?: boolean;
  /** Protocol V2 only. */
  brightness?: number;
  hapticFeedback?: boolean;
  bluetoothEnabled?: boolean;
  /** Protocol V2 only; changed through an on-device confirmation page. */
  airgapMode?: boolean;
  /** Protocol V2 only. */
  animationEnabled?: boolean;
  /** Protocol V2 only. */
  tapToWake?: boolean;
  /** Protocol V2 only. */
  deviceNameDisplayEnabled?: boolean;
  /** Protocol V2 only. */
  fidoEnabled?: boolean;
  /** Protocol V2 only. */
  usbLockEnabled?: boolean;
  /** Protocol V2 only. */
  randomKeypad?: boolean;
};

export declare function deviceSettings(
  connectId: string,
  params: CommonParams & DeviceSettingsParams
): Response<Success>;
