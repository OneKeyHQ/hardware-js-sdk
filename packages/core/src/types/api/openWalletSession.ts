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
    }
  | {
      /**
       * Compatibility form. `useEmptyPassphrase: true` opens the standard wallet;
       * otherwise a complete wallet binding resumes a hidden wallet and no binding
       * starts the hidden-wallet selection flow.
       */
      mode?: undefined;
      useEmptyPassphrase?: boolean;
      deviceId?: string;
      passphraseState?: string;
      sessionId?: string;
    };

export type OpenWalletSessionPayload = {
  protocol: 'V1' | 'V2';
  walletType: 'standard' | 'hidden';
  deviceId: string;
  passphraseState: string | null;
  sessionId: string | null;
  resumed: boolean;
};

/**
 * Opens the standard, hidden, or Attach-to-PIN wallet flow through a unified
 * Protocol V1/V2 API.
 */
export declare function openWalletSession(
  connectId: string,
  params: CommonParams & OpenWalletSessionParams
): Response<OpenWalletSessionPayload>;
