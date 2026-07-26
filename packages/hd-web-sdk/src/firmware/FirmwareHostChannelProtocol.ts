import type {
  FirmwareArtifactReaderCancelInput,
  FirmwareArtifactReaderCloseInput,
  FirmwareArtifactReaderOpenInput,
  FirmwareArtifactReaderReadInput,
  FirmwareCheckpoint,
  FirmwareProgressEvent,
} from '@onekeyfe/hd-core';

export const FIRMWARE_HOST_CHANNEL_PROTOCOL = 'onekey-firmware-host-channel-v1';

export type FirmwareHostChannelMethod =
  | 'artifact.open'
  | 'artifact.read'
  | 'artifact.close'
  | 'artifact.cancel'
  | 'checkpoint.commit'
  | 'progress.report';

export interface FirmwareHostChannelHandshake {
  protocol: typeof FIRMWARE_HOST_CHANNEL_PROTOCOL;
  kind: 'handshake';
  nonce: string;
  sessionId: string;
  generation: number;
}

export interface FirmwareHostChannelHandshakeAck {
  protocol: typeof FIRMWARE_HOST_CHANNEL_PROTOCOL;
  kind: 'handshake-ack';
  nonce: string;
  sessionId: string;
  generation: number;
}

export interface FirmwareHostChannelHandshakeReject {
  protocol: typeof FIRMWARE_HOST_CHANNEL_PROTOCOL;
  kind: 'handshake-reject';
  nonce: string;
  sessionId: string;
  generation: number;
  reason: string;
}

interface FirmwareHostChannelRequestBase {
  protocol: typeof FIRMWARE_HOST_CHANNEL_PROTOCOL;
  kind: 'request';
  requestId: string;
  sessionId: string;
  generation: number;
}

export type FirmwareHostChannelRequest =
  | (FirmwareHostChannelRequestBase & {
      method: 'artifact.open';
      payload: FirmwareArtifactReaderOpenInput;
    })
  | (FirmwareHostChannelRequestBase & {
      method: 'artifact.read';
      payload: FirmwareArtifactReaderReadInput;
    })
  | (FirmwareHostChannelRequestBase & {
      method: 'artifact.close';
      payload: FirmwareArtifactReaderCloseInput;
    })
  | (FirmwareHostChannelRequestBase & {
      method: 'artifact.cancel';
      payload: FirmwareArtifactReaderCancelInput;
    })
  | (FirmwareHostChannelRequestBase & {
      method: 'checkpoint.commit';
      payload: FirmwareCheckpoint;
    })
  | (FirmwareHostChannelRequestBase & {
      method: 'progress.report';
      payload: FirmwareProgressEvent;
    });

export interface FirmwareHostChannelError {
  name: string;
  message: string;
  errorCode?: number;
  code?: string | number;
}

export interface FirmwareHostChannelResponse {
  protocol: typeof FIRMWARE_HOST_CHANNEL_PROTOCOL;
  kind: 'response';
  requestId: string;
  sessionId: string;
  generation: number;
  ok: boolean;
  payload?: unknown;
  error?: FirmwareHostChannelError;
}

export interface FirmwareHostChannelDispose {
  protocol: typeof FIRMWARE_HOST_CHANNEL_PROTOCOL;
  kind: 'dispose';
  sessionId: string;
  generation: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasSession = (
  value: Record<string, unknown>
): value is Record<string, unknown> & { sessionId: string; generation: number } =>
  value.protocol === FIRMWARE_HOST_CHANNEL_PROTOCOL &&
  typeof value.sessionId === 'string' &&
  value.sessionId.length > 0 &&
  Number.isSafeInteger(value.generation) &&
  (value.generation as number) > 0;

export const isFirmwareHostChannelHandshake = (
  value: unknown
): value is FirmwareHostChannelHandshake =>
  isRecord(value) &&
  hasSession(value) &&
  value.kind === 'handshake' &&
  typeof value.nonce === 'string' &&
  value.nonce.length > 0;

export const isFirmwareHostChannelHandshakeAck = (
  value: unknown
): value is FirmwareHostChannelHandshakeAck =>
  isRecord(value) &&
  hasSession(value) &&
  value.kind === 'handshake-ack' &&
  typeof value.nonce === 'string' &&
  value.nonce.length > 0;

export const isFirmwareHostChannelHandshakeReject = (
  value: unknown
): value is FirmwareHostChannelHandshakeReject =>
  isRecord(value) &&
  hasSession(value) &&
  value.kind === 'handshake-reject' &&
  typeof value.nonce === 'string' &&
  typeof value.reason === 'string';

export const isFirmwareHostChannelRequest = (value: unknown): value is FirmwareHostChannelRequest =>
  isRecord(value) &&
  hasSession(value) &&
  value.kind === 'request' &&
  typeof value.requestId === 'string' &&
  value.requestId.length > 0 &&
  typeof value.method === 'string' &&
  [
    'artifact.open',
    'artifact.read',
    'artifact.close',
    'artifact.cancel',
    'checkpoint.commit',
    'progress.report',
  ].includes(value.method) &&
  isRecord(value.payload);

export const isFirmwareHostChannelResponse = (
  value: unknown
): value is FirmwareHostChannelResponse =>
  isRecord(value) &&
  hasSession(value) &&
  value.kind === 'response' &&
  typeof value.requestId === 'string' &&
  value.requestId.length > 0 &&
  typeof value.ok === 'boolean';

export const isFirmwareHostChannelDispose = (value: unknown): value is FirmwareHostChannelDispose =>
  isRecord(value) && hasSession(value) && value.kind === 'dispose';

export const serializeFirmwareHostChannelError = (error: unknown): FirmwareHostChannelError => {
  const value = isRecord(error) ? error : {};
  let message = 'Firmware host channel request failed';
  if (typeof value.message === 'string') {
    message = value.message;
  } else if (typeof error === 'string') {
    message = error;
  }
  return {
    name: typeof value.name === 'string' ? value.name : 'Error',
    message,
    ...(typeof value.errorCode === 'number' ? { errorCode: value.errorCode } : {}),
    ...(typeof value.code === 'string' || typeof value.code === 'number'
      ? { code: value.code }
      : {}),
  };
};

export const createFirmwareHostChannelError = ({
  name,
  message,
  errorCode,
  code,
}: FirmwareHostChannelError): Error => {
  const error = new Error(message);
  error.name = name;
  return Object.assign(error, {
    ...(errorCode === undefined ? {} : { errorCode }),
    ...(code === undefined ? {} : { code }),
  });
};

export const getFirmwareHostChannelTargetOrigin = (origin: string): string =>
  origin === 'null' || origin.startsWith('file://') ? '*' : origin;

export const normalizeFirmwareHostChannelEventOrigin = (origin: string): string =>
  origin === 'null' || origin.startsWith('file://') ? 'null' : origin;
