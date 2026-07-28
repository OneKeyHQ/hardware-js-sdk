import type { CommonParams, Response } from '../params';

export type OpenWalletSessionParams =
  | {
      mode: 'standard';
      deviceId?: never;
      passphraseState?: never;
      useEmptyPassphrase?: never;
      initSession?: never;
    }
  | {
      mode: 'select-hidden';
      deviceId?: never;
      passphraseState?: never;
      useEmptyPassphrase?: never;
      initSession?: never;
    }
  | {
      mode: 'resume-hidden';
      deviceId: string;
      passphraseState: string;
      useEmptyPassphrase?: never;
      initSession?: never;
    }
  | {
      /**
       * Compatibility form. `useEmptyPassphrase: true` opens the standard wallet;
       * otherwise `initSession: true` starts a fresh hidden-wallet selection, a
       * complete wallet binding resumes a hidden wallet, and no binding starts the
       * hidden-wallet selection flow.
       */
      mode?: undefined;
      useEmptyPassphrase?: boolean;
      initSession?: boolean;
      deviceId?: string;
      passphraseState?: string;
    };

type OpenWalletSessionPayloadBase = {
  protocol: 'V1' | 'V2';
  deviceId: string;
  resumed: boolean;
};

export type OpenWalletSessionPayload = OpenWalletSessionPayloadBase &
  (
    | {
        walletType: 'standard';
        passphraseState: null;
        sessionId?: never;
      }
    | {
        walletType: 'hidden';
        passphraseState: string;
        /** CLI compatibility only; applications should resume by wallet binding. */
        sessionId?: string;
      }
  );

/**
 * Opens the standard, hidden, or Attach-to-PIN wallet flow through a unified
 * Protocol V1/V2 API.
 */
export declare function openWalletSession(
  connectId: string,
  params: CommonParams & OpenWalletSessionParams
): Response<OpenWalletSessionPayload>;
