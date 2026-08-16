/* eslint-disable max-classes-per-file */
import { CoreExtensionBaseMethod, UI_REQUEST } from '@onekeyfe/hd-core';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

type Success = { message?: string };

const getUtf8ByteLength = (value: string) =>
  Array.from(value).reduce((length, character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 0x7f) return length + 1;
    if (codePoint <= 0x7ff) return length + 2;
    if (codePoint <= 0xffff) return length + 3;
    return length + 4;
  }, 0);

export class TestProtocolV2Ping extends CoreExtensionBaseMethod<{ message?: string }> {
  getSupportedProtocols() {
    return ['V2'] as const;
  }

  init() {
    const message = this.payload.message ?? '';
    if (typeof message !== 'string' || getUtf8ByteLength(message) > 63) {
      throw ERRORS.TypedError(
        HardwareErrorCode.CallMethodInvalidParameter,
        'Protocol V2 Ping message must be a string of at most 63 UTF-8 bytes.'
      );
    }
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = { message };
  }

  async run() {
    const response = await this.device.commands.typedCallExtension<typeof this.params, Success>(
      'Ping',
      'Success',
      this.params
    );
    return response.message;
  }
}

export class TestInitializeDeviceDuration extends CoreExtensionBaseMethod {
  init() {
    this.allowDeviceMode = [
      ...this.allowDeviceMode,
      UI_REQUEST.NOT_INITIALIZE,
      UI_REQUEST.BOOTLOADER,
    ];
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  async run() {
    const start = Date.now();
    await this.device.commands.typedCallExtension<Record<string, never>, Record<string, unknown>>(
      'Initialize',
      'Features',
      {}
    );
    return Date.now() - start;
  }
}
