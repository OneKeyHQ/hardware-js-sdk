import type { CommonParams, Response } from '../params';

export type OpenWalletSessionParams =
  | {
      mode: 'standard';
      deviceId?: never;
      passphraseState?: never;
    }
  | {
      mode: 'select-hidden';
      deviceId?: never;
      passphraseState?: never;
    }
  | {
      mode: 'resume-hidden';
      deviceId: string;
      passphraseState: string;
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
      }
    | {
        walletType: 'hidden';
        passphraseState: string;
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
