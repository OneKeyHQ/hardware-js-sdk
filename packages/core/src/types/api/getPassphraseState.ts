import type { CommonParams, Response } from '../params';

export type GetPassphraseStatePayload =
  | string
  | {
      passphrase_state?: string;
      session_id?: string;
      unlocked_attach_pin?: boolean;
      passphrase_protection?: boolean | null;
    };

export declare function getPassphraseState(
  connectId?: string,
  params?: CommonParams
): Response<GetPassphraseStatePayload>;
