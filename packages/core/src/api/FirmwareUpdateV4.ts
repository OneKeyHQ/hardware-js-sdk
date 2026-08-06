import { EDeviceType, ERRORS, HardwareError, HardwareErrorCode, wait } from '@onekeyfe/hd-shared';
import {
  DeviceRebootType,
  PROTOCOL_V2_BLE_FILE_CHUNK_SIZE,
  PROTOCOL_V2_WEBUSB_FILE_CHUNK_SIZE,
} from '@onekeyfe/hd-transport';
import { sha256 } from '@noble/hashes/sha256';

import { FirmwareUpdateTipMessage, UI_REQUEST } from '../events/ui-request';
import { validateProtocolV2FilesystemPath } from './helpers/filesystemValidation';
import { writeProtocolV2File } from './helpers/protocolV2FileWrite';
import { validateParams } from './helpers/paramsValidator';
import {
  LoggerNames,
  getDeviceBLEFirmwareVersion,
  getDeviceBootloaderVersion,
  getDeviceFirmwareVersion,
  getFirmwareType,
  getLogger,
} from '../utils';
import { getSysResourceBinary } from './firmware/getBinary';
import { DataManager } from '../data-manager';
import { FirmwareUpdateBaseMethod } from './firmware/FirmwareUpdateBaseMethod';
import { DevicePool } from '../device/DevicePool';
import {
  PROTOCOL_V2_VERSIONS_DEVICE_INFO_REQUEST,
  ProtocolV2FirmwareTargetType,
} from '../protocols/protocol-v2';
import { requestProtocolV2DeviceInfo } from '../protocols/protocol-v2/features';
import {
  PROTOCOL_V2_RESOURCE_DEVICE_PATHS,
  buildProtocolV2ResourceUpdatePlan,
  isProtocolV2ResourceFileValid,
  readProtocolV2ResourceInventory,
} from '../protocols/protocol-v2/resources';
import {
  getProtocolV2UnknownErrorText,
  isProtocolV2DeviceDisconnectedError,
} from './protocol-v2/helpers';

import type { FirmwareUpdateV4Params, FirmwareUpdateV4Target } from '../types/api/firmwareUpdate';
import type { EFirmwareType } from '@onekeyfe/hd-shared';
import type { ProtocolV2DeviceInfo } from '@onekeyfe/hd-transport';
import type { PROTO } from '../constants';
import type { TypedResponseMessage } from '../device/DeviceCommands';
import type {
  Features,
  IFirmwareReleaseInfo,
  IProtocolV2FirmwareComponent,
  IProtocolV2Resource,
  IProtocolV2ResourceFile,
  IVersionArray,
} from '../types';

const Log = getLogger(LoggerNames.Method);

const PROTOCOL_V2_BOOTLOADER_RECONNECT_TIMEOUT = 90 * 1000;
const PROTOCOL_V2_FINAL_RECONNECT_TIMEOUT = 3 * 60 * 1000;
const PROTOCOL_V2_SHORT_RESPONSE_TIMEOUT = 5 * 1000;
const PROTOCOL_V2_FIRMWARE_STATUS_RESPONSE_TIMEOUT = 15 * 1000;
const PROTOCOL_V2_START_UPDATE_TIMEOUT = 3 * 60 * 1000;
const PROTOCOL_V2_INSTALL_TIMEOUT = 8 * 60 * 1000;
const PROTOCOL_V2_MISSING_TARGET_STATUS_GRACE_TIMEOUT = 30 * 1000;
const PROTOCOL_V2_TARGET_STATUS_PENDING = 0;
const PROTOCOL_V2_TARGET_STATUS_IN_PROGRESS = 1;
const PROTOCOL_V2_TARGET_STATUS_FINISHED = 2;
const PROTOCOL_V2_TARGET_STATUS_FAILED_MIN = 3;
const PROTOCOL_V2_CONNECT_PROTOCOL = 'V2';
const PROTOCOL_V2_FIRMWARE_STAGING_VOLUME = 'vol0:/';
const PROTOCOL_V2_MIN_FILE_CHUNK_SIZE = 64;
const PROTOCOL_V2_CONNECT_RETRY_COUNT = 10;
const PROTOCOL_V2_CONNECT_POLL_INTERVAL = 500;
const PROTOCOL_V2_CONNECT_SINGLE_TIMEOUT = 75 * 1000;
const PROTOCOL_V2_DEVICE_INFO_READY_TIMEOUT = 30 * 1000;
const PROTOCOL_V2_FILE_TRANSFER_RETRY_COUNT = 3;
const PROTOCOL_V2_OKPP_HEADER_SIZE = 0x52a0;
const PROTOCOL_V2_OKPP_PAYLOAD_HASH_OFFSET = 0x200;
const PROTOCOL_V2_OKPP_HEADER_HASH_OFFSET = 0x240;
const PROTOCOL_V2_OKPP_HASH_SIZE = 64;

const getProtocolV2DeviceTransferProgress = (
  bytesBeforeChunk: number,
  bytesAfterChunk: number,
  totalBytes: number
) => {
  if (!Number.isFinite(totalBytes) || totalBytes <= 0) {
    return 100;
  }
  if (bytesBeforeChunk <= 0 && bytesAfterChunk < totalBytes) {
    return 0;
  }
  if (bytesAfterChunk >= totalBytes) {
    return 100;
  }
  return Math.min(Math.max(Math.ceil((bytesAfterChunk / totalBytes) * 100), 1), 99);
};

const formatProtocolV2TransferSpeed = (bytes: number, elapsedMs: number) => {
  const safeElapsedMs = Math.max(elapsedMs, 1);
  return (bytes / 1024 / (safeElapsedMs / 1000)).toFixed(2);
};

type ProtocolV2FirmwareUpdateStatusTarget = {
  target_id: number | string;
  status?: number | string;
  payload_version?: number;
  path?: string;
};

type ProtocolV2FirmwareUpdateStartResponse = TypedResponseMessage<'Success'>;

type ProtocolV2TargetBinary = { fileName: string; binary: ArrayBuffer; targetId: number };
type ProtocolV2InstallItem = ProtocolV2TargetBinary & {
  kind: ProtocolV2RemoteComponentTarget['kind'];
};
type ProtocolV2InstallTarget = ProtocolV2InstallItem & {
  path: string;
};

type ProtocolV2FileTransferParams = PROTO.FirmwareUpload & {
  filePath: string;
  processedSize?: number;
  totalSize?: number;
  onTransferredBytes?: (transferredBytes: number) => void;
};

/** Protocol V2 resource file written independently to devicePath through FileWrite. */
type ProtocolV2ResourceBundleBinary = {
  name: string;
  binary: ArrayBuffer;
  devicePath: string;
};

type ProtocolV2RemoteComponentBinary = ProtocolV2RemoteComponentTarget & {
  binary: ArrayBuffer;
};

type ProtocolV2RemoteComponentTarget = {
  fileName: string;
  targetId: number;
  kind: 'bootloader' | 'firmware';
};

type ProtocolV2OkppHeader = {
  type: string;
  version: IVersionArray;
  payloadHash: string;
  headerHash: string;
};

const PROTOCOL_V2_REMOTE_COMPONENT_TARGETS: Readonly<
  Record<string, ProtocolV2RemoteComponentTarget>
> = {
  BOOTLOADER: {
    fileName: 'bootloader.bin',
    targetId: ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_BOOTLOADER,
    kind: 'bootloader',
  },
  APPLICATION_P1: {
    fileName: 'application_p1.bin',
    targetId: ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_APPLICATION_P1,
    kind: 'firmware',
  },
  APPLICATION_P2: {
    fileName: 'application_p2.bin',
    targetId: ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_APPLICATION_P2,
    kind: 'firmware',
  },
  COPROCESSOR: {
    fileName: 'coprocessor.bin',
    targetId: ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_COPROCESSOR,
    kind: 'firmware',
  },
  SE01: {
    fileName: 'se01.bin',
    targetId: ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE01,
    kind: 'firmware',
  },
  SE02: {
    fileName: 'se02.bin',
    targetId: ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE02,
    kind: 'firmware',
  },
  SE03: {
    fileName: 'se03.bin',
    targetId: ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE03,
    kind: 'firmware',
  },
  SE04: {
    fileName: 'se04.bin',
    targetId: ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE04,
    kind: 'firmware',
  },
};

