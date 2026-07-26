import { ERRORS, HardwareError, HardwareErrorCode, wait } from '@onekeyfe/hd-shared';
import {
  DeviceRebootType,
  PROTOCOL_V2_BLE_FILE_CHUNK_SIZE,
  PROTOCOL_V2_WEBUSB_FILE_CHUNK_SIZE,
} from '@onekeyfe/hd-transport';

import { FirmwareUpdateTipMessage, UI_REQUEST } from '../events/ui-request';
import { validateParams } from './helpers/paramsValidator';
import {
  LoggerNames,
  getDeviceBLEFirmwareVersion,
  getDeviceBootloaderVersion,
  getDeviceFirmwareVersion,
  getDeviceType,
  getDeviceUUID,
  getFirmwareType,
  getLogger,
} from '../utils';
import { getSysResourceBinary } from './firmware/getBinary';
import { DataManager } from '../data-manager';
import { FirmwareUpdateBaseMethod } from './firmware/FirmwareUpdateBaseMethod';
import { DevicePool } from '../device/DevicePool';
import {
  PROTOCOL_V2_FULL_DEVICE_INFO_REQUEST,
  PROTOCOL_V2_VERSIONS_DEVICE_INFO_REQUEST,
  ProtocolV2FirmwareTargetType,
  getProtocolV2FirmwareTargetDescriptor,
  getProtocolV2FirmwareTargetDescriptorById,
  getProtocolV2ResourceBundleNameByPath,
  normalizeProtocolV2ResourceBundleName,
  protocolV2PackedVersionToString,
  resolveProtocolV2FirmwareStagingPath,
  resolveProtocolV2ResourceBundlePath,
} from '../protocols/protocol-v2';
import { requestProtocolV2DeviceInfo } from '../protocols/protocol-v2/features';
import {
  getProtocolV2UnknownErrorText,
  isProtocolV2DeviceDisconnectedError,
} from './protocol-v2/helpers';
import {
  FirmwareHostBindingRegistry,
  FirmwareUpdateErrorCode,
  MemoryByteSource,
  RecoverableFirmwareExecutor,
  buildProtocolV2InstallTargets,
  compileProtocolV2FirmwareEpochs,
  createFirmwareUpdateError,
  createProtocolV2MemoryPreparedPlan,
  firmwareHostBindingRegistry,
  openFirmwareArtifactByteSource,
  parseProtocolV2PayloadPackageHeader,
  reconcileProtocolV2InstallRecords,
  validatePreparedPlan,
} from '../firmware-update';

import type {
  FirmwareUpdateV4Params,
  FirmwareUpdateV4Result,
  FirmwareUpdateV4Target,
  FirmwareUpdateV4TargetResult,
} from '../types/api/firmwareUpdate';
import type { EFirmwareType } from '@onekeyfe/hd-shared';
import type { TypedResponseMessage } from '../device/DeviceCommands';
import type {
  FirmwareArtifactReceipt,
  FirmwareByteSource,
  FirmwareObservedDeviceState,
  FirmwareTarget,
  FirmwareUpdateEpoch,
  PreparedPlan,
  ProtocolV2FirmwareUpdateRecord,
  ProtocolV2PreparedArtifactInput,
} from '../firmware-update';
import type {
  Features,
  IFirmwareReleaseInfo,
  IProtocolV2FirmwareComponent,
  IVersionArray,
} from '../types';

const Log = getLogger(LoggerNames.Method);

const SESSION_ERROR = 'session not found';
const PROTOCOL_V2_BOOTLOADER_RECONNECT_TIMEOUT = 60 * 1000;
const PROTOCOL_V2_FINAL_RECONNECT_TIMEOUT = 2 * 60 * 1000;
const PROTOCOL_V2_SHORT_RESPONSE_TIMEOUT = 5 * 1000;
const PROTOCOL_V2_START_UPDATE_TIMEOUT = 3 * 60 * 1000;
const PROTOCOL_V2_INSTALL_TIMEOUT = 5 * 60 * 1000;
const PROTOCOL_V2_TARGET_STATUS_PENDING = 0;
const PROTOCOL_V2_TARGET_STATUS_IN_PROGRESS = 1;
const PROTOCOL_V2_TARGET_STATUS_FINISHED = 2;
const PROTOCOL_V2_TARGET_STATUS_FAILED_MIN = 3;
const PROTOCOL_V2_CONNECT_PROTOCOL = 'V2';
const PROTOCOL_V2_MIN_FILE_CHUNK_SIZE = 64;
const PROTOCOL_V2_CONNECT_RETRY_COUNT = 10;
const PROTOCOL_V2_CONNECT_POLL_INTERVAL = 500;
const PROTOCOL_V2_CONNECT_SINGLE_TIMEOUT = 75 * 1000;
const PROTOCOL_V2_DEVICE_INFO_READY_TIMEOUT = 60 * 1000;
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

type ProtocolV2FirmwareUpdateStatusTarget = {
  target_id: number | string;
  status?: number | string;
  payload_version?: number;
  path?: string;
};

type ProtocolV2FirmwareUpdateStartResponse = TypedResponseMessage<'Success'>;

type ProtocolV2TargetBinary = {
  fileName: string;
  binary: ArrayBuffer;
  targetId: number;
  targetVersion?: string;
};
type ProtocolV2InstallItem = ProtocolV2TargetBinary & {
  kind: ProtocolV2RemoteComponentTarget['kind'];
  targetVersion?: string;
};

type ProtocolV2MemoryTransferParams = {
  payload: ArrayBuffer | Buffer;
  filePath: string;
  processedSize?: number;
  totalSize?: number;
  onTransferredBytes?: (transferredBytes: number) => void;
};
/** RESC bundle okpkg written independently to devicePath through FileWrite. */
type ProtocolV2ResourceBundleBinary = {
  name: string;
  binary: ArrayBuffer;
  devicePath: string;
  /** Download URL for remote-config mode; omitted in manual mode. */
  url?: string;
  version?: IVersionArray;
  payloadHash?: string;
  headerHash?: string;
};

