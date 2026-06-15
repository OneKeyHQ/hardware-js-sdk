import type { CommonParams, Response } from '../params';

export type GetPassphraseStatePayload = {
  passphraseState?: string;
  sessionId?: string;
  unlockedAttachPin?: boolean;
  passphraseProtection?: boolean | null;
};

export type GetPassphraseStateParams = CommonParams & {
  allowCreateAttachPin?: boolean;
};

export declare function getPassphraseState(
  connectId?: string,
  params?: GetPassphraseStateParams
): Response<GetPassphraseStatePayload>;
