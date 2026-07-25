import type { CommonParams, Response } from '../params';

export type OpenWalletSessionParams =
  | {
      mode: 'standard';
      deviceId?: never;
      passphraseState?: never;
      sessionId?: never;
    }
  | {
      mode: 'select-hidden';
      deviceId?: never;
      passphraseState?: never;
      sessionId?: never;
    }
  | {
      mode: 'resume-hidden';
      deviceId: string;
      passphraseState: string;
      sessionId: string;
    };

export type OpenWalletSessionPayload = {
  protocol: 'V2';
  walletType: 'standard' | 'hidden';
  deviceId: string;
  passphraseState: string | null;
  sessionId: string | null;
  resumed: boolean;
};

export declare function openWalletSession(
  connectId: string,
  params: CommonParams & OpenWalletSessionParams
): Response<OpenWalletSessionPayload>;
