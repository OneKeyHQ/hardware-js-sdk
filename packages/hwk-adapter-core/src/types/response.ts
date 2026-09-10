import { defaultRecoveryForCode } from './errors';

import type { HardwareErrorCode, HwkErrorOrigin, HwkRecoveryHint } from './errors';

export interface Success<T> {
  success: true;
  payload: T;
}

export interface Failure {
  success: false;
  payload: {
    error: string;
    code: HardwareErrorCode;
    /** See HwkErrorOrigin — who the failure came from. Optional so an
     *  unclassified failure degrades to code-based handling, never a guess. */
    origin?: HwkErrorOrigin;
    /** Connection-lifecycle recovery semantics. Optional for wire compatibility
     *  with SDK versions that predate this field. SDK failure helpers populate it. */
    recovery?: HwkRecoveryHint;
    params?: Record<string, unknown>;
  };
}

export type Response<T> = Success<T> | Failure;

export function success<T>(payload: T): Success<T> {
  return { success: true, payload };
}

export function failure(
  code: HardwareErrorCode,
  error: string,
  params?: Record<string, unknown>,
  origin?: HwkErrorOrigin,
  recovery?: HwkRecoveryHint
): Failure {
  return {
    success: false,
    payload: {
      error,
      code,
      ...(origin !== undefined ? { origin } : {}),
      recovery: recovery ?? defaultRecoveryForCode(code),
      ...(params ? { params } : {}),
    },
  };
}
