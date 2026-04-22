import type { HardwareErrorCode } from './errors';

export interface Success<T> {
  success: true;
  payload: T;
}

export interface Failure {
  success: false;
  payload: {
    error: string;
    code: HardwareErrorCode;
  };
}

export type Response<T> = Success<T> | Failure;

export function success<T>(payload: T): Success<T> {
  return { success: true, payload };
}

export function failure(code: HardwareErrorCode, error: string): Failure {
  return { success: false, payload: { error, code } };
}
