import type { CommonParams, Response } from '../params';

export type OpenWalletSessionParams =
  | {
      mode: 'standard';
      access?: never;
      deviceId?: never;
      passphraseState?: never;
    }
  | {
      mode: 'hidden';
      access: 'prompt' | 'passphrase' | 'attach-pin';
      deviceId?: never;
      passphraseState?: never;
    }
  | {
      mode: 'resume-hidden';
      access?: never;
      deviceId: string;
      passphraseState: string;
    };

type OpenWalletSessionPayloadBase = {
  protocol: 'V1' | 'V2';
  deviceId: string;
  resumed: boolean;
  /** Forwarded only when the firmware response contains a wallet session id. */
  sessionId?: string;
};

export type OpenWalletSessionPayload = OpenWalletSessionPayloadBase &
  (
    | {
        walletType: 'standard';
        passphraseState: null;
      }
    | {
        walletType: 'hidden';
        passphraseState: string;
      }
  );

/**
 * Opens the standard wallet, explicitly selects a hidden-wallet access method,
 * or resumes a known hidden wallet through a unified Protocol V1/V2 API.
 */
export declare function openWalletSession(
  connectId: string,
  params: CommonParams & OpenWalletSessionParams
): Response<OpenWalletSessionPayload>;