type ProtocolV2RemoteComponentBinary = ProtocolV2RemoteComponentTarget & {
  binary: ArrayBuffer;
  targetVersion?: string;
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

type ProtocolV2ArtifactSourceFactory = (
  receipt: FirmwareArtifactReceipt
) => Promise<FirmwareByteSource>;

type ProtocolV2PreparedExecution = {
  preparedPlan: PreparedPlan;
  registry: FirmwareHostBindingRegistry;
  artifactSourceFactory?: ProtocolV2ArtifactSourceFactory;
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

const protocolV2PlanInvalid = (detail: string): never => {
  throw createFirmwareUpdateError(FirmwareUpdateErrorCode.FirmwarePlanInvalid, detail, { detail });
};

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

export const assertProtocolV2ReconnectIdentity = (
  expectedDeviceId?: string,
  actualDeviceId?: string,
  options: { allowMissingActual?: boolean } = {}
) => {
  if (!expectedDeviceId) return;
  if (!actualDeviceId) {
    if (options.allowMissingActual) return;
    throw ERRORS.TypedError(
      HardwareErrorCode.DeviceNotFound,
      'Protocol V2 reconnect identity unavailable'
    );
  }
  if (actualDeviceId !== expectedDeviceId) {
    throw ERRORS.TypedError(
      HardwareErrorCode.DeviceNotFound,
      `Protocol V2 reconnect identity mismatch: expected ${expectedDeviceId}, received ${actualDeviceId}`
    );
  }
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
  private protocolV2ExpectedDeviceId?: string;

  private protocolV2ActiveEpoch?: FirmwareUpdateEpoch;

  private protocolV2LatestFeatures?: Features;

  private protocolV2LatestStatusRecords: ProtocolV2FirmwareUpdateRecord[] = [];

  private readonly protocolV2InstalledTargets = new Set<FirmwareTarget>();

  private readonly protocolV2ResourceStatuses = new Map<string, 'installed' | 'unchanged'>();

  init() {
    this.allowDeviceMode = [UI_REQUEST.BOOTLOADER, UI_REQUEST.NOT_INITIALIZE];
    this.requireDeviceMode = [];
    this.unlockPolicy = 'retry-on-locked';
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
      { name: 'preparedPlan', type: 'object' },
      { name: 'firmwareCheckpoint', type: 'object' },
      { name: 'firmwareTransactionId', type: 'string' },
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
      { name: 'resourceBundleFiles', type: 'array', allowEmpty: true },
    ]);

    const legacyArtifactKeys = [
      'forcedUpdateRes',
      'bootloaderBinary',
      'romloaderBinary',
      'applicationP1Binary',
      'applicationP2Binary',
      'coprocessorBinary',
      'se01Binary',
      'se02Binary',
      'se03Binary',
      'se04Binary',
      'firmwareType',
      'targetsToUpdate',
      'resourceBundleFiles',
    ] as const;
    if (
      payload.preparedPlan &&
      legacyArtifactKeys.some(key => Object.prototype.hasOwnProperty.call(payload, key))
    ) {
      throw ERRORS.TypedError(
        HardwareErrorCode.CallMethodInvalidParameter,
        'preparedPlan cannot be combined with legacy Protocol V2 firmware inputs'
      );
    }
    if (payload.firmwareCheckpoint && !payload.preparedPlan) {
      throw ERRORS.TypedError(
        HardwareErrorCode.CallMethodInvalidParameter,
        'firmwareCheckpoint requires preparedPlan'
      );
    }

    this.params = {
      preparedPlan: payload.preparedPlan,
      firmwareCheckpoint: payload.firmwareCheckpoint,
      firmwareTransactionId: payload.firmwareTransactionId,
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
      resourceBundleFiles: payload.resourceBundleFiles,
      firmwareType: payload.firmwareType,
      targetsToUpdate: payload.targetsToUpdate,
      platform: payload.platform,
    };
  }

  private getProtocolV2FirmwareChunkSize() {
    const payloadChunkSize = Number(this.params?.chunkSize);
    const env = DataManager.getSettings('env');
    const maxChunkSize =
      this.params?.platform === 'native' || (env && DataManager.isBleConnect(env))
        ? PROTOCOL_V2_BLE_FILE_CHUNK_SIZE
        : PROTOCOL_V2_WEBUSB_FILE_CHUNK_SIZE;
    if (!Number.isFinite(payloadChunkSize) || payloadChunkSize <= 0) {
      return maxChunkSize;
    }
    return Math.min(
      Math.max(Math.floor(payloadChunkSize), PROTOCOL_V2_MIN_FILE_CHUNK_SIZE),
      maxChunkSize
    );
  }

  async run() {
    if (!this.device.isProtocolV2()) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'firmwareUpdateV4 requires a Protocol V2 device'
      );
    }

    Log.debug('FirmwareUpdateV4 strategy: Protocol V2');
    return this.runProtocolV2();
  }

  private async runProtocolV2() {
    const deviceFeatures = await this.getProtocolV2DeviceFeatures();
    this.protocolV2ExpectedDeviceId = deviceFeatures.deviceId ?? undefined;
    const deviceFirmwareType = getFirmwareType(deviceFeatures);
    const firmwareType = this.params.firmwareType ?? deviceFirmwareType;

    this.postTipMessage(FirmwareUpdateTipMessage.StartDownloadFirmware);
    let preparedExecution: ProtocolV2PreparedExecution;
    try {
      preparedExecution = this.params.preparedPlan
        ? this.prepareExternalProtocolV2Execution(deviceFeatures)
        : await this.prepareLegacyProtocolV2Execution(deviceFeatures, firmwareType);
      await this.preflightProtocolV2Artifacts(preparedExecution);
    } catch (err) {
      if (this.params.preparedPlan) {
        throw err;
      }
      const detail = err instanceof Error ? err.message : err;
      throw ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateDownloadFailed, detail);
    }
    this.postTipMessage(FirmwareUpdateTipMessage.FinishDownloadFirmware);

    const result = await this.executeProtocolV2PreparedPlan(preparedExecution);
    this.postTipMessage(FirmwareUpdateTipMessage.FirmwareUpdateCompleted);
    DevicePool.resetState();

    return result;
  }

  private prepareExternalProtocolV2Execution(features: Features): ProtocolV2PreparedExecution {
    const preparedPlan = this.validateProtocolV2PreparedPlan(this.params.preparedPlan, features);
    return {
      preparedPlan,
      registry: firmwareHostBindingRegistry,
    };
  }

  private async prepareLegacyProtocolV2Execution(
    features: Features,
    firmwareType: EFirmwareType
  ): Promise<ProtocolV2PreparedExecution> {
    let fwBinaryMap = this.collectExplicitTargetBinaries();
    let bootloaderBinary = this.prepareBootloaderBinary();
    let installItems: ProtocolV2InstallItem[] | undefined;
    if (!this.hasExplicitProtocolV2Payload(fwBinaryMap)) {
      const remoteBinaries = await this.prepareRemoteProtocolV2Binaries(firmwareType, features);
      bootloaderBinary = remoteBinaries.bootloaderBinary;
      fwBinaryMap = remoteBinaries.fwBinaryMap;
      installItems = remoteBinaries.installItems;
    }

    const resourceDescriptors = this.prepareProtocolV2ResourceBundles(firmwareType, features);
    const resourceBundles = resourceDescriptors?.length
      ? await this.materializeProtocolV2ResourceBundles(resourceDescriptors)
      : [];
    const orderedInstallItems =
      installItems ??
      this.buildProtocolV2InstallItems({
        bootloaderBinary,
        fwBinaryMap,
      });
    if (orderedInstallItems.length === 0 && resourceBundles.length === 0) {
      throw new Error('No firmware to update');
    }

    const artifacts: ProtocolV2PreparedArtifactInput[] = resourceBundles.map(bundle => ({
      target: 'resource',
      logicalName: normalizeProtocolV2ResourceBundleName(bundle.name),
      binary: bundle.binary,
    }));
    orderedInstallItems.forEach(item => {
      const descriptor = getProtocolV2FirmwareTargetDescriptorById(item.targetId);
      if (!descriptor) {
        return protocolV2PlanInvalid(
          `Unsupported Protocol V2 firmware target id: ${item.targetId}`
        );
      }
      artifacts.push({
        target: descriptor.target,
        binary: item.binary,
        ...(item.targetVersion ? { targetVersion: item.targetVersion } : {}),
      });
    });

    const memoryPlan = createProtocolV2MemoryPreparedPlan({
      device: {
        identity: getDeviceUUID(features),
        model: getDeviceType(features),
        firmwareType,
      },
      artifacts,
    });
    const registry = this.createMemoryFirmwareRegistry();
    const artifactSourceFactory: ProtocolV2ArtifactSourceFactory = receipt => {
      const binary = memoryPlan.binariesByArtifactRef.get(receipt.artifactRef);
      if (!binary) {
        return Promise.reject(
          createFirmwareUpdateError(
            FirmwareUpdateErrorCode.FirmwareArtifactReaderInvalid,
            `Protocol V2 memory artifact ${receipt.artifactId} is unavailable`
          )
        );
      }
      return Promise.resolve(new MemoryByteSource(binary));
    };
    return {
      preparedPlan: this.validateProtocolV2PreparedPlan(memoryPlan.preparedPlan, features),
      registry,
      artifactSourceFactory,
    };
  }

  private validateProtocolV2PreparedPlan(
    preparedPlanValue: unknown,
    features: Features
  ): PreparedPlan {
    const preparedPlan = validatePreparedPlan(preparedPlanValue);
    const identity = getDeviceUUID(features);
    const model = getDeviceType(features);
    if (
      !identity ||
      preparedPlan.device.identity !== identity ||
      preparedPlan.device.model !== model
    ) {
      throw createFirmwareUpdateError(
        FirmwareUpdateErrorCode.FirmwareDeviceStateConflict,
        'Protocol V2 prepared plan belongs to a different device'
      );
    }

    const receiptTargets = new Set<FirmwareTarget>();
    preparedPlan.artifactReceipts.forEach(receipt => {
      if (receipt.target === 'resource') {
        if (!receipt.logicalName) {
          return protocolV2PlanInvalid(
            `Protocol V2 resource ${receipt.artifactId} has no logical name`
          );
        }
        resolveProtocolV2ResourceBundlePath(receipt.logicalName);
      } else {
        getProtocolV2FirmwareTargetDescriptor(receipt.target);
      }
      receiptTargets.add(receipt.target);
    });
    const expectedStates = new Map(
      preparedPlan.expectedFinalStates.map(state => [state.target, state])
    );
    receiptTargets.forEach(target => {
      const expected = expectedStates.get(target);
      if (!expected) {
        return protocolV2PlanInvalid(`Protocol V2 target ${target} has no expected final state`);
      }
      if (target !== 'resource' && !expected.version) {
        protocolV2PlanInvalid(
          `Protocol V2 target ${target} requires a version for install recovery`
        );
      }
    });

    const compiledEpochs = compileProtocolV2FirmwareEpochs(
      preparedPlan.artifactReceipts.map(receipt => ({
        artifactId: receipt.artifactId,
        target: receipt.target,
      }))
    );
    if (JSON.stringify(preparedPlan.epochs) !== JSON.stringify(compiledEpochs)) {
      protocolV2PlanInvalid('Protocol V2 prepared epochs do not match the SDK-owned target table');
    }
    return preparedPlan;
  }

  private createMemoryFirmwareRegistry() {
    const registry = new FirmwareHostBindingRegistry();
    const unavailableReader = () =>
      Promise.reject(
        createFirmwareUpdateError(
          FirmwareUpdateErrorCode.FirmwareArtifactReaderInvalid,
          'Protocol V2 memory execution uses a direct byte source'
        )
      );
    registry.register({
      artifactReader: {
        open: unavailableReader,
        read: unavailableReader,
        close: () => Promise.resolve(),
        cancel: () => Promise.resolve(),
      },
      checkpointSink: {
        commit: () => Promise.resolve(),
      },
    });
    return registry;
  }

  private async preflightProtocolV2Artifacts({
    preparedPlan,
    registry,
    artifactSourceFactory,
  }: ProtocolV2PreparedExecution) {
    for (const receipt of preparedPlan.artifactReceipts) {
      const source = artifactSourceFactory
        ? await artifactSourceFactory(receipt)
        : await openFirmwareArtifactByteSource(registry, receipt);
      try {
        if (source.size !== receipt.size) {
          throw createFirmwareUpdateError(
            FirmwareUpdateErrorCode.FirmwareArtifactReceiptMismatch,
            `Protocol V2 artifact ${receipt.artifactId} size changed after preparation`
          );
        }
        const header = await this.readProtocolV2SourceHeader(source, receipt.artifactId);
        const expected = preparedPlan.expectedFinalStates.find(
          state => state.target === receipt.target
        );
        if (
          receipt.target !== 'resource' &&
          expected?.version &&
          header.version !== expected.version
        ) {
          protocolV2PlanInvalid(
            `Protocol V2 ${receipt.target} payload version ${header.version} does not match ${expected.version}`
          );
        }
      } finally {
        await source.close();
      }
    }
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

  private prepareBootloaderBinary(): ArrayBuffer | null {
    return this.params.bootloaderBinary ?? null;
  }

  private hasExplicitProtocolV2Payload(fwBinaryMap: ProtocolV2TargetBinary[]) {
    return (
      !!this.params.resourceBundleFiles?.length ||
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

  private getProtocolV2ResourceFilePath(path: string) {
    if (path.startsWith('vol')) return path;
    if (path.startsWith('/')) return `vol0:${path}`;
    return `vol0:/${path}`;
  }

  private async readProtocolV2DeviceFileHeader(path: string) {
    const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());
    const filePath = this.getProtocolV2ResourceFilePath(path);
    const pathInfoRes = await typedCall('FilesystemPathInfoQuery', 'FilesystemPathInfo', {
      path: filePath,
    });
    const fileSize = toProtocolV2FiniteNumber(pathInfoRes.message?.size);
    if (
      !pathInfoRes.message?.exist ||
      pathInfoRes.message?.directory ||
      fileSize === undefined ||
      fileSize < PROTOCOL_V2_OKPP_HEADER_SIZE
    ) {
      return null;
    }

    const chunkSize = this.getProtocolV2FirmwareChunkSize();
    const chunks: Uint8Array[] = [];
    let offset = 0;
    while (offset < PROTOCOL_V2_OKPP_HEADER_SIZE) {
      const readLen = Math.min(chunkSize, PROTOCOL_V2_OKPP_HEADER_SIZE - offset);
      const res = await typedCall('FilesystemFileRead', 'FilesystemFile', {
        file: {
          path: filePath,
          offset,
          total_size: 0,
        },
        chunk_len: readLen,
        ui_percentage: undefined,
      });
      const data = toProtocolV2Bytes(res.message?.data);
      if (data.byteLength === 0) return null;
      chunks.push(data);
      offset += data.byteLength;
    }

    const headerBytes = new Uint8Array(offset);
    let cursor = 0;
    chunks.forEach(chunk => {
      headerBytes.set(chunk, cursor);
      cursor += chunk.byteLength;
    });
    return parseProtocolV2OkppHeader(headerBytes);
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
    return {
      ...target,
      binary,
      ...(component.version ? { targetVersion: component.version.join('.') } : {}),
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
      const target = this.getRemoteComponentTarget(key, component);
      const updateTarget = PROTOCOL_V2_UPDATE_TARGET_BY_TARGET_ID.get(target.targetId);
      const shouldInstall = updateTarget ? targetsToUpdate.has(updateTarget) : false;
      if (shouldInstall) {
        const remoteBinary = await this.downloadRemoteProtocolV2Component(key, component);
        if (remoteBinary.kind === 'bootloader') {
          bootloaderBinary = remoteBinary.binary;
          installItems.push({
            fileName: remoteBinary.fileName,
            binary: remoteBinary.binary,
            targetId: remoteBinary.targetId,
            kind: remoteBinary.kind,
            ...(remoteBinary.targetVersion ? { targetVersion: remoteBinary.targetVersion } : {}),
          });
        } else {
          const binaryEntry = {
            fileName: remoteBinary.fileName,
            binary: remoteBinary.binary,
            targetId: remoteBinary.targetId,
            ...(remoteBinary.targetVersion ? { targetVersion: remoteBinary.targetVersion } : {}),
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

  // ============================================================
  // Incremental RESC bundle sync through FileRead and FilesystemFileWrite
  // ============================================================

  /**
   * Prepare the RESC bundle list.
   *
   * Two modes, matching FirmwareUpdateV3 binary-versus-version behavior:
   * - resourceBundleFiles supplied: use binaries directly without version checks.
   * - Otherwise load release.resourceBundles from remote config.json; synchronization
   *   downloads on demand and skips bundles whose device header already matches.
   */
  private prepareProtocolV2ResourceBundles(
    firmwareType: EFirmwareType,
    features: Features
  ): ProtocolV2ResourceBundleBinary[] | undefined {
    // Manual binaries are installed directly without comparison.
    if (this.params.resourceBundleFiles?.length) {
      return this.params.resourceBundleFiles.map(file => {
        const name = getProtocolV2ResourceBundleNameByPath(file.devicePath);
        return {
          name,
          binary: file.binary,
          devicePath: resolveProtocolV2ResourceBundlePath(name),
        };
      });
    }

    if (!this.params.targetsToUpdate?.includes('resource')) {
      return undefined;
    }

    // Remote-config bundles are downloaded and compared later.
    const release = DataManager.getFirmwareLatestRelease(features, firmwareType);
    if (!release?.resourceBundles?.length) return undefined;

    return release.resourceBundles.map(bundle => {
      const name = normalizeProtocolV2ResourceBundleName(bundle.name);
      return {
        name,
        binary: new ArrayBuffer(0),
        devicePath: resolveProtocolV2ResourceBundlePath(name),
        url: bundle.url,
        version: bundle.version,
        payloadHash: bundle.payloadHash,
        headerHash: bundle.headerHash,
      };
    });
  }

  private async materializeProtocolV2ResourceBundles(
    bundles: ProtocolV2ResourceBundleBinary[]
  ): Promise<ProtocolV2ResourceBundleBinary[]> {
    const materialized: ProtocolV2ResourceBundleBinary[] = [];
    for (const bundle of bundles) {
      let { binary } = bundle;
      if (binary.byteLength === 0) {
        if (!bundle.url) {
          throw new Error(`Protocol V2 resource bundle ${bundle.name} has no local artifact`);
        }
        Log.log(`[FirmwareUpdateV4] downloading RESC bundle ${bundle.name}`);
        binary = (await getSysResourceBinary(bundle.url)).binary;
      }
      if (binary.byteLength === 0) {
        throw new Error(`Protocol V2 resource bundle ${bundle.name} is empty`);
      }
      materialized.push({
        ...bundle,
        binary,
      });
    }
    return materialized;
  }

  private isProtocolV2BootloaderMode() {
    if (typeof this.device.isBootloader === 'function') {
      return this.device.isBootloader();
    }
    return !!this.device.features?.bootloaderMode;
  }

  async enterProtocolV2BootloaderMode() {
    // romloader is the first update environment and forwards targets to bootloader.
    // It rejects DeviceRebootType.Bootloader, so reuse the current connection.
    if (this.isProtocolV2BootloaderMode() || this.device.features?.mode === 'romloader') {
      Log.debug('Protocol V2 device is already in loader mode, skip reboot to bootloader');
      return false;
    }

    try {
      this.postTipMessage(FirmwareUpdateTipMessage.AutoRebootToBootloader);
      await this.protocolV2Reboot(DeviceRebootType.Bootloader);
      this.postTipMessage(FirmwareUpdateTipMessage.GoToBootloaderSuccess);
      await wait(1000);
      await this.waitForProtocolV2BootloaderMode();
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

    while (Date.now() - startTime < timeout) {
      try {
        await this.reconnectProtocolV2Device();
        const deviceInfo = await requestProtocolV2DeviceInfo({
          commands: this.device.getCommands(),
          timeoutMs: PROTOCOL_V2_SHORT_RESPONSE_TIMEOUT,
        });
        // This is a reconnect probe after a Bootloader reboot. Bootloader does not
        // support DeviceStatusGet, so the generic runtime-mode probe is invalid here.
        const features = this.device.updateProtocolV2Features(deviceInfo, null, 'bootloader');
        assertProtocolV2ReconnectIdentity(
          this.protocolV2ExpectedDeviceId,
          features.deviceId ?? undefined,
          { allowMissingActual: !!features.bootloaderMode }
        );
        if (features?.bootloaderMode) {
          return features;
        }
        lastError = new Error('Protocol V2 device is reachable but is not in bootloader mode');
      } catch (error) {
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

  private async executeProtocolV2PreparedPlan(
    execution: ProtocolV2PreparedExecution
  ): Promise<FirmwareUpdateV4Result> {
    const { preparedPlan, registry, artifactSourceFactory } = execution;
    this.protocolV2InstalledTargets.clear();
    this.protocolV2ResourceStatuses.clear();
    this.protocolV2ActiveEpoch = preparedPlan.epochs.find(
      epoch => epoch.epochId === this.params.firmwareCheckpoint?.epochId
    );
    let transferStarted = false;

    const executor = new RecoverableFirmwareExecutor({
      preparedPlan,
      transactionId:
        this.params.firmwareTransactionId ??
        `${preparedPlan.planId}:${preparedPlan.device.identity}`,
      registry,
      initialCheckpoint: this.params.firmwareCheckpoint,
      ...(artifactSourceFactory ? { artifactSourceFactory } : {}),
      driver: {
        readDeviceState: () => this.readProtocolV2ObservedState(preparedPlan),
        requiresLoaderTransition: epoch =>
          epoch.kind === 'bootloader-install' || epoch.kind === 'component-install',
        enterLoader: async ({ epoch }) => {
          this.protocolV2ActiveEpoch = epoch;
          await this.enterProtocolV2BootloaderMode();
        },
        transferArtifact: async ({ epoch, receipt, source, reportProgress }) => {
          this.protocolV2ActiveEpoch = epoch;
          if (!transferStarted) {
            this.postTipMessage(FirmwareUpdateTipMessage.StartTransferData);
            transferStarted = true;
          }
          if (receipt.target === 'resource') {
            await this.transferProtocolV2ResourceArtifact(receipt, source, reportProgress);
          } else {
            await this.transferProtocolV2FirmwareArtifact(receipt, source, reportProgress);
          }
        },
        requestInstall: async ({ epoch }) => {
          this.protocolV2ActiveEpoch = epoch;
          const targets = buildProtocolV2InstallTargets(epoch);
          this.postTipMessage(FirmwareUpdateTipMessage.ConfirmOnDevice);
          await this.protocolV2StartFirmwareUpdate({ targets });
          epoch.targetIds.forEach(target => this.protocolV2InstalledTargets.add(target));
        },
        waitForInstall: async ({ epoch }) => {
          this.protocolV2ActiveEpoch = epoch;
          await this.waitForProtocolV2FirmwareUpdateComplete(buildProtocolV2InstallTargets(epoch));
        },
        rebootBetweenEpochs: async ({ epoch }) => {
          this.protocolV2ActiveEpoch = epoch;
          if (epoch.kind === 'bootloader-install' || epoch.kind === 'component-install') {
            await this.exitProtocolV2BootloaderToNormal();
          }
        },
        verifyEpoch: async ({ epoch }) => {
          this.protocolV2ActiveEpoch = epoch;
          const observed = await this.readProtocolV2ObservedState(preparedPlan);
          this.assertProtocolV2ExpectedTargets(preparedPlan, observed, epoch.targetIds);
        },
        verifyFinal: async ({ expectedPlan }) => {
          this.protocolV2ActiveEpoch = expectedPlan.epochs.at(-1);
          const observed = await this.readProtocolV2ObservedState(expectedPlan);
          this.assertProtocolV2ExpectedTargets(
            expectedPlan,
            observed,
            expectedPlan.expectedFinalStates
              .filter(state => state.target !== 'resource')
              .map(state => state.target)
          );
          await this.verifyProtocolV2PreparedResources(execution);
        },
      },
    });

    await executor.run();
    const features =
      this.protocolV2LatestFeatures ??
      (await this.waitForProtocolV2ReconnectAndFeatures(PROTOCOL_V2_FINAL_RECONNECT_TIMEOUT));
    return this.buildProtocolV2Result(preparedPlan, features);
  }

  private async openProtocolV2ExecutionSource(
    execution: ProtocolV2PreparedExecution,
    receipt: FirmwareArtifactReceipt
  ) {
    return execution.artifactSourceFactory
      ? execution.artifactSourceFactory(receipt)
      : openFirmwareArtifactByteSource(execution.registry, receipt);
  }

  private async readProtocolV2SourceHeader(source: FirmwareByteSource, artifactId: string) {
    if (source.size < PROTOCOL_V2_OKPP_HEADER_SIZE) {
      return protocolV2PlanInvalid(
        `Protocol V2 artifact ${artifactId} is smaller than its payload header`
      );
    }
    const bytes = await source.readAt(0, PROTOCOL_V2_OKPP_HEADER_SIZE);
    const header = parseProtocolV2PayloadPackageHeader(new Uint8Array(bytes));
    if (!header) {
      return protocolV2PlanInvalid(
        `Protocol V2 artifact ${artifactId} has an invalid payload header`
      );
    }
    return header;
  }

  private protocolV2ResourceHeadersMatch(
    local: ReturnType<typeof parseProtocolV2PayloadPackageHeader>,
    device: ProtocolV2OkppHeader | null
  ) {
    return (
      !!local &&
      !!device &&
      local.version === device.version.join('.') &&
      local.payloadHash === normalizeProtocolV2Hex(device.payloadHash) &&
      local.headerHash === normalizeProtocolV2Hex(device.headerHash)
    );
  }

  private async transferProtocolV2ResourceArtifact(
    receipt: FirmwareArtifactReceipt,
    source: FirmwareByteSource,
    reportProgress: (completed: number, total: number) => Promise<void>
  ) {
    if (!receipt.logicalName) {
      return protocolV2PlanInvalid(
        `Protocol V2 resource ${receipt.artifactId} has no logical name`
      );
    }
    const devicePath = resolveProtocolV2ResourceBundlePath(receipt.logicalName);
    const localHeader = await this.readProtocolV2SourceHeader(source, receipt.artifactId);
    const currentHeader = await this.readProtocolV2DeviceFileHeader(devicePath);
    if (
      !this.params.forcedUpdateRes &&
      this.protocolV2ResourceHeadersMatch(localHeader, currentHeader)
    ) {
      this.protocolV2ResourceStatuses.set(receipt.logicalName, 'unchanged');
      await reportProgress(source.size, source.size);
      return;
    }

    await this.protocolV2StreamUpdateProcess({
      source,
      filePath: devicePath,
      reportProgress,
    });
    await this.verifyProtocolV2StagedFile(devicePath, receipt.size);
    const installedHeader = await this.readProtocolV2DeviceFileHeader(devicePath);
    if (!this.protocolV2ResourceHeadersMatch(localHeader, installedHeader)) {
      throw createFirmwareUpdateError(
        FirmwareUpdateErrorCode.FirmwareDeviceStateConflict,
        `Protocol V2 resource ${receipt.logicalName} failed device header verification`
      );
    }
    this.protocolV2ResourceStatuses.set(receipt.logicalName, 'installed');
  }

  private async transferProtocolV2FirmwareArtifact(
    receipt: FirmwareArtifactReceipt,
    source: FirmwareByteSource,
    reportProgress: (completed: number, total: number) => Promise<void>
  ) {
    const filePath = resolveProtocolV2FirmwareStagingPath(receipt.target);
    await this.protocolV2StreamUpdateProcess({
      source,
      filePath,
      reportProgress,
    });
    await this.verifyProtocolV2StagedFile(filePath, receipt.size);
  }

  private async protocolV2StreamUpdateProcess({
    source,
    filePath,
    reportProgress,
  }: {
    source: FirmwareByteSource;
    filePath: string;
    reportProgress: (completed: number, total: number) => Promise<void>;
  }) {
    let lastError: unknown;
    for (let attempt = 1; attempt <= PROTOCOL_V2_FILE_TRANSFER_RETRY_COUNT; attempt += 1) {
      try {
        return await this.protocolV2WriteByteSource({
          source,
          filePath,
          reportProgress,
        });
      } catch (error) {
        lastError = error;
        Log.error(
          `Protocol V2 streamed transfer failed path=${filePath} attempt=${attempt}/${PROTOCOL_V2_FILE_TRANSFER_RETRY_COUNT}`,
          error
        );
        if (attempt < PROTOCOL_V2_FILE_TRANSFER_RETRY_COUNT) {
          await this.recoverProtocolV2FileTransfer();
        }
      }
    }
    throw ERRORS.TypedError(
      HardwareErrorCode.EmmcFileWriteFirmwareError,
      `transfer data error: ${getProtocolV2UnknownErrorText(lastError)}`
    );
  }

  async protocolV2CommonUpdateProcess({
    payload,
    filePath,
    processedSize,
    totalSize,
    onTransferredBytes,
  }: ProtocolV2MemoryTransferParams) {
    const buffer =
      payload instanceof ArrayBuffer
        ? payload
        : payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength);
    const source = new MemoryByteSource(buffer);
    try {
      await this.protocolV2StreamUpdateProcess({
        source,
        filePath,
        reportProgress: completed => {
          onTransferredBytes?.((processedSize ?? 0) + completed);
          return Promise.resolve();
        },
      });
      return totalSize === undefined ? 0 : (processedSize ?? 0) + source.size;
    } finally {
      await source.close();
    }
  }

  private async protocolV2WriteByteSource({
    source,
    filePath,
    reportProgress,
  }: {
    source: FirmwareByteSource;
    filePath: string;
    reportProgress: (completed: number, total: number) => Promise<void>;
  }) {
    const chunkSize = this.getProtocolV2FirmwareChunkSize();
    let offset = 0;
    while (offset < source.size) {
      const requestedLength = Math.min(chunkSize, source.size - offset);
      const chunk = await source.readAt(offset, requestedLength);
      if (chunk.byteLength === 0 || chunk.byteLength > requestedLength) {
        throw createFirmwareUpdateError(
          FirmwareUpdateErrorCode.FirmwareArtifactReaderInvalid,
          `Protocol V2 artifact reader returned ${chunk.byteLength} bytes for ${requestedLength}`
        );
      }
      const chunkEnd = offset + chunk.byteLength;
      const progress = getProtocolV2DeviceTransferProgress(offset, chunkEnd, source.size);
      const response = await this.fileWriteChunk(
        filePath,
        source.size,
        offset,
        chunk,
        offset === 0,
        progress
      );
      const rawProcessedByte = response.message.processed_byte;
      const nextOffset =
        rawProcessedByte === undefined ? chunkEnd : Number(response.message.processed_byte);
      if (!Number.isFinite(nextOffset) || nextOffset <= offset || nextOffset > chunkEnd) {
        throw ERRORS.TypedError(
          HardwareErrorCode.EmmcFileWriteFirmwareError,
          `invalid processed_byte ${response.message.processed_byte} for offset ${offset}`
        );
      }
      offset = nextOffset;
      await reportProgress(offset, source.size);
      this.postProgressMessage(
        Math.min(Math.ceil((offset / source.size) * 100), 100),
        'transferData'
      );
    }
  }

  private async verifyProtocolV2PreparedResources(execution: ProtocolV2PreparedExecution) {
    const resourceReceipts = execution.preparedPlan.artifactReceipts.filter(
      receipt => receipt.target === 'resource'
    );
    for (const receipt of resourceReceipts) {
      if (!receipt.logicalName) {
        return protocolV2PlanInvalid(
          `Protocol V2 resource ${receipt.artifactId} has no logical name`
        );
      }
      const source = await this.openProtocolV2ExecutionSource(execution, receipt);
      try {
        const localHeader = await this.readProtocolV2SourceHeader(source, receipt.artifactId);
        const deviceHeader = await this.readProtocolV2DeviceFileHeader(
          resolveProtocolV2ResourceBundlePath(receipt.logicalName)
        );
        if (!this.protocolV2ResourceHeadersMatch(localHeader, deviceHeader)) {
          throw createFirmwareUpdateError(
            FirmwareUpdateErrorCode.FirmwareDeviceStateConflict,
            `Protocol V2 resource ${receipt.logicalName} is not installed`
          );
        }
      } finally {
        await source.close();
      }
    }
  }

  private async queryProtocolV2FirmwareUpdateRecords() {
    try {
      const response = await this.device.getCommands().typedCall(
        'DeviceFirmwareUpdateStatusGet',
        'DeviceFirmwareUpdateStatus',
        {
          fields: {
            status: true,
            payload_version: true,
            path: true,
          },
        },
        { timeoutMs: PROTOCOL_V2_SHORT_RESPONSE_TIMEOUT }
      );
      return {
        statusQuerySupported: true,
        statusAvailable: true,
        records: (response.message.records ?? []) as ProtocolV2FirmwareUpdateRecord[],
      };
    } catch (error) {
      if (isProtocolV2FirmwareStatusEndpointUnavailable(error)) {
        return {
          statusQuerySupported: false,
          statusAvailable: false,
          records: [] as ProtocolV2FirmwareUpdateRecord[],
        };
      }
      throw error;
    }
  }

  private getProtocolV2ObservedVersions(features: Features) {
    const versions: Partial<Record<FirmwareTarget, string>> = {
      bootloader: getDeviceBootloaderVersion(features).join('.'),
      coprocessor: getDeviceBLEFirmwareVersion(features).join('.'),
    };
    if (features.se01Version) versions.se01 = features.se01Version;
    if (features.se02Version) versions.se02 = features.se02Version;
    if (features.se03Version) versions.se03 = features.se03Version;
    if (features.se04Version) versions.se04 = features.se04Version;
    return versions;
  }

  private getProtocolV2ObservedHashes(features: Features) {
    const hashes: Partial<Record<FirmwareTarget, string>> = {};
    const assign = (target: FirmwareTarget, value?: string) => {
      if (value) hashes[target] = normalizeProtocolV2Hex(value);
    };
    assign('bootloader', features.verify?.bootloaderHash);
    assign('p1', features.verify?.firmwareHash);
    assign('p2', features.verify?.firmwareHash);
    assign('coprocessor', features.verify?.bleHash);
    assign('se01', features.verify?.se01Hash);
    assign('se02', features.verify?.se02Hash);
    assign('se03', features.verify?.se03Hash);
    assign('se04', features.verify?.se04Hash);
    return hashes;
  }

  private async readProtocolV2ObservedState(
    preparedPlan: PreparedPlan
  ): Promise<FirmwareObservedDeviceState> {
    await this.reconnectProtocolV2Device();
    const deviceInfo = await requestProtocolV2DeviceInfo({
      commands: this.device.getCommands(),
      timeoutMs: PROTOCOL_V2_SHORT_RESPONSE_TIMEOUT,
      request: PROTOCOL_V2_FULL_DEVICE_INFO_REQUEST,
    });
    const features = await this.device.probeProtocolV2RuntimeState(
      deviceInfo,
      PROTOCOL_V2_SHORT_RESPONSE_TIMEOUT
    );
    this.protocolV2LatestFeatures = features;
    assertProtocolV2ReconnectIdentity(
      this.protocolV2ExpectedDeviceId,
      features.deviceId ?? undefined,
      { allowMissingActual: !!features.bootloaderMode }
    );

    const status = await this.queryProtocolV2FirmwareUpdateRecords();
    this.protocolV2LatestStatusRecords = status.records;
    const versions = this.getProtocolV2ObservedVersions(features);
    let pendingInstall = false;
    if (
      this.protocolV2ActiveEpoch &&
      (this.protocolV2ActiveEpoch.kind === 'bootloader-install' ||
        this.protocolV2ActiveEpoch.kind === 'component-install') &&
      status.statusAvailable
    ) {
      const reconciliation = reconcileProtocolV2InstallRecords({
        epoch: this.protocolV2ActiveEpoch,
        records: status.records,
      });
      Object.assign(versions, reconciliation.versions);
      pendingInstall = reconciliation.pendingInstall;
      if (reconciliation.decision === 'finished') {
        this.protocolV2ActiveEpoch.targetIds.forEach(target =>
          this.protocolV2InstalledTargets.add(target)
        );
      }
    } else {
      const activeRecord = status.records.find(
        record => !isProtocolV2TargetStatusFinished(record.status)
      );
      if (activeRecord) {
        throw createFirmwareUpdateError(
          FirmwareUpdateErrorCode.FirmwareTransactionConflict,
          `Protocol V2 has an active install outside the prepared epoch: ${activeRecord.target_id}`
        );
      }
      preparedPlan.epochs
        .filter(epoch => epoch.kind === 'bootloader-install' || epoch.kind === 'component-install')
        .forEach(epoch => {
          const reconciliation = reconcileProtocolV2InstallRecords({
            epoch,
            records: status.records,
          });
          Object.assign(versions, reconciliation.versions);
        });
    }

    if (!status.statusAvailable && this.protocolV2ActiveEpoch?.kind === 'component-install') {
      const applicationTargets = this.protocolV2ActiveEpoch.targetIds.filter(
        target => target === 'p1' || target === 'p2'
      );
      if (applicationTargets.length === 1) {
        versions[applicationTargets[0]] = getDeviceFirmwareVersion(features).join('.');
      }
    }

    let mode: FirmwareObservedDeviceState['mode'] = 'normal';
    if (pendingInstall) {
      mode = 'installing';
    } else if (features.bootloaderMode) {
      mode = 'loader';
    } else if (features.mode !== 'normal') {
      mode = 'unknown';
    }
    return {
      identity: getDeviceUUID(features) || preparedPlan.device.identity,
      model: getDeviceType(features),
      mode,
      versions,
      hashes: this.getProtocolV2ObservedHashes(features),
      pendingInstall,
      statusQuerySupported: status.statusQuerySupported,
      statusAvailable: status.statusAvailable,
    };
  }

  private assertProtocolV2ExpectedTargets(
    preparedPlan: PreparedPlan,
    observed: FirmwareObservedDeviceState,
    targets: readonly FirmwareTarget[]
  ) {
    const targetSet = new Set(targets);
    preparedPlan.expectedFinalStates.forEach(expected => {
      if (!targetSet.has(expected.target)) {
        return;
      }
      const versionMatches =
        expected.version === undefined || observed.versions[expected.target] === expected.version;
      if (!versionMatches) {
        throw createFirmwareUpdateError(
          FirmwareUpdateErrorCode.FirmwareDeviceStateConflict,
          `Protocol V2 target ${expected.target} did not reach version ${expected.version}`
        );
      }
    });
  }

  private buildProtocolV2Result(
    preparedPlan: PreparedPlan,
    features: Features
  ): FirmwareUpdateV4Result {
    const observedVersions = this.getProtocolV2ObservedVersions(features);
    const observedHashes = this.getProtocolV2ObservedHashes(features);
    const finishedVersions: Partial<Record<FirmwareTarget, string>> = {};
    this.protocolV2LatestStatusRecords.forEach(record => {
      const targetId = normalizeProtocolV2TargetId(record.target_id);
      const descriptor =
        targetId === undefined ? undefined : getProtocolV2FirmwareTargetDescriptorById(targetId);
      if (
        descriptor &&
        isProtocolV2TargetStatusFinished(record.status) &&
        typeof record.payload_version === 'number'
      ) {
        finishedVersions[descriptor.target] = protocolV2PackedVersionToString(
          record.payload_version
        );
      }
    });

    const targets: FirmwareUpdateV4TargetResult[] = preparedPlan.expectedFinalStates.map(
      expected => {
        let status: FirmwareUpdateV4TargetResult['status'] = 'verified';
        if (expected.target === 'resource') {
          const resourceStatuses = [...this.protocolV2ResourceStatuses.values()];
          if (resourceStatuses.some(value => value === 'installed')) {
            status = 'installed';
          } else if (resourceStatuses.length > 0) {
            status = 'unchanged';
          }
        } else if (this.protocolV2InstalledTargets.has(expected.target)) {
          status = 'installed';
        }
        const version = finishedVersions[expected.target] ?? observedVersions[expected.target];
        const hash =
          observedHashes[expected.target] ??
          (expected.target === 'resource' ? expected.sha256 : undefined);
        return {
          target: expected.target,
          ...(version ? { version } : {}),
          ...(hash ? { hash } : {}),
          status,
        };
      }
    );

    return {
      bootloaderVersion: getDeviceBootloaderVersion(features).join('.'),
      bleVersion: getDeviceBLEFirmwareVersion(features).join('.'),
      firmwareVersion: getDeviceFirmwareVersion(features).join('.'),
      targets,
    };
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
    const completedTargets = matchingTargets.filter(target =>
      isProtocolV2TargetStatusFinished(target.status)
    );
    if (completedTargets.length === expectedTargetIds.size && expectedTargetIds.size > 0) {
      this.postProgressMessage(100, 'installingFirmware');
      return true;
    }

    if (expectedTargetIds.size > 0 && matchingTargets.length > 0) {
      const hasInProgressTarget = matchingTargets.some(target =>
        isProtocolV2TargetStatusInProgress(target.status)
      );
      const completedProgress = Math.floor(
        (completedTargets.length / expectedTargetIds.size) * 100
      );
      // The protocol exposes no per-target percentage, so report coarse progress by
      // completed targets and use 1% once work starts to keep the UI responsive.
      const progress = Math.min(99, Math.max(completedProgress, hasInProgressTarget ? 1 : 0));
      this.postProgressMessage(progress, 'installingFirmware');
    }

    return false;
  }

  private async waitForProtocolV2FirmwareUpdateComplete(
    targets: Array<{ target_id: number; path: string }>
  ) {
    const expectedTargetIds = new Set(targets.map(target => target.target_id));
    const startTime = Date.now();
    let lastError: unknown;

    while (Date.now() - startTime < PROTOCOL_V2_INSTALL_TIMEOUT) {
      try {
        await this.reconnectProtocolV2Device();
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
            { timeoutMs: PROTOCOL_V2_SHORT_RESPONSE_TIMEOUT }
          );
          if (
            this.assertProtocolV2TargetStatus(
              (statusResponse.message.records ?? []) as ProtocolV2FirmwareUpdateStatusTarget[],
              expectedTargetIds
            )
          ) {
            return;
          }
          lastError = new Error('Protocol V2 firmware targets are still installing');
        } catch (error) {
          if (
            error instanceof HardwareError &&
            error.errorCode === HardwareErrorCode.FirmwareError
          ) {
            throw error;
          }
          // App firmware does not register DeviceFirmwareUpdateStatusGet. If the
          // device already rebooted into App, this endpoint error signals that the
          // install phase ended; the later phase performs the final readiness check.
          if (isProtocolV2FirmwareStatusEndpointUnavailable(error)) {
            Log.log(
              '[FirmwareUpdateV4] firmware status endpoint unavailable after reboot; continue with normal-mode verification'
            );
            return;
          }
          lastError = error;
          Log.log(
            '[FirmwareUpdateV4] DeviceFirmwareUpdateStatusGet unavailable during install: ',
            error
          );
        }
      } catch (error) {
        lastError = error;
        if (error instanceof HardwareError && error.errorCode === HardwareErrorCode.FirmwareError) {
          throw error;
        }
        Log.log('Protocol V2 firmware install device readiness probe failed: ', error);
      }
      await wait(1000);
    }

    throw ERRORS.TypedError(
      HardwareErrorCode.RuntimeError,
      `Protocol V2 firmware update status timeout: ${this.normalizeErrorMessage(lastError)}`
    );
  }

  private async exitProtocolV2BootloaderToNormal() {
    await this.reconnectProtocolV2Device();
    // The connection may still be in bootloader. Request a Normal reboot directly;
    // repeating it after an automatic App reboot is idempotent.
    await this.protocolV2Reboot(DeviceRebootType.Normal);
  }

  private async waitForProtocolV2ReconnectAndFeatures(timeout: number) {
    const startTime = Date.now();
    let lastError: unknown;

    while (Date.now() - startTime < timeout) {
      try {
        await this.reconnectProtocolV2Device();
        const deviceInfo = await requestProtocolV2DeviceInfo({
          commands: this.device.getCommands(),
          timeoutMs: PROTOCOL_V2_SHORT_RESPONSE_TIMEOUT,
          // Completion needs target versions only; keep scope aligned with the request.
          request: PROTOCOL_V2_VERSIONS_DEVICE_INFO_REQUEST,
        });
        const features = await this.device.probeProtocolV2RuntimeState(
          deviceInfo,
          PROTOCOL_V2_SHORT_RESPONSE_TIMEOUT
        );
        assertProtocolV2ReconnectIdentity(
          this.protocolV2ExpectedDeviceId,
          features.deviceId ?? undefined
        );
        if (features.mode !== 'normal' || features.bootloaderMode) {
          throw ERRORS.TypedError(
            HardwareErrorCode.DeviceNotFound,
            'Protocol V2 device is still in bootloader mode'
          );
        }
        return features;
      } catch (error) {
        // A confirmed deviceId change is a firmware contract violation and cannot be
        // fixed by polling. A temporarily missing identity may still become ready.
        if (this.isProtocolV2ReconnectIdentityMismatch(error)) {
          throw error;
        }
        lastError = error;
        Log.log('Protocol V2 normal mode not ready, polling Ping: ', error);
        await wait(1000);
      }
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
      this.device.updateDescriptor(
        {
          ...devicesDescriptor[0],
          protocolType: PROTOCOL_V2_CONNECT_PROTOCOL,
        },
        true
      );
      await this.ensureProtocolV2DeviceAcquired();
      this.device.commands.disposed = false;
      this.device.getCommands().mainId = this.device.mainId ?? '';
      assertProtocolV2ReconnectIdentity(
        this.protocolV2ExpectedDeviceId,
        this.device.getCurrentDeviceId(),
        // Cached identity may be absent immediately after acquire. Reject only an
        // existing mismatch; the final refresh performs strict identity validation.
        { allowMissingActual: true }
      );
      return;
    }

    // App and bootloader serials may differ temporarily. During V4 reconnect, accept
    // only a uniquely enumerated device instead of repeatedly using the old App path.
    const { deviceList } = await DevicePool.getDevices(devicesDescriptor, undefined, {
      connectProtocol: PROTOCOL_V2_CONNECT_PROTOCOL,
    });
    if (deviceList.length !== 1) {
      throw ERRORS.TypedError(HardwareErrorCode.DeviceNotFound);
    }

    Log.debug(
      'Protocol V2 firmware reconnect using single enumerated device:',
      deviceList[0].getConnectId()
    );
    this.device.updateFromCache(deviceList[0]);
    await this.ensureProtocolV2DeviceAcquired();
    this.device.commands.disposed = false;
    this.device.getCommands().mainId = this.device.mainId ?? '';
    assertProtocolV2ReconnectIdentity(
      this.protocolV2ExpectedDeviceId,
      this.device.getCurrentDeviceId(),
      // Cached identity may be absent immediately after acquire. Reject only an
      // existing mismatch; the final refresh performs strict identity validation.
      { allowMissingActual: true }
    );
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

  private isProtocolV2ReconnectIdentityMismatch(error: unknown) {
    return this.normalizeErrorMessage(error).includes('Protocol V2 reconnect identity mismatch');
  }

  private async fileWriteChunk(
    filePath: string,
    totalFileSize: number,
    offset: number,
    chunk: ArrayBuffer | Buffer,
    overwrite: boolean,
    progress: number | null
  ): Promise<TypedResponseMessage<'FilesystemFile'>> {
    const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());
    const writeRes = await typedCall('FilesystemFileWrite', 'FilesystemFile', {
      file: {
        path: filePath,
        offset,
        total_size: totalFileSize,
        data: chunk,
      },
      overwrite,
      append: false,
      ui_percentage: progress ?? undefined,
    });
    if (writeRes.type !== 'FilesystemFile') {
      if ((writeRes as any).type === 'CallMethodError') {
        if (((writeRes as any).message.error ?? '').indexOf(SESSION_ERROR) > -1) {
          throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, SESSION_ERROR);
        }
      }
      throw ERRORS.TypedError(HardwareErrorCode.EmmcFileWriteFirmwareError, 'transfer data error');
    }
    return writeRes;
  }

  private async recoverProtocolV2FileTransfer() {
    const env = DataManager.getSettings('env');
    if (DataManager.isBleConnect(env)) {
      await wait(3000);
      await this.acquireProtocolV2BleDevice();
      await this.device.initialize();
    }
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
