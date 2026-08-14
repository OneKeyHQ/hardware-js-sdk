export type ProtocolV2LinkErrorCode =
  | 'response-timeout'
  | 'io'
  | 'generation'
  | 'router'
  | 'packet-source'
  | 'ack-sequence'
  | 'response-sequence'
  | 'frame';

export class ProtocolV2LinkError extends Error {
  readonly code: ProtocolV2LinkErrorCode;

  readonly cause?: unknown;

  constructor(code: ProtocolV2LinkErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'ProtocolV2LinkError';
    this.code = code;
    this.cause = cause;
  }
}

export const isProtocolV2LinkError = (error: unknown): error is ProtocolV2LinkError =>
  error instanceof ProtocolV2LinkError;

export type ProtocolV2LinkDisabledError = Error & {
  name: 'ProtocolV2LinkDisabledError';
  failureCode: string | number;
  firmwareMessage: string;
};

export const createProtocolV2LinkDisabledError = (
  failureCode: string | number,
  firmwareMessage: string
): ProtocolV2LinkDisabledError =>
  Object.assign(new Error(firmwareMessage), {
    name: 'ProtocolV2LinkDisabledError' as const,
    failureCode,
    firmwareMessage,
  });

export const isProtocolV2LinkDisabledError = (
  error: unknown
): error is ProtocolV2LinkDisabledError =>
  error instanceof Error &&
  error.name === 'ProtocolV2LinkDisabledError' &&
  'failureCode' in error &&
  'firmwareMessage' in error;