const PROTOCOL_V2_UPDATE_TARGET_BY_TARGET_ID = new Map<number, FirmwareUpdateV4Target>([
  [ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_BOOTLOADER, 'boot'],
  [ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_APPLICATION_P1, 'app_v1'],
  [ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_APPLICATION_P2, 'app_v2'],
  [ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_COPROCESSOR, 'coprocessor'],
  [ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE01, 'se01'],
  [ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE02, 'se02'],
  [ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE03, 'se03'],
  [ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE04, 'se04'],
]);

const PROTOCOL_V2_ROMLOADER_UNSUPPORTED_MESSAGE =
  'FW_MGMT_TARGET_ROMLOADER is not accepted by the current Pro2 bootloader update request. Flash romloader with the loader-specific flow instead of firmwareUpdateV4.';

// hd-transport historically decodes scalar enums as enum-name strings.
// Map them back to firmware protocol values before internal comparisons.
const PROTOCOL_V2_TARGET_ID_BY_DECODED_NAME = new Map<string, number>(
  Object.entries(ProtocolV2FirmwareTargetType).map(([key, value]) => [key, value])
);
const PROTOCOL_V2_TARGET_STATUS_BY_DECODED_NAME = new Map<string, number>([
  ['FW_MGMT_UPDATER_TASK_STATUS_PENDING', PROTOCOL_V2_TARGET_STATUS_PENDING],
  ['FW_MGMT_UPDATER_TASK_STATUS_IN_PROGRESS', PROTOCOL_V2_TARGET_STATUS_IN_PROGRESS],
  ['FW_MGMT_UPDATER_TASK_STATUS_FINISHED', PROTOCOL_V2_TARGET_STATUS_FINISHED],
  ['FW_MGMT_UPDATER_TASK_STATUS_FAILED_FILE_NOT_FOUND', 3],
  ['FW_MGMT_UPDATER_TASK_STATUS_FAILED_FILE_READ', 4],
  ['FW_MGMT_UPDATER_TASK_STATUS_FAILED_FILE_WRITE', 5],
  ['FW_MGMT_UPDATER_TASK_STATUS_FAILED_VERIFY', 6],
  ['FW_MGMT_UPDATER_TASK_STATUS_FAILED_INSTALL', 7],
  ['FW_MGMT_UPDATER_TASK_STATUS_FAILED_ABORT', 8],
  ['FW_MGMT_UPDATER_TASK_STATUS_FAILED_BUSY', 9],
  ['FW_MGMT_UPDATER_TASK_STATUS_FAILED_ENTRY_OUT_OF_BOUNDS', 10],
]);

const isProtocolV2ReconnectProbeError = (error: unknown) => {
  const message = getProtocolV2UnknownErrorText(error).toLowerCase();
  return (
    (message.includes('device protocol mismatch') && message.includes('expected v2')) ||
    message.includes('did not respond to expected protocol')
  );
};

const isProtocolV2FirmwareStatusEndpointUnavailable = (error: unknown) => {
  const message = getProtocolV2UnknownErrorText(error).toLowerCase();
  return (
    message.includes('handler not registered') ||
    message.includes('message handler not found') ||
    message.includes('unsupported message')
  );
};

const isProtocolV2TargetStatusFinished = (status: ProtocolV2FirmwareUpdateStatusTarget['status']) =>
  normalizeProtocolV2TargetStatus(status) === PROTOCOL_V2_TARGET_STATUS_FINISHED;

const isProtocolV2TargetStatusInProgress = (
  status: ProtocolV2FirmwareUpdateStatusTarget['status']
) =>
  normalizeProtocolV2TargetStatus(status) === PROTOCOL_V2_TARGET_STATUS_PENDING ||
  normalizeProtocolV2TargetStatus(status) === PROTOCOL_V2_TARGET_STATUS_IN_PROGRESS;

const isProtocolV2TargetStatusFailed = (status: ProtocolV2FirmwareUpdateStatusTarget['status']) => {
  const normalizedStatus = normalizeProtocolV2TargetStatus(status);
  return (
    typeof normalizedStatus === 'number' && normalizedStatus >= PROTOCOL_V2_TARGET_STATUS_FAILED_MIN
  );
};

const normalizeProtocolV2TargetId = (targetId: number | string) => {
  if (typeof targetId === 'number') {
    return targetId;
  }
  return PROTOCOL_V2_TARGET_ID_BY_DECODED_NAME.get(targetId);
};

const normalizeProtocolV2TargetStatus = (
  status: ProtocolV2FirmwareUpdateStatusTarget['status']
) => {
  if (typeof status === 'number') {
    return status;
  }
  if (typeof status === 'string') {
    return PROTOCOL_V2_TARGET_STATUS_BY_DECODED_NAME.get(status);
  }
  return undefined;
};

const normalizeProtocolV2Hex = (value?: string) => value?.replace(/^0x/i, '').toLowerCase();

const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');

const hexToProtocolV2Bytes = (hex: string) => {
  const normalized = hex.replace(/^0x/i, '');
  if (!normalized || normalized.length % 2 !== 0 || /[^0-9a-f]/i.test(normalized)) {
    return new Uint8Array(0);
  }
  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
};

const toProtocolV2Bytes = (value: unknown): Uint8Array => {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  if (typeof value === 'string') return hexToProtocolV2Bytes(value);
  return new Uint8Array(0);
};

const toProtocolV2FiniteNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  }
  if (value && typeof value === 'object') {
    const longLike = value as { toNumber?: () => number };
    if (typeof longLike.toNumber === 'function') {
      const numeric = longLike.toNumber();
      return Number.isFinite(numeric) ? numeric : undefined;
    }
  }
  return undefined;
};

const readProtocolV2Ascii = (bytes: Uint8Array, offset: number, length: number) =>
  Array.from(bytes.slice(offset, offset + length))
    .map(byte => String.fromCharCode(byte))
    .join('');

const parseProtocolV2OkppHeader = (bytes: Uint8Array): ProtocolV2OkppHeader | null => {
  if (bytes.byteLength < PROTOCOL_V2_OKPP_HEADER_SIZE) return null;
  if (readProtocolV2Ascii(bytes, 0, 4) !== 'OKPP') return null;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const headerLen = view.getUint32(0x0c, true);
  if (headerLen !== PROTOCOL_V2_OKPP_HEADER_SIZE) return null;

  const packedVersion = view.getUint32(0x10, true);
  return {
    type: readProtocolV2Ascii(bytes, 0x08, 4),
    version: [
      Math.floor(packedVersion / 0x10000) % 0x100,
      Math.floor(packedVersion / 0x100) % 0x100,
      packedVersion % 0x100,
    ],
    payloadHash: bytesToHex(
      bytes.slice(
        PROTOCOL_V2_OKPP_PAYLOAD_HASH_OFFSET,
        PROTOCOL_V2_OKPP_PAYLOAD_HASH_OFFSET + PROTOCOL_V2_OKPP_HASH_SIZE
      )
    ),
    headerHash: bytesToHex(
      bytes.slice(
        PROTOCOL_V2_OKPP_HEADER_HASH_OFFSET,
        PROTOCOL_V2_OKPP_HEADER_HASH_OFFSET + PROTOCOL_V2_OKPP_HASH_SIZE
      )
    ),
  };
};

export const isProtocolV2FirmwareFingerprintValid = (
  binary: ArrayBuffer | Uint8Array,
  fingerprint: string | undefined
) => {
  const expectedFingerprint = normalizeProtocolV2Hex(fingerprint);
  if (!expectedFingerprint) return true;
  return bytesToHex(sha256(toProtocolV2Bytes(binary))) === expectedFingerprint;
};

export const assertProtocolV2ReconnectIdentity = (
  expectedSerialNumber?: string,
  actualSerialNumber?: string,
  expectedPath?: string,
  actualPath?: string
) => {
  if (expectedSerialNumber && actualSerialNumber) {
    if (actualSerialNumber !== expectedSerialNumber) {
      throw ERRORS.TypedError(
        HardwareErrorCode.DeviceNotFound,
        `Protocol V2 reconnect physical identity mismatch: expected ${expectedSerialNumber}, received ${actualSerialNumber}`
      );
    }
    return;
  }

  if (expectedPath && actualPath && expectedPath === actualPath) {
    return;
  }

  throw ERRORS.TypedError(
    HardwareErrorCode.DeviceNotFound,
    `Protocol V2 reconnect physical identity unavailable: expected path ${
      expectedPath ?? 'unknown'
    }, received ${actualPath ?? 'unknown'}`
  );
};

/**
 * FirmwareUpdateV4 is the complete Protocol V2 firmware update flow.
 *
 * It intentionally does not fall back to FirmwareUpdateV3/V1 behavior:
 * - upload uses FilesystemFileWrite
 * - install uses DeviceFirmwareUpdateRequest
 * - completion waits for target status to finish, reboots to normal, then polls DeviceInfo
 */
