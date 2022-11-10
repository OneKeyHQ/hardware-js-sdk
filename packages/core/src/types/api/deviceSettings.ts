import { SafetyCheckLevel, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type DeviceSettingsParams = {
  language?: string;
  label?: string;
  usePassphrase?: boolean;
  homescreen?: string;
  passphraseSource?: number;
  autoLockDelayMs?: number;
  displayRotation?: number;
  passphraseAlwaysOnDevice?: boolean;
  safetyChecks?: SafetyCheckLevel;
  experimentalFeatures?: boolean;
};

export declare function deviceSettings(
  connectId: string,
  params: CommonParams & DeviceSettingsParams
): Response<Success>;
