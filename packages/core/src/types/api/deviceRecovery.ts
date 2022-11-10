import { RecoveryDeviceType, Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

export type DeviceRecoveryParams = {
  wordCount?: number;
  passphraseProtection?: boolean;
  pinProtection?: boolean;
  language?: string;
  label?: string;
  enforceWordlist?: boolean;
  type?: RecoveryDeviceType;
  u2fCounter?: number;
  dryRun?: boolean;
};

export declare function deviceRecovery(
  connectId: string,
  params: CommonParams & DeviceRecoveryParams
): Response<Success>;