export default class FirmwareUpdateV4 extends FirmwareUpdateBaseMethod<FirmwareUpdateV4Params> {
  private protocolV2ExpectedSerialNumber?: string;

  private protocolV2ExpectedPath?: string;

  getSupportedProtocols() {
    return ['V2'] as const;
  }

  init() {
    this.allowDeviceMode = [UI_REQUEST.BOOTLOADER, UI_REQUEST.NOT_INITIALIZE];
    this.requireDeviceMode = [];
    this.unlockPolicy = 'unlock-before-run';
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;

    const { payload } = this;

    if (typeof payload.retryCount !== 'number') {
      payload.retryCount = PROTOCOL_V2_CONNECT_RETRY_COUNT;
    }
    if (typeof payload.pollIntervalTime !== 'number') {
      payload.pollIntervalTime = PROTOCOL_V2_CONNECT_POLL_INTERVAL;
    }
    if (typeof payload.timeout !== 'number') {
      payload.timeout = PROTOCOL_V2_CONNECT_SINGLE_TIMEOUT;
    }
    if (typeof payload.protocolV2DeviceInfoTimeoutMs !== 'number') {
      payload.protocolV2DeviceInfoTimeoutMs = PROTOCOL_V2_DEVICE_INFO_READY_TIMEOUT;
    }

    validateParams(payload, [
      { name: 'chunkSize', type: 'number' },
      { name: 'forcedUpdateRes', type: 'boolean' },
      { name: 'bootloaderBinary', type: 'buffer' },
      { name: 'romloaderBinary', type: 'buffer' },
      { name: 'applicationP1Binary', type: 'buffer' },
      { name: 'applicationP2Binary', type: 'buffer' },
      { name: 'coprocessorBinary', type: 'buffer' },
      { name: 'se01Binary', type: 'buffer' },
      { name: 'se02Binary', type: 'buffer' },
      { name: 'se03Binary', type: 'buffer' },
      { name: 'se04Binary', type: 'buffer' },
      { name: 'firmwareType', type: 'string' },
      { name: 'targetsToUpdate', type: 'array', allowEmpty: true },
      { name: 'platform', type: 'string' },
      { name: 'resourceFiles', type: 'array', allowEmpty: true },
    ]);

    this.params = {
      chunkSize: payload.chunkSize,
      forcedUpdateRes: payload.forcedUpdateRes,
      bootloaderBinary: payload.bootloaderBinary,
      romloaderBinary: payload.romloaderBinary,
      applicationP1Binary: payload.applicationP1Binary,
      applicationP2Binary: payload.applicationP2Binary,
      coprocessorBinary: payload.coprocessorBinary,
      se01Binary: payload.se01Binary,
      se02Binary: payload.se02Binary,
      se03Binary: payload.se03Binary,
      se04Binary: payload.se04Binary,
      resourceFiles: payload.resourceFiles,
      firmwareType: payload.firmwareType,
      targetsToUpdate: payload.targetsToUpdate,
      platform: payload.platform,
    };
  }

  private getProtocolV2FirmwareChunkSize() {
    const payloadChunkSize = Number(this.params?.chunkSize);
    const env = DataManager.getSettings('env');
    const isBle = this.params?.platform === 'native' || (env && DataManager.isBleConnect(env));
    let maxChunkSize = PROTOCOL_V2_WEBUSB_FILE_CHUNK_SIZE;
    if (isBle) {
      maxChunkSize = PROTOCOL_V2_BLE_FILE_CHUNK_SIZE;
    }
    if (!Number.isFinite(payloadChunkSize) || payloadChunkSize <= 0) {
      return maxChunkSize;
    }
    return Math.min(
      Math.max(Math.floor(payloadChunkSize), PROTOCOL_V2_MIN_FILE_CHUNK_SIZE),
      maxChunkSize
    );
  }

  async run() {
    Log.debug('FirmwareUpdateV4 strategy: Protocol V2');
    return this.runProtocolV2();
  }

  private async runProtocolV2() {
    await this.captureProtocolV2PhysicalIdentity();
    const deviceFeatures = await this.getProtocolV2DeviceFeatures();
    const deviceFirmwareType = getFirmwareType(deviceFeatures);
    const firmwareType = this.params.firmwareType ?? deviceFirmwareType;
    const needsRemoteResources =
      !this.params.resourceFiles?.length && !!this.params.targetsToUpdate?.includes('resource');

    let fwBinaryMap: ProtocolV2TargetBinary[] = [];
    let bootloaderBinary: ArrayBuffer | null = null;
    let installItems: ProtocolV2InstallItem[] | undefined;
    let resourceBundles: ProtocolV2ResourceBundleBinary[] | undefined;
    try {
      this.postTipMessage(FirmwareUpdateTipMessage.StartDownloadFirmware);
      resourceBundles = this.prepareExplicitProtocolV2ResourceFiles();
      fwBinaryMap = this.collectExplicitTargetBinaries();
      bootloaderBinary = this.prepareBootloaderBinary();
      const needsRemoteFirmware = !this.hasExplicitProtocolV2Payload(fwBinaryMap);
      const needsRemoteBootResources = !!this.params.targetsToUpdate?.includes('boot_resources');
      if (needsRemoteFirmware || needsRemoteResources || needsRemoteBootResources) {
        // Remote updates must use a freshly fetched config before any reboot or file write.
        await DataManager.forceReloadData({
          requireResources: needsRemoteResources || needsRemoteBootResources,
        });
      }
      if (needsRemoteFirmware) {
        const remoteBinaries = await this.prepareRemoteProtocolV2Binaries(
          firmwareType,
          deviceFeatures
        );
        bootloaderBinary = remoteBinaries.bootloaderBinary;
        fwBinaryMap = remoteBinaries.fwBinaryMap;
        installItems = remoteBinaries.installItems;
      }
      const bootResourceFiles = await this.prepareProtocolV2BootResources();
      if (bootResourceFiles?.length) {
        resourceBundles = [...(resourceBundles ?? []), ...bootResourceFiles];
      }
      if (!needsRemoteResources) {
        this.postTipMessage(FirmwareUpdateTipMessage.FinishDownloadFirmware);
      }
    } catch (err) {
      if (err instanceof HardwareError && err.errorCode === HardwareErrorCode.NetworkError) {
        throw err;
      }
      throw ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateDownloadFailed, err.message ?? err);
    }

    if (
      !bootloaderBinary &&
      fwBinaryMap.length === 0 &&
      !installItems?.length &&
      !resourceBundles?.length &&
      !needsRemoteResources
    ) {
      throw ERRORS.TypedError(
        HardwareErrorCode.FirmwareUpdateDownloadFailed,
        'No firmware to update'
      );
    }

    const enteredBootloader = await this.enterProtocolV2BootloaderMode();

