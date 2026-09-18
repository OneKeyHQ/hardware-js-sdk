import { EDeviceType, ERRORS, HardwareError, HardwareErrorCode, wait } from '@onekeyfe/hd-shared';
import { PROTOCOL_V2_WEBUSB_FILE_CHUNK_SIZE, isProtocolV2LinkError } from '@onekeyfe/hd-transport';

import { BaseMethod } from '../BaseMethod';
import { DataManager } from '../../data-manager';
import { UI_REQUEST } from '../../constants/ui-request';
import { getProtocolV2RuntimeMode } from '../../protocols/protocol-v2';
import { invalidParameter } from '../helpers/filesystemValidation';

export type FactoryFilesystemRebuildParams = { confirm: true };

const REQUIRED_MESSAGES = [60802, 60804, 60805, 60806, 60811];
const CALL_OPTIONS = { timeoutMs: 15_000 };

export default class FilesystemFormat extends BaseMethod {
  getSupportedProtocols() {
    return ['V2'] as const;
  }

  init() {
    if (this.payload.confirm !== true || !this.payload.connectId) {
      throw invalidParameter(
        'Rebuilding both filesystem volumes requires connectId and confirm: true.'
      );
    }
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.unlockPolicy = 'none';
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.BOOTLOADER];
    this.payload.keepSession = false;
    this.params = undefined;
  }

  async run() {
    const env = DataManager.getSettings('env');
    const type = this.device.getCurrentDeviceType();
    if (
      (type !== EDeviceType.Pro2 && type !== EDeviceType.Neo) ||
      (!DataManager.isBrowserWebUsb(env) && !DataManager.isDesktopWebUsb(env))
    ) {
      throw invalidParameter(
        'Filesystem recovery requires a Pro2 or Neo connected through WebUSB.'
      );
    }
    await this.checkLoader();
    this.throwIfAborted();
    const { path } = this.device.originalDescriptor;
    const serialNo = this.device.getCurrentSerialNo();
    let formatSent = false;
    let formatConfirmed = false;

    // Never replay format: losing its reply does not mean the erase did not happen.
    try {
      await this.device.commands.typedCall(
        'FilesystemFormat',
        'Success',
        { data: true, user: true },
        {
          timeoutMs: 60_000,
          onWriteCompleted: () => {
            formatSent = true;
          },
        }
      );
      formatConfirmed = true;
    } catch (error) {
      this.throwIfAborted();
      if (!formatSent || !isProtocolV2LinkError(error)) {
        const message = error instanceof Error ? error.message : String(error);
        throw ERRORS.TypedError(
          HardwareErrorCode.EmmcFileWriteFirmwareError,
          `Filesystem format did not complete successfully; volumes may already be erased. No automatic retry: ${message}`
        );
      }
    }

    try {
      this.device.keepSession = false;
      await this.device.release();
      await this.reconnect(path);
      if (
        this.device.getCurrentDeviceType() !== type ||
        (serialNo && this.device.getCurrentSerialNo() !== serialNo)
      ) {
        throw new Error('Filesystem recovery device identity changed');
      }
      for (const volume of ['vol0', 'vol1']) {
        await this.verifyVolume(volume);
      }
    } catch (error) {
      this.throwIfAborted();
      const message = error instanceof Error ? error.message : String(error);
      throw ERRORS.TypedError(
        HardwareErrorCode.EmmcFileWriteFirmwareError,
        `${
          formatConfirmed ? 'Filesystem was formatted' : 'Filesystem format was not confirmed'
        }, but recovery verification failed: ${message}`
      );
    }
    return {
      formatConfirmed,
      message: formatConfirmed
        ? 'Both filesystem volumes rebuilt and read/write verified.'
        : 'Both filesystem volumes passed read/write verification; filesystem format was not confirmed.',
    };
  }

  private async reconnect(path: string) {
    const deadline = Date.now() + 15_000;
    for (;;) {
      this.throwIfAborted();
      try {
        const diff = await this.device.deviceConnector?.enumerate();
        const descriptors = diff?.descriptors ?? [];
        if (descriptors.length === 0) throw ERRORS.TypedError(HardwareErrorCode.DeviceNotFound);
        if (descriptors.length !== 1 || descriptors[0].path !== path) {
          throw new Error('Filesystem recovery device identity changed');
        }
        this.device.updateDescriptor({ ...descriptors[0], protocolType: 'V2' }, true);
        await this.device.acquire('V2', { throwOnRunPromiseError: true });
        await this.device.initialize();
        await this.checkLoader();
        return;
      } catch (error) {
        this.throwIfAborted();
        const disconnected =
          isProtocolV2LinkError(error) ||
          (error instanceof HardwareError && error.errorCode === HardwareErrorCode.DeviceNotFound);
        if (!disconnected || Date.now() >= deadline) throw error;
        await this.device.release();
        await wait(500);
      }
    }
  }

  private async checkLoader() {
    this.throwIfAborted();
    // Both loaders reject this fresh probe while an installation is active.
    const info = await this.device.ensureProtocolV2RuntimeContext(15_000, { forceRefresh: true });
    const mode = getProtocolV2RuntimeMode(info, this.device.state?.raw?.protocolV2DeviceInfo);
    if (mode !== 'bootloader' && mode !== 'romloader') {
      throw invalidParameter('Enter bootloader or romloader before rebuilding the filesystem.');
    }
    if (REQUIRED_MESSAGES.some(id => !info.supported_messages.includes(id))) {
      throw invalidParameter('This loader does not support filesystem rebuild and verification.');
    }
  }

  private async verifyVolume(volume: string) {
    const path = `${volume}:/factory-fs-check.bin`;
    // Cross the firmware's 64 KiB allocation boundary, including a second write chunk.
    const expected = Buffer.alloc(68_000);
    for (let i = 0; i < expected.length; i += 1) expected[i] = (i * 31 + Math.floor(i / 256)) % 256;
    const typedCall = this.device.commands.typedCall.bind(this.device.commands);
    const existing = await typedCall(
      'FilesystemPathInfoQuery',
      'FilesystemPathInfo',
      { path },
      CALL_OPTIONS
    );
    if (existing.message.exist)
      throw new Error(`Recovery verification file already exists: ${path}`);

    for (let offset = 0; offset < expected.length; offset += PROTOCOL_V2_WEBUSB_FILE_CHUNK_SIZE) {
      this.throwIfAborted();
      const data = expected.subarray(offset, offset + PROTOCOL_V2_WEBUSB_FILE_CHUNK_SIZE);
      const response = await typedCall(
        'FilesystemFileWrite',
        'FilesystemFile',
        {
          file: { path, offset, total_size: expected.length, data },
          overwrite: offset === 0,
          append: false,
        },
        CALL_OPTIONS
      );
      if (Number(response.message.processed_byte) !== offset + data.length) {
        throw new Error(`${volume} write incomplete at offset ${offset}`);
      }
    }
    const info = await typedCall(
      'FilesystemPathInfoQuery',
      'FilesystemPathInfo',
      { path },
      CALL_OPTIONS
    );
    if (
      !info.message.exist ||
      info.message.directory ||
      Number(info.message.size) !== expected.length
    ) {
      throw new Error(`${volume} file size verification failed`);
    }
    // Older loaders cannot return a full 4 KiB frame; keep diagnostic reads small.
    for (let offset = 0; offset < expected.length; offset += 512) {
      this.throwIfAborted();
      const chunk = expected.subarray(offset, offset + 512);
      const response = await typedCall(
        'FilesystemFileRead',
        'FilesystemFile',
        { file: { path, offset, total_size: expected.length }, chunk_len: chunk.length },
        CALL_OPTIONS
      );
      const { data } = response.message;
      const actual =
        typeof data === 'string'
          ? Buffer.from(data, 'hex')
          : Buffer.from(data ? new Uint8Array(data) : []);
      if (
        response.message.path !== path ||
        Number(response.message.offset) !== offset ||
        !actual.equals(chunk)
      ) {
        throw new Error(`${volume} read-back verification failed at offset ${offset}`);
      }
    }
    this.throwIfAborted();
    await typedCall('FilesystemFileDelete', 'Success', { path }, CALL_OPTIONS);
  }
}
