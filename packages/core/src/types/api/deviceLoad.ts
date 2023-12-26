import { Success } from '@onekeyfe/hd-transport';
import type { CommonParams, Response } from '../params';

type DeviceLoadParams = {
  mnemonics?: string;
  pin?: string;
  passphrase_protection?: boolean;
  language?: string;
  label?: string;
  skip_checksum?: boolean;
  u2f_counter?: number;
  needs_backup?: boolean;
  no_backup?: boolean;
};

export declare function deviceLoad(
  connectId: string,
  params: CommonParams & DeviceLoadParams
): Response<Success>;