    if (needsRemoteResources) {
      try {
        const stableResources = await this.prepareProtocolV2ResourceBundles();
        resourceBundles = [...(resourceBundles ?? []), ...(stableResources ?? [])];
        this.postTipMessage(FirmwareUpdateTipMessage.FinishDownloadFirmware);
      } catch (err) {
        if (enteredBootloader) {
          try {
            await this.exitProtocolV2BootloaderToNormal();
          } catch (restoreError) {
            Log.warn(
              '[FirmwareUpdateV4] failed to restore App mode after resource preparation error:',
              restoreError
            );
          }
        }
        throw ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateDownloadFailed, err.message ?? err);
      }
    }

    await this.executeProtocolV2Update({
      fwBinaryMap,
      bootloaderBinary,
      ...(installItems ? { installItems } : undefined),
      ...(resourceBundles?.length ? { resourceBundles } : undefined),
    });

    this.postTipMessage(FirmwareUpdateTipMessage.SwitchFirmwareReconnectDevice);
    await this.exitProtocolV2BootloaderToNormal();

    const versions = await this.waitForProtocolV2FinalFeatures();
    this.postTipMessage(FirmwareUpdateTipMessage.FirmwareUpdateCompleted);
    DevicePool.resetState();

    return versions;
  }

  private async getProtocolV2DeviceFeatures(): Promise<Features> {
    if (this.device.features) {
      return this.device.features;
    }
    if (typeof this.device.getFeatures === 'function') {
      const features = await this.device.getFeatures();
      if (features) return features;
    }
    throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Device features not available');
  }

  private getProtocolV2SerialNumber(deviceInfo: ProtocolV2DeviceInfo) {
    const serialNumber = deviceInfo.hw?.serial_no?.trim();
    return serialNumber || undefined;
  }

  private assertProtocolV2DeviceInfoIdentity(deviceInfo: ProtocolV2DeviceInfo) {
    assertProtocolV2ReconnectIdentity(
      this.protocolV2ExpectedSerialNumber,
      this.getProtocolV2SerialNumber(deviceInfo),
      this.protocolV2ExpectedPath,
      this.device.originalDescriptor.path
    );
  }

  private getProtocolV2DeviceInfoTimeout() {
    return this.isBleReconnect()
      ? this.payload.protocolV2DeviceInfoTimeoutMs ?? PROTOCOL_V2_DEVICE_INFO_READY_TIMEOUT
      : PROTOCOL_V2_SHORT_RESPONSE_TIMEOUT;
  }

  private async requestProtocolV2PhysicalIdentity() {
    return requestProtocolV2DeviceInfo({
      commands: this.device.getCommands(),
      timeoutMs: this.getProtocolV2DeviceInfoTimeout(),
    });
  }

  private async captureProtocolV2PhysicalIdentity() {
    const deviceInfo = await this.requestProtocolV2PhysicalIdentity();
    const serialNumber = this.getProtocolV2SerialNumber(deviceInfo);
    const path = this.device.originalDescriptor.path?.trim() || undefined;
    assertProtocolV2ReconnectIdentity(serialNumber, serialNumber, path, path);
    this.protocolV2ExpectedSerialNumber = serialNumber;
    this.protocolV2ExpectedPath = path;
  }

  private async verifyProtocolV2ReconnectIdentity() {
    const deviceInfo = await this.requestProtocolV2PhysicalIdentity();
    this.assertProtocolV2DeviceInfoIdentity(deviceInfo);
    return deviceInfo;
  }

  private prepareBootloaderBinary(): ArrayBuffer | null {
    return this.params.bootloaderBinary ?? null;
  }

  private hasExplicitProtocolV2Payload(fwBinaryMap: ProtocolV2TargetBinary[]) {
    return (
      !!this.params.resourceFiles?.length ||
      !!this.params.bootloaderBinary ||
      fwBinaryMap.length > 0
    );
  }

  private buildProtocolV2InstallItems({
    bootloaderBinary,
    fwBinaryMap,
  }: {
    bootloaderBinary: ArrayBuffer | null;
    fwBinaryMap: ProtocolV2TargetBinary[];
  }): ProtocolV2InstallItem[] {
    const installItems: ProtocolV2InstallItem[] = [];

    if (bootloaderBinary) {
      installItems.push({
        fileName: 'bootloader.bin',
        binary: bootloaderBinary,
        targetId: ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_BOOTLOADER,
        kind: 'bootloader',
      });
    }

    installItems.push(...fwBinaryMap.map(item => ({ ...item, kind: 'firmware' as const })));
    return installItems;
  }

  private getRemoteComponentEntries(release: IFirmwareReleaseInfo) {
    const { components } = release;
    if (!components) return [];

    const orderedKeys = [
      ...(release.installOrder ?? []),
      ...Object.keys(components).filter(key => !release.installOrder?.includes(key)),
    ];

    return orderedKeys
      .map(key => {
        const component = components[key];
        return component ? ([key, component] as const) : undefined;
      })
      .filter((entry): entry is readonly [string, IProtocolV2FirmwareComponent] => !!entry);
  }

  private getRemoteComponentTarget(key: string, component: IProtocolV2FirmwareComponent) {
    const targetName = component.target?.toUpperCase();
    if (targetName === 'ROMLOADER') {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        PROTOCOL_V2_ROMLOADER_UNSUPPORTED_MESSAGE
      );
    }
    const target = PROTOCOL_V2_REMOTE_COMPONENT_TARGETS[targetName];
    if (!target) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        `Unsupported Protocol V2 firmware component target: ${key}/${component.target}`
      );
    }
    return target;
  }

  private async downloadRemoteProtocolV2Component(
    key: string,
    component: IProtocolV2FirmwareComponent
  ): Promise<ProtocolV2RemoteComponentBinary> {
    const target = this.getRemoteComponentTarget(key, component);
    if (!component.url) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        `Missing Protocol V2 firmware component url: ${key}/${component.target}`
      );
    }

    const { binary } = await getSysResourceBinary(component.url);
    if (!isProtocolV2FirmwareFingerprintValid(binary, component.fingerprint)) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        `Protocol V2 firmware fingerprint mismatch: ${key}/${component.target}`
      );
    }
    const expectedPayloadHash = normalizeProtocolV2Hex(component.payloadHash);
    if (expectedPayloadHash) {
      const header = parseProtocolV2OkppHeader(toProtocolV2Bytes(binary));
      if (!header || header.payloadHash !== expectedPayloadHash) {
        throw ERRORS.TypedError(
          HardwareErrorCode.RuntimeError,
          `Protocol V2 firmware payload hash mismatch: ${key}/${component.target}`
        );
      }
    }
    return {
      ...target,
      binary,
    };
  }

  private async prepareRemoteProtocolV2Binaries(firmwareType: EFirmwareType, features: Features) {
    const release = DataManager.getFirmwareLatestRelease(features, firmwareType);

    let bootloaderBinary: ArrayBuffer | null = null;
    const fwBinaryMap: ProtocolV2TargetBinary[] = [];
    const installItems: ProtocolV2InstallItem[] = [];

    if (!release) {
      return {
        bootloaderBinary,
        fwBinaryMap,
        installItems,
      };
    }

    const entries = this.getRemoteComponentEntries(release);
    const targetsToUpdate = new Set(this.params.targetsToUpdate ?? []);

    for (const [key, component] of entries) {
      const targetName = component.target?.toUpperCase();
      const target = PROTOCOL_V2_REMOTE_COMPONENT_TARGETS[targetName];
      const updateTarget = target
        ? PROTOCOL_V2_UPDATE_TARGET_BY_TARGET_ID.get(target.targetId)
        : undefined;
      if (updateTarget && targetsToUpdate.has(updateTarget)) {
        const remoteBinary = await this.downloadRemoteProtocolV2Component(key, component);
        if (remoteBinary.kind === 'bootloader') {
          bootloaderBinary = remoteBinary.binary;
          installItems.push({
            fileName: remoteBinary.fileName,
            binary: remoteBinary.binary,
            targetId: remoteBinary.targetId,
            kind: remoteBinary.kind,
          });
        } else {
          const binaryEntry = {
            fileName: remoteBinary.fileName,
            binary: remoteBinary.binary,
            targetId: remoteBinary.targetId,
          };
          fwBinaryMap.push(binaryEntry);
          installItems.push({ ...binaryEntry, kind: remoteBinary.kind });
        }
      }
    }

    return {
      bootloaderBinary,
      fwBinaryMap,
      installItems,
    };
  }

  private getProtocolV2DeviceType(): EDeviceType.Pro2 | EDeviceType.Neo {
    const deviceType = this.device.getCurrentDeviceType();
    if (deviceType === EDeviceType.Pro2 || deviceType === EDeviceType.Neo) return deviceType;
    throw new Error(`Unsupported Protocol V2 device type: ${deviceType}`);
  }

  private async prepareProtocolV2BootResources(): Promise<
    ProtocolV2ResourceBundleBinary[] | undefined
  > {
    if (!this.params.targetsToUpdate?.includes('boot_resources')) return undefined;
    const resource = DataManager.getProtocolV2BootResources(this.getProtocolV2DeviceType());
    if (!resource) throw new Error('Missing Protocol V2 boot resources configuration');

    const files: ProtocolV2ResourceBundleBinary[] = [];
    for (const file of resource.files) {
      Log.log(`[FirmwareUpdateV4] downloading boot resource ${file.devicePath}`);
      const { binary } = await getSysResourceBinary(file.url);
      if (!isProtocolV2ResourceFileValid(binary, file)) {
        throw new Error(`Boot resource file verification failed: ${file.devicePath}`);
      }
      files.push({
        name: file.name ?? file.devicePath.split('/').pop() ?? file.devicePath,
        binary,
        devicePath: file.devicePath,
      });
    }
    return files;
  }

  private prepareExplicitProtocolV2ResourceFiles(): ProtocolV2ResourceBundleBinary[] | undefined {
    const files = this.params.resourceFiles ?? [];
    if (!files?.length) return undefined;

    const prepared = files.map((file, index) => {
      const devicePath = validateProtocolV2FilesystemPath(
        file.devicePath,
        `resourceFiles[${index}].devicePath`
      );
      const descriptor = file as typeof file &
        Pick<Partial<IProtocolV2ResourceFile>, 'size' | 'fileHash'>;
      if (descriptor.size !== undefined && descriptor.size !== file.binary.byteLength) {
        throw new Error(`resourceFiles[${index}] size mismatch`);
      }
      if (
        descriptor.fileHash &&
        !isProtocolV2ResourceFileValid(file.binary, {
          size: file.binary.byteLength,
          fileHash: descriptor.fileHash,
        })
      ) {
        throw new Error(`resourceFiles[${index}] SHA-256 mismatch`);
      }
      return {
        name: devicePath.split('/').pop() ?? devicePath,
        binary: file.binary,
        devicePath,
      };
    });
    if (new Set(prepared.map(file => file.devicePath)).size !== prepared.length) {
      throw new Error('resourceFiles contain duplicate devicePath values');
    }
    return prepared;
  }

  private async prepareProtocolV2ResourceBundles(): Promise<
    ProtocolV2ResourceBundleBinary[] | undefined
  > {
    if (!this.params.targetsToUpdate?.includes('resource')) {
      return undefined;
    }

    const resources = DataManager.getProtocolV2Resources(this.getProtocolV2DeviceType());
    if (!resources?.length) {
      throw new Error('Missing Pro2 stable resource configuration');
    }

    const inventory = this.params.forcedUpdateRes
      ? undefined
      : await readProtocolV2ResourceInventory({
          commands: this.device.getCommands(),
          resources,
          chunkSize: this.getProtocolV2FirmwareChunkSize(),
          timeoutMs: PROTOCOL_V2_SHORT_RESPONSE_TIMEOUT,
        });
    const plan = buildProtocolV2ResourceUpdatePlan({
      resources,
      inventory,
      mode: 'bootloader-recovery',
      forced: this.params.forcedUpdateRes,
    });
    Log.log(
      `[FirmwareUpdateV4] Protocol V2 resource plan mode=bootloader-recovery status=${plan.status} count=${plan.resources.length}`
    );

    const bundles: ProtocolV2ResourceBundleBinary[] = [];
    for (const resource of plan.resources) {
      bundles.push(await this.downloadProtocolV2Resource(resource));
    }
    return bundles;
  }

  private async downloadProtocolV2Resource(
    resource: IProtocolV2Resource
  ): Promise<ProtocolV2ResourceBundleBinary> {
    Log.log(`[FirmwareUpdateV4] downloading Pro2 resource ${resource.type}`);
    const { binary } = await getSysResourceBinary(resource.url);
    if (!isProtocolV2ResourceFileValid(binary, resource)) {
      throw new Error(`Pro2 resource file verification failed: ${resource.type}`);
    }
    return {
      name: `${resource.type}.okpkg`,
      binary,
      devicePath: PROTOCOL_V2_RESOURCE_DEVICE_PATHS[resource.type],
    };
  }

  private async syncProtocolV2ResourceBundles(
    bundles: ProtocolV2ResourceBundleBinary[],
    firmwareSize: number
  ): Promise<{ processedSize: number; totalSize: number }> {
    const transferStartTime = Date.now();
    const transferTransport = this.getProtocolV2FirmwareTransferTransport();

    // Write directly to the device through FileWrite.
    let totalSize = 0;
    for (const b of bundles) totalSize += b.binary.byteLength;

    const transferTotalSize = totalSize + firmwareSize;
    let processedSize = 0;
    for (const bundle of bundles) {
      Log.log(
        `[FirmwareUpdateV4] syncing resource ${bundle.name} -> ${bundle.devicePath} bytes=${bundle.binary.byteLength}`
      );
      processedSize = await this.protocolV2CommonUpdateProcess({
        payload: bundle.binary,
        filePath: bundle.devicePath,
        processedSize,
        totalSize: transferTotalSize,
      });
    }

    const elapsedMs = Date.now() - transferStartTime;
    Log.log(
      `[FirmwareUpdateV4] resource sync finished transport=${transferTransport} bytes=${totalSize} elapsed=${(
        elapsedMs / 1000
      ).toFixed(2)}s speed=${formatProtocolV2TransferSpeed(totalSize, elapsedMs)} KB/s`
    );
    return { processedSize, totalSize: transferTotalSize };
  }

  private isProtocolV2BootloaderMode() {
    if (typeof this.device.isBootloader === 'function') {
      return !!this.device.isBootloader();
    }
    return (
      this.device.features?.mode === 'bootloader' ||
      (this.device.features?.mode == null && !!this.device.features?.bootloaderMode)
    );
  }

  private isProtocolV2RomloaderMode() {
    const deviceType = this.device.getCurrentDeviceType();
    if (
      !this.device.isProtocolV2() ||
      (deviceType !== EDeviceType.Pro2 && deviceType !== EDeviceType.Neo)
    ) {
      return false;
    }
    if (typeof this.device.isRomloader === 'function') {
      return this.device.isRomloader();
    }
    return this.device.features?.mode === 'romloader';
  }

  async enterProtocolV2BootloaderMode() {
    // romloader is the first update environment and forwards targets to bootloader.
    // It rejects DeviceRebootType.Bootloader, so reuse the current connection.
    if (this.isProtocolV2RomloaderMode()) {
      Log.debug('Protocol V2 device is in romloader mode; start firmware update directly');
      return false;
    }
    if (this.isProtocolV2BootloaderMode()) {
      Log.debug('Protocol V2 device is already in bootloader mode, skip reboot');
      this.postTipMessage(FirmwareUpdateTipMessage.GoToBootloaderSuccess);
      return false;
    }

    try {
      this.postTipMessage(FirmwareUpdateTipMessage.AutoRebootToBootloader);
      await this.protocolV2Reboot(DeviceRebootType.Bootloader);
      await wait(1000);
      await this.waitForProtocolV2BootloaderMode();
      this.postTipMessage(FirmwareUpdateTipMessage.GoToBootloaderSuccess);
      return true;
    } catch (error) {
      if (error instanceof HardwareError) {
        throw error;
      }
      Log.log('Protocol V2 auto go to bootloader mode failed: ', error);
      throw ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateAutoEnterBootFailure);
    }
  }

  private async waitForProtocolV2BootloaderMode(
    timeout = PROTOCOL_V2_BOOTLOADER_RECONNECT_TIMEOUT,
    retryInterval = 1000
  ) {
    const startTime = Date.now();
    let lastError: unknown;
    let shouldReconnect = true;

    while (Date.now() - startTime < timeout) {
      try {
        if (shouldReconnect) {
          await this.reconnectProtocolV2Device();
          shouldReconnect = false;
        }
        const deviceInfo = await requestProtocolV2DeviceInfo({
          commands: this.device.getCommands(),
          timeoutMs: this.getProtocolV2DeviceInfoTimeout(),
        });
        this.assertProtocolV2DeviceInfoIdentity(deviceInfo);
        const features = await this.device.probeProtocolV2RuntimeState(
          deviceInfo,
          PROTOCOL_V2_SHORT_RESPONSE_TIMEOUT
        );
        if (features?.mode === 'bootloader') {
          return features;
        }
        lastError = new Error('Protocol V2 device is reachable but is not in bootloader mode');
      } catch (error) {
        if (this.isProtocolV2ReconnectIdentityError(error)) {
          throw error;
        }
        shouldReconnect = true;
        lastError = error;
        Log.log('Protocol V2 bootloader mode not ready, polling reconnect: ', error);
      }
      await wait(retryInterval);
    }

    throw ERRORS.TypedError(
      HardwareErrorCode.FirmwareUpdateAutoEnterBootFailure,
      `Protocol V2 bootloader not ready within ${timeout / 1000}s: ${this.normalizeErrorMessage(
        lastError
      )}`
    );
  }

  /**
   * Collect explicit target binaries grouped by DeviceFirmwareTargetType.
   * Filenames are display-only staging paths because target_id is explicit.
   */
  private collectExplicitTargetBinaries() {
    const entries: ProtocolV2TargetBinary[] = [];
    const push = (binary: ArrayBuffer | undefined, fileName: string, targetId: number) => {
      if (binary) entries.push({ fileName, binary, targetId });
    };

    if (this.params.romloaderBinary) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        PROTOCOL_V2_ROMLOADER_UNSUPPORTED_MESSAGE
      );
    }
    push(
      this.params.applicationP1Binary,
      'application_p1.bin',
      ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_APPLICATION_P1
    );
    push(
      this.params.applicationP2Binary,
      'application_p2.bin',
      ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_APPLICATION_P2
    );
    push(
      this.params.coprocessorBinary,
      'coprocessor.bin',
      ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_COPROCESSOR
    );
    push(this.params.se01Binary, 'se01.bin', ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE01);
    push(this.params.se02Binary, 'se02.bin', ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE02);
    push(this.params.se03Binary, 'se03.bin', ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE03);
    push(this.params.se04Binary, 'se04.bin', ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE04);
    return entries;
  }

  private async executeProtocolV2Update({
    fwBinaryMap,
    bootloaderBinary,
    installItems,
    resourceBundles,
  }: {
    fwBinaryMap?: ProtocolV2TargetBinary[];
    bootloaderBinary?: ArrayBuffer | null;
    installItems?: ProtocolV2InstallItem[];
    resourceBundles?: ProtocolV2ResourceBundleBinary[];
  }) {
    const orderedInstallItems =
      installItems ??
      this.buildProtocolV2InstallItems({
        bootloaderBinary: bootloaderBinary ?? null,
        fwBinaryMap: fwBinaryMap ?? [],
      });

    let firmwareSize = 0;
    for (const item of orderedInstallItems) firmwareSize += item.binary.byteLength;

    this.postTipMessage(FirmwareUpdateTipMessage.StartTransferData);

    let processedSize = 0;
    let totalSize = firmwareSize;
    if (resourceBundles?.length) {
      const resourceTransfer = await this.syncProtocolV2ResourceBundles(
        resourceBundles,
        firmwareSize
      );
      processedSize = resourceTransfer.processedSize;
      totalSize = resourceTransfer.totalSize;
    }

    // Skip staging and installation when the update contains resource files only.
    if (orderedInstallItems.length === 0) {
      Log.log('[FirmwareUpdateV4] no firmware targets to install (resource files only)');
      if (totalSize > 0) {
        this.postProgressMessage(100, 'transferData');
      }
      return;
    }
    let transferredSize = processedSize;
    const transferStartTime = Date.now();
    const transferTransport = this.getProtocolV2FirmwareTransferTransport();
    const chunkSize = this.getProtocolV2FirmwareChunkSize();
    const onTransferredBytes = (bytes: number) => {
      transferredSize = bytes;
    };
    Log.log(
      `[FirmwareUpdateV4] transfer started transport=${transferTransport} total=${totalSize} bytes chunk=${chunkSize} bytes`
    );

    const stagedInstallTargets: ProtocolV2InstallTarget[] = [];

    try {
      for (const item of orderedInstallItems) {
        const filePath = this.getProtocolV2InstallItemStagingPath(item);
        Log.log(
          `[FirmwareUpdateV4] staging ${item.kind} via FilesystemFileWrite target=${item.targetId} path=${filePath} source=${item.fileName} bytes=${item.binary.byteLength}`
        );
        processedSize = await this.protocolV2CommonUpdateProcess({
          payload: item.binary,
          filePath,
          processedSize,
          totalSize,
          onTransferredBytes,
        });
        transferredSize = processedSize;
        await this.verifyProtocolV2StagedFile(filePath, item.binary.byteLength);

        stagedInstallTargets.push({
          ...item,
          path: filePath,
        });
      }

      if (totalSize > 0) {
        this.postProgressMessage(100, 'transferData');
      }

      const elapsedMs = Date.now() - transferStartTime;
      Log.log(
        `[FirmwareUpdateV4] transfer finished transport=${transferTransport} bytes=${totalSize} elapsed=${(
          elapsedMs / 1000
        ).toFixed(2)}s speed=${formatProtocolV2TransferSpeed(totalSize, elapsedMs)} KB/s`
      );
    } catch (error) {
      const elapsedMs = Date.now() - transferStartTime;
      Log.warn(
        `[FirmwareUpdateV4] transfer failed transport=${transferTransport} bytes=${transferredSize}/${totalSize} elapsed=${(
          elapsedMs / 1000
        ).toFixed(2)}s speed=${formatProtocolV2TransferSpeed(transferredSize, elapsedMs)} KB/s`
      );
      throw error;
    }

    this.postTipMessage(FirmwareUpdateTipMessage.ConfirmOnDevice);

    const allTargets = stagedInstallTargets.map(item => ({
      target_id: item.targetId,
      path: item.path,
    }));
    Log.log(`[FirmwareUpdateV4] DeviceFirmwareUpdateRequest targets=${JSON.stringify(allTargets)}`);
    await this.protocolV2StartFirmwareUpdate({ targets: allTargets });
    await this.waitForProtocolV2FirmwareUpdateComplete(allTargets);
  }

  private getProtocolV2InstallItemStagingPath(item: ProtocolV2InstallItem) {
    return `${PROTOCOL_V2_FIRMWARE_STAGING_VOLUME}${item.fileName}`;
  }

  private async verifyProtocolV2StagedFile(path: string, expectedSize: number) {
    const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());
    const response = await typedCall('FilesystemPathInfoQuery', 'FilesystemPathInfo', { path });
    const actualSize = toProtocolV2FiniteNumber(response.message?.size);
    if (!response.message?.exist || response.message?.directory || actualSize !== expectedSize) {
      throw ERRORS.TypedError(
        HardwareErrorCode.EmmcFileWriteFirmwareError,
        `staged file verification failed: path=${path} exist=${!!response.message
          ?.exist} expected=${expectedSize} actual=${actualSize ?? 'unknown'}`
      );
    }
  }

  private assertProtocolV2TargetStatus(
    statusTargets: ProtocolV2FirmwareUpdateStatusTarget[],
    expectedTargetIds: Set<number>
  ) {
    Log.log(
      `[FirmwareUpdateV4] DeviceFirmwareUpdateStatus records=${JSON.stringify(statusTargets)}`
    );
    const failedTarget = statusTargets.find(
      target =>
        expectedTargetIds.has(normalizeProtocolV2TargetId(target.target_id) ?? -1) &&
        isProtocolV2TargetStatusFailed(target.status)
    );
    if (failedTarget) {
      const failedTargetDetails = JSON.stringify({
        targetId: failedTarget.target_id,
        status: failedTarget.status,
        payloadVersion: failedTarget.payload_version,
        path: failedTarget.path,
      });
      Log.error(`[FirmwareUpdateV4] firmware install failed target=${failedTargetDetails}`);
      throw ERRORS.TypedError(
        HardwareErrorCode.FirmwareError,
        `Protocol V2 firmware target failed: target=${failedTarget.target_id} status=${
          failedTarget.status ?? 'unknown'
        } payloadVersion=${failedTarget.payload_version ?? 'unknown'} path=${
          failedTarget.path ?? 'unknown'
        }`
      );
    }

    const matchingTargets = statusTargets.filter(target =>
      expectedTargetIds.has(normalizeProtocolV2TargetId(target.target_id) ?? -1)
    );
    const completedTargetIds = new Set<number>();
    matchingTargets.forEach(target => {
      const targetId = normalizeProtocolV2TargetId(target.target_id);
      if (targetId !== undefined && isProtocolV2TargetStatusFinished(target.status)) {
        completedTargetIds.add(targetId);
      }
    });
    const allExpectedTargetsCompleted =
      expectedTargetIds.size > 0 &&
      Array.from(expectedTargetIds).every(targetId => completedTargetIds.has(targetId));
    if (allExpectedTargetsCompleted) {
      this.postProgressMessage(100, 'installingFirmware');
      return true;
    }

    if (expectedTargetIds.size > 0 && matchingTargets.length > 0) {
      const hasInProgressTarget = matchingTargets.some(target =>
        isProtocolV2TargetStatusInProgress(target.status)
      );
      const completedProgress = Math.floor(
        (completedTargetIds.size / expectedTargetIds.size) * 100
      );
      // The protocol exposes no per-target percentage, so report coarse progress by
      // completed targets and use 1% once work starts to keep the UI responsive.
      const progress = Math.min(99, Math.max(completedProgress, hasInProgressTarget ? 1 : 0));
      this.postProgressMessage(progress, 'installingFirmware');
    }

    return false;
  }

  private getProtocolV2MissingTargetIds(
    statusTargets: ProtocolV2FirmwareUpdateStatusTarget[],
    expectedTargetIds: Set<number>
  ) {
    const reportedTargetIds = new Set<number>();
    statusTargets.forEach(target => {
      const targetId = normalizeProtocolV2TargetId(target.target_id);
      if (targetId !== undefined) {
        reportedTargetIds.add(targetId);
      }
    });
    return Array.from(expectedTargetIds).filter(targetId => !reportedTargetIds.has(targetId));
  }

  private async waitForProtocolV2FirmwareUpdateComplete(
    targets: Array<{ target_id: number; path: string }>
  ) {
    const expectedTargetIds = new Set(targets.map(target => target.target_id));
    const startTime = Date.now();
    let lastError: unknown;
    let shouldReconnect = true;
    let deviceInfo: ProtocolV2DeviceInfo | undefined;
    let missingTargetStatusSince: number | undefined;
    let missingTargetStatusKey: string | undefined;
    const resetMissingTargetStatusGrace = () => {
      missingTargetStatusSince = undefined;
      missingTargetStatusKey = undefined;
    };

    while (Date.now() - startTime < PROTOCOL_V2_INSTALL_TIMEOUT) {
      try {
        if (shouldReconnect) {
          await this.reconnectProtocolV2Device();
          deviceInfo = await this.verifyProtocolV2ReconnectIdentity();
          shouldReconnect = false;
        }
        const currentDeviceInfo = deviceInfo;
        try {
          const statusResponse = await this.device.getCommands().typedCall(
            'DeviceFirmwareUpdateStatusGet',
            'DeviceFirmwareUpdateStatus',
            {
              fields: {
                status: true,
                payload_version: true,
                path: true,
              },
            },
            { timeoutMs: PROTOCOL_V2_FIRMWARE_STATUS_RESPONSE_TIMEOUT }
          );
          const statusTargets = (statusResponse.message.records ??
            []) as ProtocolV2FirmwareUpdateStatusTarget[];
          if (this.assertProtocolV2TargetStatus(statusTargets, expectedTargetIds)) {
            return;
          }

          if (
            statusTargets.length === 0 &&
            currentDeviceInfo &&
            (await this.probeProtocolV2NormalMode(currentDeviceInfo))
          ) {
            Log.log(
              '[FirmwareUpdateV4] empty firmware status after confirmed App reboot; update complete'
            );
            this.postProgressMessage(100, 'installingFirmware');
            return;
          }

          const missingTargetIds = this.getProtocolV2MissingTargetIds(
            statusTargets,
            expectedTargetIds
          );
          if (missingTargetIds.length > 0) {
            const now = Date.now();
            const missingKey = missingTargetIds.join(',');
            if (missingTargetStatusSince === undefined || missingTargetStatusKey !== missingKey) {
              missingTargetStatusSince = now;
              missingTargetStatusKey = missingKey;
            } else if (
              now - missingTargetStatusSince >=
              PROTOCOL_V2_MISSING_TARGET_STATUS_GRACE_TIMEOUT
            ) {
              const reportedTargetIds = statusTargets
                .map(target => normalizeProtocolV2TargetId(target.target_id))
                .filter((targetId): targetId is number => targetId !== undefined);
              throw ERRORS.TypedError(
                HardwareErrorCode.FirmwareError,
                `Protocol V2 firmware status is missing requested records: targetIds=${missingKey} reportedTargetIds=${reportedTargetIds.join(
                  ','
                )}`
              );
            }
            lastError = new Error(
              `Protocol V2 firmware status is temporarily missing targetIds=${missingKey}`
            );
          } else {
            resetMissingTargetStatusGrace();
            lastError = new Error('Protocol V2 firmware targets are still installing');
          }
        } catch (error) {
          if (
            error instanceof HardwareError &&
            error.errorCode === HardwareErrorCode.FirmwareError
          ) {
            throw error;
          }
          // Only consecutive full status dumps can prove that a record is absent.
          // A reboot or transport interruption starts a fresh grace window.
          resetMissingTargetStatusGrace();
          // App firmware does not register DeviceFirmwareUpdateStatusGet. Treat the
          // missing endpoint as completion only after the runtime probe confirms App mode.
          if (isProtocolV2FirmwareStatusEndpointUnavailable(error)) {
            if (!currentDeviceInfo) {
              throw ERRORS.TypedError(
                HardwareErrorCode.RuntimeError,
                'Protocol V2 device identity is unavailable during install polling'
              );
            }
            if (await this.probeProtocolV2NormalMode(currentDeviceInfo)) {
              Log.log(
                '[FirmwareUpdateV4] firmware status endpoint unavailable after confirmed App reboot'
              );
              this.postProgressMessage(100, 'installingFirmware');
              return;
            }
            lastError = new Error(
              'Protocol V2 firmware status endpoint is unavailable while the device remains in loader mode'
            );
          } else {
            shouldReconnect = true;
            deviceInfo = undefined;
            lastError = error;
            Log.log(
              '[FirmwareUpdateV4] DeviceFirmwareUpdateStatusGet unavailable during install: ',
              error
            );
          }
        }
      } catch (error) {
        lastError = error;
        if (this.isProtocolV2ReconnectIdentityError(error)) {
          throw error;
        }
        if (error instanceof HardwareError && error.errorCode === HardwareErrorCode.FirmwareError) {
          throw error;
        }
        shouldReconnect = true;
        deviceInfo = undefined;
        resetMissingTargetStatusGrace();
        Log.log('Protocol V2 firmware install device readiness probe failed: ', error);
      }
      await wait(1000);
    }

    throw ERRORS.TypedError(
      HardwareErrorCode.RuntimeError,
      `Protocol V2 firmware update status not complete within ${
        PROTOCOL_V2_INSTALL_TIMEOUT / 1000
      }s: ${this.normalizeErrorMessage(lastError)}`
    );
  }

  private async exitProtocolV2BootloaderToNormal() {
    await this.reconnectProtocolV2Device();
    const deviceInfo = await this.verifyProtocolV2ReconnectIdentity();
    try {
      if (await this.probeProtocolV2NormalMode(deviceInfo)) {
        Log.log('[FirmwareUpdateV4] device already returned to App mode; skip Normal reboot');
        return;
      }
    } catch (error) {
      Log.log('[FirmwareUpdateV4] unable to confirm App mode before Normal reboot: ', error);
    }
    await this.protocolV2Reboot(DeviceRebootType.Normal);
  }

  private async probeProtocolV2NormalMode(deviceInfo: ProtocolV2DeviceInfo) {
    const features = await this.device.probeProtocolV2RuntimeState(
      deviceInfo,
      PROTOCOL_V2_SHORT_RESPONSE_TIMEOUT
    );
    return features.mode === 'normal' && !features.bootloaderMode;
  }

  private async waitForProtocolV2FinalFeatures() {
    const features = await this.waitForProtocolV2ReconnectAndFeatures(
      PROTOCOL_V2_FINAL_RECONNECT_TIMEOUT
    );

    return this.getProtocolV2VersionResult(features);
  }

  private getProtocolV2VersionResult(features: Features) {
    const bootloaderVersion = getDeviceBootloaderVersion(features).join('.');
    const bleVersion = getDeviceBLEFirmwareVersion(features).join('.');
    const firmwareVersion = getDeviceFirmwareVersion(features).join('.');
    if (firmwareVersion === '0.0.0') {
      Log.warn(
        'Protocol V2 firmware update finished but app firmware version is still 0.0.0. This is allowed for Pro2 debug BLE-only update flows.'
      );
    }

    return {
      bootloaderVersion,
      bleVersion,
      firmwareVersion,
    };
  }

  private async waitForProtocolV2ReconnectAndFeatures(timeout: number) {
    const startTime = Date.now();
    let lastError: unknown;
    let shouldReconnect = true;

    while (Date.now() - startTime < timeout) {
      try {
        if (shouldReconnect) {
          await this.reconnectProtocolV2Device();
          shouldReconnect = false;
        }
        const deviceInfo = await requestProtocolV2DeviceInfo({
          commands: this.device.getCommands(),
          timeoutMs: this.getProtocolV2DeviceInfoTimeout(),
          // Completion needs target versions only; keep scope aligned with the request.
          request: PROTOCOL_V2_VERSIONS_DEVICE_INFO_REQUEST,
        });
        this.assertProtocolV2DeviceInfoIdentity(deviceInfo);
        const features = await this.device.probeProtocolV2RuntimeState(
          deviceInfo,
          PROTOCOL_V2_SHORT_RESPONSE_TIMEOUT
        );
        if (features.mode === 'normal' && !features.bootloaderMode) {
          return features;
        }
        lastError = ERRORS.TypedError(
          HardwareErrorCode.DeviceNotFound,
          'Protocol V2 device is still in bootloader mode'
        );
      } catch (error) {
        if (this.isProtocolV2ReconnectIdentityError(error)) {
          throw error;
        }
        shouldReconnect = true;
        lastError = error;
        Log.log('Protocol V2 normal mode not ready, polling Ping: ', error);
      }
      await wait(1000);
    }

    throw ERRORS.TypedError(
      HardwareErrorCode.DeviceNotFound,
      `Protocol V2 final features not ready within ${timeout / 1000}s: ${this.normalizeErrorMessage(
        lastError
      )}`
    );
  }

  private async reconnectProtocolV2Device() {
    if (this.isBleReconnect()) {
      await this.acquireProtocolV2BleDevice();
      return;
    }

    const deviceDiff = await this.device.deviceConnector?.enumerate();
    const devicesDescriptor = deviceDiff?.descriptors ?? [];

    if (
      DataManager.isBrowserWebUsb(DataManager.getSettings('env')) &&
      devicesDescriptor.length === 1
    ) {
      const descriptor = devicesDescriptor[0];
      if (!this.protocolV2ExpectedSerialNumber && descriptor.path !== this.protocolV2ExpectedPath) {
        throw ERRORS.TypedError(HardwareErrorCode.DeviceNotFound);
      }
      this.device.updateDescriptor(
        {
          ...descriptor,
          protocolType: PROTOCOL_V2_CONNECT_PROTOCOL,
        },
        true
      );
      await this.ensureProtocolV2DeviceAcquired();
      this.device.commands.disposed = false;
      this.device.getCommands().mainId = this.device.mainId ?? '';
      return;
    }

    // Reinitialize every USB descriptor so DeviceInfo can provide the physical serial.
    // Enumeration order is not stable and must never decide the reconnect target.
    const { deviceList } = await DevicePool.getDevices(devicesDescriptor, undefined, {
      connectProtocol: PROTOCOL_V2_CONNECT_PROTOCOL,
    });
    const expectedSerialNumber = this.protocolV2ExpectedSerialNumber?.trim();
    const expectedPath = this.protocolV2ExpectedPath?.trim();
    const reconnectDevice = deviceList.find(candidate => {
      const candidateSerialNumber = candidate.getCurrentSerialNo?.().trim();
      if (expectedSerialNumber && candidateSerialNumber) {
        return candidateSerialNumber === expectedSerialNumber;
      }
      return !!expectedPath && candidate.getConnectId() === expectedPath;
    });
    if (!reconnectDevice) {
      throw ERRORS.TypedError(HardwareErrorCode.DeviceNotFound);
    }

    Log.debug(
      'Protocol V2 firmware reconnect using matched device:',
      reconnectDevice.getConnectId()
    );
    this.device.updateFromCache(reconnectDevice);
    await this.ensureProtocolV2DeviceAcquired();
    this.device.commands.disposed = false;
    this.device.getCommands().mainId = this.device.mainId ?? '';
  }

  /**
   * After acquiring a USB session, polling reuses its command channel. Reacquire only
   * after reboot or enumeration changes cause hasDeviceAcquire() to become false.
   */
  private async ensureProtocolV2DeviceAcquired() {
    const commands = this.device.getCommands();
    if (this.device.hasDeviceAcquire() && !commands.disposed) {
      return;
    }
    await this.device.acquire(PROTOCOL_V2_CONNECT_PROTOCOL, {
      throwOnRunPromiseError: true,
    });
  }

  private isProtocolV2ReconnectIdentityError(error: unknown) {
    return this.normalizeErrorMessage(error).includes('Protocol V2 reconnect physical identity');
  }

  private async protocolV2CommonUpdateProcess(params: ProtocolV2FileTransferParams) {
    let lastError: unknown;
    for (let attempt = 1; attempt <= PROTOCOL_V2_FILE_TRANSFER_RETRY_COUNT; attempt += 1) {
      try {
        return await this.protocolV2WriteWholeFile(params);
      } catch (error) {
        lastError = error;
        Log.error(
          `Protocol V2 file transfer failed path=${params.filePath} attempt=${attempt}/${PROTOCOL_V2_FILE_TRANSFER_RETRY_COUNT}; restarting from offset 0`,
          error
        );
        if (attempt === PROTOCOL_V2_FILE_TRANSFER_RETRY_COUNT) {
          break;
        }
        await this.recoverProtocolV2FileTransfer();
      }
    }

    throw ERRORS.TypedError(
      HardwareErrorCode.EmmcFileWriteFirmwareError,
      `transfer data error: ${getProtocolV2UnknownErrorText(lastError)}`
    );
  }

  private async protocolV2WriteWholeFile({
    payload,
    filePath,
    processedSize,
    totalSize,
    onTransferredBytes,
  }: ProtocolV2FileTransferParams) {
    const chunkSize = this.getProtocolV2FirmwareChunkSize();
    const getUploadProgress = (fileOffset: number) => {
      if (totalSize !== undefined && processedSize !== undefined) {
        return Math.min(Math.ceil(((processedSize + fileOffset) / totalSize) * 100), 99);
      }
      return Math.min(Math.ceil((fileOffset / payload.byteLength) * 100), 99);
    };

    try {
      await writeProtocolV2File({
        commands: this.device.getCommands(),
        path: filePath,
        data: payload,
        totalSize: payload.byteLength,
        chunkSize,
        overwrite: true,
        append: false,
        writeWithResponse: true,
        maxChunkRetries: 0,
        getUiPercentage: ({ offset, chunkLength }) =>
          getProtocolV2DeviceTransferProgress(
            (processedSize ?? 0) + offset,
            (processedSize ?? 0) + offset + chunkLength,
            totalSize ?? payload.byteLength
          ),
        onProgress: progress => {
          const transferredBytes = (processedSize ?? 0) + progress.transferredBytes;
          onTransferredBytes?.(transferredBytes);
          this.postProgressMessage(getUploadProgress(progress.transferredBytes), 'transferData', {
            transferredBytes,
            totalBytes: totalSize ?? payload.byteLength,
            rateBytesPerSecond: progress.rateBytesPerSecond,
            elapsedMs: progress.elapsedMs,
          });
        },
      });
    } catch (error) {
      if (
        error instanceof HardwareError &&
        error.errorCode === HardwareErrorCode.RuntimeError &&
        error.message.includes('FilesystemFileWrite')
      ) {
        throw ERRORS.TypedError(HardwareErrorCode.EmmcFileWriteFirmwareError, error.message);
      }
      throw error;
    }

    return totalSize !== undefined ? (processedSize ?? 0) + payload.byteLength : 0;
  }

  private getProtocolV2FirmwareTransferTransport() {
    const env = DataManager.getSettings('env');
    if (env && DataManager.isBleConnect(env)) {
      return 'BLE';
    }
    if (
      env &&
      (DataManager.isBrowserWebUsb(env) || DataManager.isDesktopWebUsb(env) || env === 'web')
    ) {
      return 'WebUSB';
    }
    return env ?? 'unknown';
  }

  private async recoverProtocolV2FileTransfer() {
    const env = DataManager.getSettings('env');
    if (DataManager.isBleConnect(env)) {
      await wait(3000);
    }
    await this.reconnectProtocolV2Device();
    await this.verifyProtocolV2ReconnectIdentity();
    await this.device.initialize();
    await wait(2000);
  }

  private async acquireProtocolV2BleDevice() {
    await this.device.deviceConnector?.acquire(
      this.device.originalDescriptor.id,
      null,
      true,
      PROTOCOL_V2_CONNECT_PROTOCOL
    );
  }

  private async protocolV2StartFirmwareUpdate({
    targets,
  }: {
    targets: Array<{ target_id: number; path: string }>;
  }) {
    const commands = this.device.getCommands();
    const response: ProtocolV2FirmwareUpdateStartResponse = await commands.typedCall(
      'DeviceFirmwareUpdateRequest',
      'Success',
      { targets },
      { timeoutMs: PROTOCOL_V2_START_UPDATE_TIMEOUT }
    );
    // Success acknowledges that the device accepted installation. End confirmation
    // and begin status polling only after receiving this ACK.
    this.postTipMessage(FirmwareUpdateTipMessage.FirmwareUpdating);
    this.postProgressMessage(0, 'installingFirmware');
    return response;
  }

  private async protocolV2Reboot(rebootType: DeviceRebootType) {
    const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());
    try {
      const res = await typedCall('DeviceReboot', 'Success', {
        reboot_type: rebootType,
      });
      this.device.markProtocolV2Reboot(rebootType);
      return res.message;
    } catch (error) {
      if (isProtocolV2DeviceDisconnectedError(error) || isProtocolV2ReconnectProbeError(error)) {
        this.device.markProtocolV2Reboot(rebootType);
        return { message: 'Device rebooted successfully' };
      }
      throw error;
    }
  }

  private normalizeErrorMessage(error: unknown): string {
    if (!error) {
      return '';
    }
    return getProtocolV2UnknownErrorText(error);
  }
}
