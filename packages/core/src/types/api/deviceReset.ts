import { Success } from '@onekeyfe/hd-transport/src/types/messages';
import type { CommonParams, Response } from '../params';

export type DeviceResetParams = {
  displayRandom?: boolean;
  strength?: number;
  passphraseProtection?: boolean;
  pinProtection?: boolean;
  language?: string;
  label?: string;
  u2fCounter?: number;
  skipBackup?: boolean;
  noBackup?: boolean;
  backupType?: string | number;
};

export declare function deviceReset(params: CommonParams & DeviceResetParams): Response<Success>;
