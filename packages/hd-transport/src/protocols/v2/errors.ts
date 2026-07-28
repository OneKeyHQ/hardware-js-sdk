export type ProtocolV2LinkErrorCode =
  | 'response-timeout'
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
