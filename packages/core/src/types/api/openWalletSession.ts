import type { CommonParams, Response } from '../params';

export const OpenWalletSessionMode = {
  Standard: 'standard',
  SelectHidden: 'select-hidden',
} as const;

export type OpenWalletSessionModeValue =
  (typeof OpenWalletSessionMode)[keyof typeof OpenWalletSessionMode];

export type OpenWalletSessionParams = {
  mode: OpenWalletSessionModeValue;
  deviceId?: never;
  passphraseState?: never;
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
 * Opens the standard or hidden wallet through a unified Protocol V1/V2 API.
 * Resume a bound hidden wallet by passing passphraseState on later methods.
 */
export declare function openWalletSession(
  connectId: string,
  params: CommonParams & OpenWalletSessionParams
): Response<OpenWalletSessionPayload>;
