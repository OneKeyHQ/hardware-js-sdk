import type { CommonParams, Response } from '../params';

export type GetPassphraseStatePayload =
  | string
  | {
      passphrase_state?: string;
      session_id?: string;
      unlocked_attach_pin?: boolean;
      passphrase_protection?: boolean | null;
    };

export type GetPassphraseStateParams = CommonParams & {
  allowCreateAttachPin?: boolean;
};

export declare function getPassphraseState(
  connectId?: string,
  params?: GetPassphraseStateParams
): Response<GetPassphraseStatePayload>;
