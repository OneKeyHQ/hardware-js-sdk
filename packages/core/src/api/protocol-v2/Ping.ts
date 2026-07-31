import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { BaseMethod } from '../BaseMethod';

// nanopb max_size:64 includes the terminating NUL for string fields.
export const PROTOCOL_V2_PING_MAX_MESSAGE_BYTES = 63;

const getUtf8ByteLength = (value: string) =>
  Array.from(value).reduce((length, character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 0x7f) return length + 1;
    if (codePoint <= 0x7ff) return length + 2;
    if (codePoint <= 0xffff) return length + 3;
    return length + 4;
  }, 0);

export function validateProtocolV2PingMessage(value: unknown): string {
  if (value !== undefined && typeof value !== 'string') {
    throw ERRORS.TypedError(
      HardwareErrorCode.CallMethodInvalidParameter,
      'Protocol V2 Ping message must be a string.'
    );
  }
  const message = value ?? '';
  if (getUtf8ByteLength(message) > PROTOCOL_V2_PING_MAX_MESSAGE_BYTES) {
    throw ERRORS.TypedError(
      HardwareErrorCode.CallMethodInvalidParameter,
      `Protocol V2 Ping message must not exceed ${PROTOCOL_V2_PING_MAX_MESSAGE_BYTES} UTF-8 bytes.`
    );
  }
  return message;
}

export default class Ping extends BaseMethod<{ message?: string }> {
  getSupportedProtocols() {
    return ['V2'] as const;
  }

  init() {
    // Protocol V2 (Pro2) only; Core rejects non-V2 devices.
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = { message: validateProtocolV2PingMessage(this.payload.message) };
  }

  async run() {
    const res = await this.device.commands.typedCall('Ping', 'Success', {
      message: this.params.message ?? '',
    });
    return Promise.resolve(res.message);
  }
}
