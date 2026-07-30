import type { CommonParams, Response } from '../params';

export const OpenWalletSessionMode = {
  Standard: 'standard',
  SelectHidden: 'select-hidden',
  ResumeHidden: 'resume-hidden',
} as const;

export type OpenWalletSessionModeValue =
  (typeof OpenWalletSessionMode)[keyof typeof OpenWalletSessionMode];

export type OpenWalletSessionParams =
  | {
      mode: typeof OpenWalletSessionMode.Standard;
      deviceId?: never;
      passphraseState?: never;
    }
  | {
      mode: typeof OpenWalletSessionMode.SelectHidden;
      deviceId?: never;
      passphraseState?: never;
    }
  | {
      mode: typeof OpenWalletSessionMode.ResumeHidden;
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
        passphraseState: string | null;
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
