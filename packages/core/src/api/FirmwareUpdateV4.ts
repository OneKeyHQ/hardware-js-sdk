import {
  EDeviceType,
  ERRORS,
  HardwareError,
  HardwareErrorCode,
  isBleStaleBondHardwareError,
  wait,
} from '@onekeyfe/hd-shared';
import JSZip from 'jszip';
import {
  DeviceRebootType,
  DeviceSessionPinType,
  PROTOCOL_V2_BLE_FILE_CHUNK_SIZE,
  PROTOCOL_V2_BLE_FILE_READ_CHUNK_SIZE,
  PROTOCOL_V2_BLE_FIRMWARE_FILE_CHUNK_SIZE,
  PROTOCOL_V2_WEBUSB_FILE_CHUNK_SIZE,
} from '@onekeyfe/hd-transport';
import { sha256 } from '@noble/hashes/sha256';

import { FirmwareUpdateTipMessage, UI_REQUEST, createUiMessage } from '../events/ui-request';
import { validateParams } from './helpers/paramsValidator';
import {
  LoggerNames,
  getDeviceBLEFirmwareVersion,
  getDeviceBootloaderVersion,
  getDeviceFirmwareVersion,
  getDeviceType,
  getFirmwareType,
  getLogger,
} from '../utils';
import { getSysResourceBinary } from './firmware/getBinary';
import { normalizeFirmwarePreparationError } from './firmware/FirmwarePreparationError';
import { DataManager } from '../data-manager';
import { FirmwareUpdateBaseMethod } from './firmware/FirmwareUpdateBaseMethod';
import { DevicePool } from '../device/DevicePool';
import {
  PROTOCOL_V2_VERSIONS_DEVICE_INFO_REQUEST,
  ProtocolV2FirmwareTargetType,
} from '../protocols/protocol-v2';
import { requestProtocolV2DeviceInfo } from '../protocols/protocol-v2/features';
import {
  PROTOCOL_V2_BOOT_RESOURCE_PACKAGE_PATH,
  PROTOCOL_V2_BOOT_RESOURCE_PACKAGE_STAGING_PATH,
  PROTOCOL_V2_RESOURCE_PACKAGE_HEADER_SIZE,
  type ProtocolV2ResourcePackageHeader,
  isProtocolV2ResourceArchiveEntryName,
  parseProtocolV2ResourcePackage,
  parseProtocolV2ResourcePackageHeader,
} from '../protocols/protocol-v2/resources';
import {
  getProtocolV2UnknownErrorText,
  isProtocolV2DeviceDisconnectedError,
} from './protocol-v2/helpers';
import { isProtocolV2ResponseTimeout } from './helpers/protocolV2FileWrite';
import {
  openFirmwareByteSource,
  readFirmwareByteSourceFully,
  writeFirmwareByteSource,
} from './firmware/FirmwareArtifactSource';
import { resolveFirmwareUpdateHostBinding } from './firmware/FirmwareHostBinding';
import {
  assertFirmwareUpdatePreparedPlanBinding,
  assertFirmwareUpdatePreparedPlanDeviceIdentity,
  validateFirmwareUpdatePreparedPlan,
} from './firmware/FirmwareUpdatePreparedPlan';

import type {
  FirmwareArtifactReference,
  FirmwareUpdateV4Params,
  FirmwareUpdateV4Target,
} from '../types/api/firmwareUpdate';
import type { EFirmwareType } from '@onekeyfe/hd-shared';
import type { ProtocolV2DeviceInfo } from '@onekeyfe/hd-transport';
import type { TypedResponseMessage } from '../device/DeviceCommands';
import type {
  Features,
  IFirmwareReleaseInfo,
  IProtocolV2FirmwareComponent,
  IVersionArray,
  KnownDevice,
} from '../types';
import type { FirmwareByteSource } from './firmware/FirmwareArtifactSource';

const Log = getLogger(LoggerNames.Method);

// Restored after a rebase dropped the declaration while keeping its use in
// fileWriteChunk; without it that error branch throws ReferenceError instead of
// the intended typed session error.
const SESSION_ERROR = 'session not found';
const PROTOCOL_V2_BOOTLOADER_RECONNECT_TIMEOUT = 90 * 1000;
const PROTOCOL_V2_FINAL_RECONNECT_TIMEOUT = 3 * 60 * 1000;
const PROTOCOL_V2_SHORT_RESPONSE_TIMEOUT = 5 * 1000;
const PROTOCOL_V2_FIRMWARE_STATUS_RESPONSE_TIMEOUT = 15 * 1000;
const PROTOCOL_V2_INSTALL_TIMEOUT = 5 * 60 * 1000;
const PROTOCOL_V2_INSTALL_STATUS_INITIAL_DELAY = 1000;
const PROTOCOL_V2_INSTALL_FINISHED_AFTER_DISCONNECT_POLLS = 4;
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
const PROTOCOL_V2_TRANSFER_PROGRESS_HEARTBEAT_MS = 1000;
const PROTOCOL_V2_INSTALL_STATUS_CONFLICT_CODE = 'FirmwareInstallStatusConflict';
const PROTOCOL_V2_INSTALL_FAILED_CODE = 'FirmwareInstallFailed';
const PROTOCOL_V2_INSTALL_TIMEOUT_CODE = 'FirmwareInstallTimeout';
const PROTOCOL_V2_RESOURCE_FILE_MAX_COUNT = 512;
const PROTOCOL_V2_RESOURCE_TOTAL_MAX_BYTES = 256 * 1024 * 1024;

const PROTOCOL_V2_NEO_UNSUPPORTED_TARGETS = new Set<FirmwareUpdateV4Target>(['se03', 'se04']);

const getProtocolV2ZipEntrySizes = (entry: JSZip.JSZipObject) => {
  // loadAsync records central-directory sizes on JSZip's documented private data object.
  // Validate those bounds before calling async(), which allocates the decompressed entry.
  const { compressedSize, uncompressedSize } = (entry as JSZipSizedEntry)._data ?? {};
  if (
    !Number.isSafeInteger(compressedSize) ||
    Number(compressedSize) < 0 ||
    !Number.isSafeInteger(uncompressedSize) ||
    Number(uncompressedSize) <= 0
  ) {
    throw ERRORS.TypedError(
      HardwareErrorCode.RuntimeError,
      `Protocol V2 local resource ZIP entry size is invalid: ${entry.name}`,
      { firmwareUpdateCode: 'FirmwareArtifactsNotPrepared' }
    );
  }
  return {
    compressedSize: Number(compressedSize),
    uncompressedSize: Number(uncompressedSize),
  };
};

export function assertProtocolV2FirmwareTargetsSupported(
  deviceType: EDeviceType | string | undefined,
  params: FirmwareUpdateV4Params,
  hasExplicitTargetSelection = false
) {
  const requestedTargets = new Set(params.targetsToUpdate ?? []);
  const unsupportedTargets = new Set(
    Array.from(requestedTargets).filter(target => PROTOCOL_V2_NEO_UNSUPPORTED_TARGETS.has(target))
  );
  if (params.se03Binary && (!hasExplicitTargetSelection || requestedTargets.has('se03'))) {
    unsupportedTargets.add('se03');
  }
  if (params.se04Binary && (!hasExplicitTargetSelection || requestedTargets.has('se04'))) {
    unsupportedTargets.add('se04');
  }
  if (
    params.componentArtifacts?.se03 &&
    (!hasExplicitTargetSelection || requestedTargets.has('se03'))
  ) {
    unsupportedTargets.add('se03');
  }
  if (
    params.componentArtifacts?.se04 &&
    (!hasExplicitTargetSelection || requestedTargets.has('se04'))
  ) {
    unsupportedTargets.add('se04');
  }

  if (!unsupportedTargets.size || deviceType === EDeviceType.Pro2) return;

  const targetList = Array.from(unsupportedTargets).join(', ');
  const message =
    deviceType === EDeviceType.Neo
      ? `Neo only supports SE01 and SE02; unsupported firmware targets: ${targetList}`
      : `Cannot safely update ${targetList} without a confirmed Pro2 device type`;
  throw ERRORS.TypedError(HardwareErrorCode.DeviceNotSupportMethod, message);
}

const getProtocolV2DeviceTransferProgress = (
  bytesBeforeChunk: number,
  bytesAfterChunk: number,
  totalBytes: number
) => {
  if (!Number.isFinite(totalBytes) || totalBytes <= 0) {
    return 0;
  }
  if (bytesBeforeChunk <= 0 && bytesAfterChunk < totalBytes) {
    return 0;
  }
  return Math.min(Math.max(Math.ceil((bytesAfterChunk / totalBytes) * 100), 1), 99);
};

type ProtocolV2FirmwareUpdateStatusTarget = {
  target_id: number | string;
  status?: number | string;
  progress_percent?: number;
  phase_info?: {
    phase: number | string;
    progress_percent: number;
  };
  payload_version?: number;
  path?: string;
};

type ProtocolV2TargetBinary = { fileName: string; binary: ArrayBuffer; targetId: number };
type ProtocolV2InstallItem = ProtocolV2TargetBinary & {
  kind: ProtocolV2RemoteComponentTarget['kind'];
};

type ProtocolV2RemoteComponentBinary = ProtocolV2RemoteComponentTarget & {
  binary: ArrayBuffer;
};

type ProtocolV2RemoteComponentTarget = {
  fileName: string;
  targetId: number;
  kind: 'bootloader' | 'firmware';
};

type ProtocolV2InstallSource = {
  fileName: string;
  source: FirmwareByteSource;
  targetId: number;
  kind: ProtocolV2RemoteComponentTarget['kind'];
};

type ProtocolV2ResourceBundleSource = {
  name: string;
  source: FirmwareByteSource;
  devicePath: string;
  version?: IVersionArray;
  payloadHash?: string;
  headerHash?: string;
};

type ProtocolV2LocalResourceArchive = {
  binary: ArrayBuffer;
  resources: Array<{
    entryName: string;
    binary: ArrayBuffer;
    header: ProtocolV2ResourcePackageHeader;
  }>;
};

type JSZipSizedEntry = JSZip.JSZipObject & {
  _data?: {
    compressedSize?: unknown;
    uncompressedSize?: unknown;
  };
};

type ProtocolV2TransferBatch = {
  installSources: ProtocolV2InstallSource[];
  resourceSources: ProtocolV2ResourceBundleSource[];
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

const PROTOCOL_V2_FIRMWARE_STAGING_PATHS = new Set(
  Object.values(PROTOCOL_V2_REMOTE_COMPONENT_TARGETS).map(
    target => `${PROTOCOL_V2_FIRMWARE_STAGING_VOLUME}${target.fileName}`
  )
);

const isProtocolV2BootResourcePackagePath = (devicePath: string) =>
  typeof devicePath === 'string' &&
  devicePath.toLowerCase() === PROTOCOL_V2_BOOT_RESOURCE_PACKAGE_STAGING_PATH;

const PROTOCOL_V2_UPDATE_TARGET_BY_TARGET_ID = new Map<
  number,
  Exclude<FirmwareUpdateV4Target, 'boot_resources'>
>([
  [ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_BOOTLOADER, 'boot'],
  [ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_APPLICATION_P1, 'app_v1'],
  [ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_APPLICATION_P2, 'app_v2'],
  [ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_COPROCESSOR, 'coprocessor'],
  [ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE01, 'se01'],
  [ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE02, 'se02'],
  [ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE03, 'se03'],
  [ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE04, 'se04'],
]);

const PROTOCOL_V2_INSTALL_TARGET_BY_UPDATE_TARGET = new Map<
  Exclude<FirmwareUpdateV4Target, 'resource'>,
  ProtocolV2RemoteComponentTarget
>(
  Object.values(PROTOCOL_V2_REMOTE_COMPONENT_TARGETS).map(target => [
    PROTOCOL_V2_UPDATE_TARGET_BY_TARGET_ID.get(target.targetId) as Exclude<
      FirmwareUpdateV4Target,
      'resource'
    >,
    target,
  ])
);

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

const isProtocolV2InstallResponseTimeout = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const { code } = error as { code?: number | string };
  return (
    code === 'response-timeout' ||
    /\bresponse timeout\b/i.test(getProtocolV2UnknownErrorText(error))
  );
};

const getProtocolV2ErrorCode = (error: unknown): number | string | undefined => {
  if (!error || typeof error !== 'object') return undefined;
  const { errorCode, code } = error as { errorCode?: unknown; code?: unknown };
  const causeCode = errorCode ?? code;
  return typeof causeCode === 'number' || typeof causeCode === 'string' ? causeCode : undefined;
};

const isProtocolV2TerminalInstallStatusError = (error: unknown) =>
  isBleStaleBondHardwareError(error) ||
  (error instanceof HardwareError &&
    (error.errorCode === HardwareErrorCode.ActionCancelled ||
      error.errorCode === HardwareErrorCode.FirmwareError ||
      error.errorCode === HardwareErrorCode.FirmwareVerificationFailed ||
      error.params?.firmwareUpdateCode === PROTOCOL_V2_INSTALL_STATUS_CONFLICT_CODE));

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

const PROTOCOL_V2_INSTALL_PHASE_BY_DECODED_VALUE = new Map<
  number | string,
  'prepare' | 'install' | 'verify'
>([
  [0, 'prepare'],
  [1, 'install'],
  [2, 'verify'],
  ['FW_MGMT_UPDATER_PHASE_PREPARE', 'prepare'],
  ['FW_MGMT_UPDATER_PHASE_INSTALL', 'install'],
  ['FW_MGMT_UPDATER_PHASE_VERIFY', 'verify'],
]);

const normalizeProtocolV2Hex = (value?: string) => value?.replace(/^0x/i, '').toLowerCase();

const versionArrayToNumber = (version?: IVersionArray) => {
  if (!version) return undefined;
  return version[0] * 0x10000 + version[1] * 0x100 + version[2];
};

const compareProtocolV2Versions = (current?: IVersionArray, target?: IVersionArray) => {
  const currentNumber = versionArrayToNumber(current);
  const targetNumber = versionArrayToNumber(target);
  if (currentNumber === undefined || targetNumber === undefined) return undefined;
  return currentNumber - targetNumber;
};

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

const normalizeProtocolV2ProgressPercent = (value: unknown) => {
  const progress = toProtocolV2FiniteNumber(value);
  return progress === undefined ? undefined : Math.min(100, Math.max(0, progress));
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
 * - install uses DeviceFirmwareUpdateStage followed by an empty DeviceFirmwareUpdateRequest
 * - completion waits for target status to finish, reboots to normal, then polls DeviceInfo
 */
export default class FirmwareUpdateV4 extends FirmwareUpdateBaseMethod<FirmwareUpdateV4Params> {
  private protocolV2ExpectedSerialNumber?: string;

  private protocolV2ExpectedPath?: string;

  private protocolV2HasExplicitTargetSelection = false;

  getSupportedProtocols() {
    return ['V2'] as const;
  }

  private protocolV2PreparedSources: FirmwareByteSource[] = [];

  private protocolV2ExecutionInLoader = false;

  private protocolV2BootResourceStagingSafe = false;

  private protocolV2CompletedTargetVersions = new Map<number, number>();

  private protocolV2CompletedTargetIds = new Set<number>();

  private protocolV2LatestFinalFeatures?: Features;

  private protocolV2LatestFinalDeviceInfo?: ProtocolV2DeviceInfo;

  private protocolV2InstallBaselineVersions = new Map<number, string>();

  private protocolV2InstallNeedsReconnect = false;

  private protocolV2InstallDisconnectObserved = false;

  private protocolV2InstallTerminalSuccessObserved = false;

  private protocolV2LastRuntimeProbeFeatures?: Features;

  private protocolV2LastTransferProgress?: number;

  private protocolV2LastTransferProgressAt = 0;

  init() {
    this.allowDeviceMode = [UI_REQUEST.BOOTLOADER, UI_REQUEST.NOT_INITIALIZE];
    this.requireDeviceMode = [];
    this.unlockPolicy = 'unlock-before-run';
    // Protocol V2 device-management actions are not wallet-scoped, so either
    // the main PIN or an Attach PIN may authorize them.
    this.protocolV2PreUnlockPinType = DeviceSessionPinType.Any;
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;

    const { payload } = this;

    const removedResourceInputs = ['resourceFiles', 'resourceBundleArtifacts'].filter(input =>
      Object.prototype.hasOwnProperty.call(payload, input)
    );
    if (removedResourceInputs.length > 0) {
      throw ERRORS.TypedError(
        HardwareErrorCode.CallMethodInvalidParameter,
        `Protocol V2 ${removedResourceInputs.join(
          ' and '
        )} inputs are no longer supported; use resourceArchiveBinary for local updates or preparedPlan with hostBindingGeneration for remote updates`
      );
    }
    if (payload.hostBindingGeneration !== undefined && !payload.preparedPlan) {
      throw ERRORS.TypedError(
        HardwareErrorCode.CallMethodInvalidParameter,
        'Protocol V2 hostBindingGeneration requires preparedPlan for remote updates; use direct binaries or resourceArchiveBinary for local updates'
      );
    }

    this.protocolV2HasExplicitTargetSelection = payload.targetsToUpdate !== undefined;

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
      { name: 'resourceArchiveBinary', type: 'buffer' },
      { name: 'firmwareType', type: 'string' },
      { name: 'targetsToUpdate', type: 'array', allowEmpty: true },
      { name: 'platform', type: 'string' },
      { name: 'expectedDeviceId', type: 'string' },
    ]);
    if (
      payload.expectedDeviceId !== undefined &&
      (payload.expectedDeviceId.length === 0 || payload.expectedDeviceId.length > 160)
    ) {
      throw ERRORS.TypedError(
        HardwareErrorCode.CallMethodInvalidParameter,
        'Protocol V2 expected device identity is invalid'
      );
    }
    const preparedPlan = payload.preparedPlan
      ? validateFirmwareUpdatePreparedPlan(payload.preparedPlan)
      : undefined;
    const hasLocalArtifacts = [
      payload.bootloaderBinary,
      payload.romloaderBinary,
      payload.applicationP1Binary,
      payload.applicationP2Binary,
      payload.coprocessorBinary,
      payload.se01Binary,
      payload.se02Binary,
      payload.se03Binary,
      payload.se04Binary,
      payload.resourceArchiveBinary,
    ].some(Boolean);
    if (preparedPlan && hasLocalArtifacts) {
      throw ERRORS.TypedError(
        HardwareErrorCode.CallMethodInvalidParameter,
        'Prepared firmware plans cannot be combined with legacy or local firmware inputs'
      );
    }
    let { artifactReader } = payload;
    if (preparedPlan) {
      artifactReader = resolveFirmwareUpdateHostBinding(
        payload.hostBindingGeneration,
        preparedPlan.preparedPlanDigest
      ).artifactReader;
    }
    if (preparedPlan) {
      assertFirmwareUpdatePreparedPlanBinding({
        preparedPlan,
        executor: 'v4',
        platform: payload.platform,
        scopeTargets: [],
        bindings: [],
      });
      if (payload.componentArtifacts) {
        const componentBindings: Array<{
          target: Exclude<FirmwareUpdateV4Target, 'resource'>;
          artifact: FirmwareArtifactReference;
        }> = Object.entries(payload.componentArtifacts).flatMap(([target, artifact]) =>
          artifact
            ? [
                {
                  target: target as Exclude<FirmwareUpdateV4Target, 'resource'>,
                  artifact: artifact as FirmwareArtifactReference,
                },
              ]
            : []
        );
        assertFirmwareUpdatePreparedPlanBinding({
          preparedPlan,
          executor: 'v4',
          platform: payload.platform,
          scopeTargets: componentBindings.map(binding => binding.target),
          bindings: componentBindings,
        });
      }
    }

    const preparedExpectedTargetVersions = preparedPlan?.artifacts.reduce<
      NonNullable<FirmwareUpdateV4Params['expectedTargetVersions']>
    >((result, artifact) => {
      if (
        artifact.role === 'component' &&
        artifact.target !== 'resource' &&
        artifact.targetVersion &&
        PROTOCOL_V2_INSTALL_TARGET_BY_UPDATE_TARGET.has(
          artifact.target as Exclude<FirmwareUpdateV4Target, 'resource'>
        )
      ) {
        result[artifact.target as FirmwareUpdateV4Target] = artifact.targetVersion;
      }
      return result;
    }, {});
    const localTargetsToUpdate = payload.targetsToUpdate?.map((target: FirmwareUpdateV4Target) =>
      target === 'boot_resources' ? 'resource' : target
    );
    if (
      payload.resourceArchiveBinary &&
      localTargetsToUpdate &&
      !localTargetsToUpdate.includes('resource')
    ) {
      localTargetsToUpdate.push('resource');
    }
    // 本地 ZIP 本身就是明确的资源升级请求，不要求调用方重复声明 target。
    const resolvedLocalTargetsToUpdate =
      localTargetsToUpdate ?? (payload.resourceArchiveBinary ? ['resource'] : undefined);

    this.params = {
      preparedPlan,
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
      resourceArchiveBinary: payload.resourceArchiveBinary,
      firmwareType: preparedPlan?.firmwareType ?? payload.firmwareType,
      targetsToUpdate: preparedPlan
        ? ([...preparedPlan.targetsToUpdate] as FirmwareUpdateV4Target[])
        : resolvedLocalTargetsToUpdate,
      expectedTargetVersions: preparedPlan
        ? preparedExpectedTargetVersions
        : payload.expectedTargetVersions,
      platform: payload.platform,
      expectedDeviceId: payload.expectedDeviceId,
      artifactReader,
      componentArtifacts: preparedPlan ? undefined : payload.componentArtifacts,
    };
  }

  private getProtocolV2FirmwareChunkSize(direction: 'read' | 'write', filePath?: string) {
    const payloadChunkSize = Number(this.params?.chunkSize);
    const env = DataManager.getSettings('env');
    const isBle = this.params?.platform === 'native' || (env && DataManager.isBleConnect(env));
    let maxChunkSize = PROTOCOL_V2_WEBUSB_FILE_CHUNK_SIZE;
    if (isBle) {
      if (direction === 'read') {
        maxChunkSize = PROTOCOL_V2_BLE_FILE_READ_CHUNK_SIZE;
      } else {
        // Firmware staging writes tolerate a larger BLE chunk than generic filesystem writes.
        maxChunkSize = PROTOCOL_V2_FIRMWARE_STAGING_PATHS.has(filePath ?? '')
          ? PROTOCOL_V2_BLE_FIRMWARE_FILE_CHUNK_SIZE
          : PROTOCOL_V2_BLE_FILE_CHUNK_SIZE;
      }
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
    this.protocolV2InstallBaselineVersions =
      this.getProtocolV2ObservableTargetVersions(deviceFeatures);
    this.protocolV2LastRuntimeProbeFeatures = undefined;
    const currentDeviceType = this.device.getCurrentDeviceType();
    const capabilityDeviceType =
      currentDeviceType === EDeviceType.Pro2 || currentDeviceType === EDeviceType.Neo
        ? currentDeviceType
        : getDeviceType(deviceFeatures);
    assertProtocolV2FirmwareTargetsSupported(
      capabilityDeviceType,
      this.params,
      this.protocolV2HasExplicitTargetSelection
    );
    const deviceFirmwareType = getFirmwareType(deviceFeatures);
    const firmwareType = this.params.firmwareType ?? deviceFirmwareType;
    this.validateExpectedTargetVersions();
    const wantsResources = !!this.params.targetsToUpdate?.includes('resource');

    if (
      !this.params.preparedPlan &&
      this.params.resourceArchiveBinary &&
      this.params.targetsToUpdate?.includes('resource')
    ) {
      return this.runProtocolV2DirectArtifacts({});
    }

    const hasPreparedComponentArtifacts = Object.values(this.params.componentArtifacts ?? {}).some(
      Boolean
    );
    if (this.params.preparedPlan || hasPreparedComponentArtifacts) {
      return this.runProtocolV2PreparedArtifacts(deviceFeatures, firmwareType);
    }

    let fwBinaryMap: ProtocolV2TargetBinary[] = [];
    let bootloaderBinary: ArrayBuffer | null = null;
    let installItems: ProtocolV2InstallItem[] | undefined;
    let explicitInstallItems: ProtocolV2InstallItem[] | undefined;
    try {
      this.postTipMessage(FirmwareUpdateTipMessage.StartDownloadFirmware);
      fwBinaryMap = this.collectExplicitTargetBinaries();
      bootloaderBinary = this.prepareBootloaderBinary();
      explicitInstallItems = this.buildProtocolV2InstallItems({
        bootloaderBinary,
        fwBinaryMap,
      });
      const missingFirmwareTargets = this.getMissingProtocolV2FirmwareTargets(explicitInstallItems);
      const needsRemoteFirmware = this.params.targetsToUpdate?.length
        ? missingFirmwareTargets.length > 0
        : explicitInstallItems.length === 0;
      const needsSdkManagedArtifacts = needsRemoteFirmware || wantsResources;
      if (
        needsSdkManagedArtifacts &&
        (this.params.artifactReader ||
          DataManager.getSettings('firmwareManifestMode') === 'external-only')
      ) {
        throw ERRORS.TypedError(
          HardwareErrorCode.RuntimeError,
          'Protocol V2 firmware artifacts must be prepared by the external firmware host',
          {
            firmwareUpdateCode: 'FirmwareArtifactsNotPrepared',
          }
        );
      }
      if (needsSdkManagedArtifacts) {
        // Remote updates must use a freshly fetched config before any reboot or file write.
        await DataManager.forceReloadData({
          requireResources: wantsResources,
          resourceDeviceType:
            capabilityDeviceType === EDeviceType.Neo ? EDeviceType.Neo : EDeviceType.Pro2,
        });
      }
      if (needsRemoteFirmware) {
        const remoteBinaries = await this.prepareRemoteProtocolV2Binaries(
          firmwareType,
          deviceFeatures,
          explicitInstallItems
        );
        bootloaderBinary = remoteBinaries.bootloaderBinary;
        fwBinaryMap = remoteBinaries.fwBinaryMap;
        installItems = remoteBinaries.installItems;
      } else {
        const selectedInstallItems = this.filterProtocolV2LocalInstallItems(explicitInstallItems);
        bootloaderBinary =
          selectedInstallItems.find(item => item.kind === 'bootloader')?.binary ?? null;
        fwBinaryMap = selectedInstallItems
          .filter(item => item.kind === 'firmware')
          .map(item => ({
            fileName: item.fileName,
            binary: item.binary,
            targetId: item.targetId,
          }));
      }
      if (wantsResources) {
        this.params.resourceArchiveBinary = await this.downloadRemoteProtocolV2ResourceArchive(
          deviceFeatures,
          firmwareType
        );
      }
      this.postTipMessage(FirmwareUpdateTipMessage.FinishDownloadFirmware);
    } catch (err) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'params' in err &&
        (err as HardwareError).params?.firmwareUpdateCode === 'FirmwareArtifactsNotPrepared'
      ) {
        throw err;
      }
      if (err instanceof HardwareError && err.errorCode === HardwareErrorCode.NetworkError) {
        throw err;
      }
      throw normalizeFirmwarePreparationError(err);
    }

    if (wantsResources && this.params.resourceArchiveBinary) {
      return this.runProtocolV2DirectArtifacts({
        availableInstallItems: installItems ?? explicitInstallItems,
        announceDownload: false,
      });
    }

    if (!bootloaderBinary && fwBinaryMap.length === 0 && !installItems?.length) {
      throw ERRORS.TypedError(
        HardwareErrorCode.FirmwareUpdateDownloadFailed,
        'No firmware to update'
      );
    }

    return this.executeProtocolV2Update({
      fwBinaryMap,
      bootloaderBinary,
      ...(installItems ? { installItems } : undefined),
    });
  }

  private async openProtocolV2PreparedSource(artifact: FirmwareArtifactReference) {
    const source = await openFirmwareByteSource({
      artifact,
      reader: this.params.artifactReader,
    });
    if (!source) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        `Firmware artifact ${artifact.artifactRef} is not prepared`,
        {
          firmwareUpdateCode: 'FirmwareArtifactsNotPrepared',
        }
      );
    }
    this.protocolV2PreparedSources.push(source);
    return source;
  }

  private async openProtocolV2MemorySource(binary: ArrayBuffer) {
    const source = await openFirmwareByteSource({ binary });
    if (!source) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'Protocol V2 firmware binary is empty'
      );
    }
    this.protocolV2PreparedSources.push(source);
    return source;
  }

  private async closeProtocolV2PreparedSources() {
    const sources = this.protocolV2PreparedSources.splice(0);
    await Promise.all(sources.map(source => source.close().catch(() => undefined)));
  }

  private async prepareProtocolV2InstallSources(
    firmwareType: EFirmwareType,
    features: Features
  ): Promise<ProtocolV2InstallSource[]> {
    if (this.params.preparedPlan) {
      const requestedTargets = new Set(
        this.params.preparedPlan.targetsToUpdate.filter(
          (target): target is Exclude<FirmwareUpdateV4Target, 'resource'> => target !== 'resource'
        )
      );
      const installSources: ProtocolV2InstallSource[] = [];
      const preparedTargets = new Set<Exclude<FirmwareUpdateV4Target, 'resource'>>();
      for (const artifact of this.params.preparedPlan.artifacts) {
        if (artifact.target !== 'resource') {
          const target = artifact.target as Exclude<FirmwareUpdateV4Target, 'resource'>;
          const installTarget = PROTOCOL_V2_INSTALL_TARGET_BY_UPDATE_TARGET.get(target);
          if (
            !requestedTargets.has(target) ||
            artifact.role !== 'component' ||
            artifact.container !== 'raw' ||
            !installTarget ||
            preparedTargets.has(target)
          ) {
            throw ERRORS.TypedError(
              HardwareErrorCode.RuntimeError,
              `Protocol V2 prepared component artifact is invalid: ${artifact.artifactId}`,
              { firmwareUpdateCode: 'FirmwareArtifactsNotPrepared' }
            );
          }
          installSources.push({
            ...installTarget,
            source: await this.openProtocolV2PreparedSource(artifact.artifact),
          });
          preparedTargets.add(target);
        }
      }
      const missingTarget = Array.from(requestedTargets).find(
        target => !preparedTargets.has(target)
      );
      if (missingTarget) {
        throw ERRORS.TypedError(
          HardwareErrorCode.RuntimeError,
          `Protocol V2 ${missingTarget} artifact is not prepared`,
          {
            firmwareUpdateCode: 'FirmwareArtifactsNotPrepared',
            artifactName: missingTarget,
          }
        );
      }
      return installSources;
    }

    const release = DataManager.getFirmwareLatestRelease(features, firmwareType);
    if (!release) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'Protocol V2 firmware release is unavailable'
      );
    }
    const componentArtifacts = this.params.componentArtifacts ?? {};
    const requestedTargets = new Set(
      this.params.targetsToUpdate ?? (Object.keys(componentArtifacts) as FirmwareUpdateV4Target[])
    );
    const installSources: ProtocolV2InstallSource[] = [];
    const preparedTargets = new Set<FirmwareUpdateV4Target>();

    for (const [key, component] of this.getRemoteComponentEntries(release)) {
      const target = this.getRemoteComponentTarget(key, component);
      const updateTarget = PROTOCOL_V2_UPDATE_TARGET_BY_TARGET_ID.get(target.targetId);
      if (updateTarget && updateTarget !== 'resource' && requestedTargets.has(updateTarget)) {
        const artifact = componentArtifacts[updateTarget];
        if (!artifact) {
          throw ERRORS.TypedError(
            HardwareErrorCode.RuntimeError,
            `Protocol V2 ${updateTarget} artifact is not prepared`,
            {
              firmwareUpdateCode: 'FirmwareArtifactsNotPrepared',
              artifactName: updateTarget,
            }
          );
        }
        installSources.push({
          ...target,
          source: await this.openProtocolV2PreparedSource(artifact),
        });
        preparedTargets.add(updateTarget);
      }
    }

    const unknownTarget = Array.from(requestedTargets).find(
      target => target !== 'resource' && !preparedTargets.has(target)
    );
    if (unknownTarget) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        `Protocol V2 release does not contain requested target ${unknownTarget}`
      );
    }
    return installSources;
  }

  private async runProtocolV2DirectArtifacts({
    availableInstallItems,
    announceDownload = true,
  }: {
    availableInstallItems?: ProtocolV2InstallItem[];
    announceDownload?: boolean;
  }) {
    try {
      if (announceDownload) {
        this.postTipMessage(FirmwareUpdateTipMessage.StartDownloadFirmware);
      }
      const installItems = this.filterProtocolV2LocalInstallItems(
        availableInstallItems ??
          this.buildProtocolV2InstallItems({
            bootloaderBinary: this.prepareBootloaderBinary(),
            fwBinaryMap: this.collectExplicitTargetBinaries(),
          })
      );
      const installSources = await Promise.all(
        installItems.map(async item => ({
          fileName: item.fileName,
          source: await this.openProtocolV2MemorySource(item.binary),
          targetId: item.targetId,
          kind: item.kind,
        }))
      );
      const resourceSources = this.params.resourceArchiveBinary
        ? await this.createProtocolV2ResourceSourcesFromArchive(this.params.resourceArchiveBinary)
        : [];
      if (installSources.length === 0 && resourceSources.length === 0) {
        throw ERRORS.TypedError(
          HardwareErrorCode.FirmwareUpdateDownloadFailed,
          'No firmware to update'
        );
      }
      if (announceDownload) {
        this.postTipMessage(FirmwareUpdateTipMessage.FinishDownloadFirmware);
      }
      return await this.executeProtocolV2SourceUpdate({
        installSources,
        resourceSources,
      });
    } finally {
      await this.closeProtocolV2PreparedSources();
    }
  }

  private async createProtocolV2ResourceSourcesFromArchive(
    binary: ArrayBuffer
  ): Promise<ProtocolV2ResourceBundleSource[]> {
    const archive = await this.prepareProtocolV2LocalResourceArchive(binary);
    const sources: ProtocolV2ResourceBundleSource[] = [];
    for (const resource of archive.resources) {
      sources.push({
        name: resource.entryName.split('/').pop() ?? resource.entryName,
        source: await this.openProtocolV2MemorySource(resource.binary),
        devicePath: resource.header.devicePath,
        version: resource.header.version,
        payloadHash: resource.header.payloadHash,
        headerHash: resource.header.headerHash,
      });
    }
    return sources;
  }

  private async prepareProtocolV2LocalResourceArchive(
    binary: ArrayBuffer
  ): Promise<ProtocolV2LocalResourceArchive> {
    if (binary.byteLength <= 0 || binary.byteLength > PROTOCOL_V2_RESOURCE_TOTAL_MAX_BYTES) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'Protocol V2 local resource ZIP archive size is invalid',
        { firmwareUpdateCode: 'FirmwareArtifactsNotPrepared' }
      );
    }
    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(binary);
    } catch {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'Protocol V2 resource ZIP cannot be parsed',
        { firmwareUpdateCode: 'FirmwareArtifactsNotPrepared' }
      );
    }
    const zipEntries = Object.values(zip.files);
    const resourceEntries = zipEntries.filter(
      entry => !entry.dir && isProtocolV2ResourceArchiveEntryName(entry.name)
    );
    if (
      resourceEntries.length === 0 ||
      resourceEntries.length > PROTOCOL_V2_RESOURCE_FILE_MAX_COUNT
    ) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'Protocol V2 resource ZIP has no valid resource package set',
        { firmwareUpdateCode: 'FirmwareArtifactsNotPrepared' }
      );
    }

    let totalSize = 0;
    const resources: ProtocolV2LocalResourceArchive['resources'] = [];
    const devicePaths = new Set<string>();
    for (const entry of resourceEntries) {
      const { compressedSize, uncompressedSize } = getProtocolV2ZipEntrySizes(entry);
      totalSize += uncompressedSize;
      if (
        compressedSize > binary.byteLength ||
        uncompressedSize > PROTOCOL_V2_RESOURCE_TOTAL_MAX_BYTES ||
        totalSize > PROTOCOL_V2_RESOURCE_TOTAL_MAX_BYTES
      ) {
        throw ERRORS.TypedError(
          HardwareErrorCode.RuntimeError,
          `Protocol V2 resource package size is invalid: ${entry.name}`,
          { firmwareUpdateCode: 'FirmwareArtifactsNotPrepared' }
        );
      }
      const fileBinary = await entry.async('arraybuffer');
      if (fileBinary.byteLength !== uncompressedSize) {
        throw ERRORS.TypedError(
          HardwareErrorCode.RuntimeError,
          `Protocol V2 resource package is incomplete: ${entry.name}`,
          { firmwareUpdateCode: 'FirmwareArtifactReceiptMismatch' }
        );
      }
      let header: ProtocolV2ResourcePackageHeader;
      try {
        header = parseProtocolV2ResourcePackage(fileBinary);
      } catch (error) {
        throw ERRORS.TypedError(
          HardwareErrorCode.RuntimeError,
          `Protocol V2 resource package is invalid: ${entry.name}: ${String(error)}`,
          { firmwareUpdateCode: 'FirmwareArtifactsNotPrepared' }
        );
      }
      const canonicalDevicePath = header.devicePath.toLowerCase();
      if (devicePaths.has(canonicalDevicePath)) {
        throw ERRORS.TypedError(
          HardwareErrorCode.RuntimeError,
          `Protocol V2 resource ZIP contains duplicate device path: ${header.devicePath}`,
          { firmwareUpdateCode: 'FirmwareArtifactsNotPrepared' }
        );
      }
      devicePaths.add(canonicalDevicePath);
      resources.push({ entryName: entry.name, binary: fileBinary, header });
    }
    return { binary, resources };
  }

  private async prepareProtocolV2ResourceSources(): Promise<ProtocolV2ResourceBundleSource[]> {
    const resourceRequested = this.params.targetsToUpdate?.includes('resource') ?? false;
    if (!resourceRequested) {
      return [];
    }
    const archiveSources = await this.prepareProtocolV2ResourceArchiveSources();
    if (archiveSources) {
      return archiveSources;
    }
    throw ERRORS.TypedError(
      HardwareErrorCode.RuntimeError,
      'Protocol V2 resource archive is not prepared',
      { firmwareUpdateCode: 'FirmwareArtifactsNotPrepared' }
    );
  }

  private async prepareProtocolV2ResourceArchiveSources(): Promise<
    ProtocolV2ResourceBundleSource[] | undefined
  > {
    const archiveArtifacts =
      this.params.preparedPlan?.artifacts.filter(
        artifact =>
          artifact.role === 'resourceBundle' &&
          artifact.target === 'resource' &&
          artifact.container === 'zip'
      ) ?? [];
    if (archiveArtifacts.length === 0) {
      return undefined;
    }
    if (archiveArtifacts.length !== 1) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'Protocol V2 prepared plan must contain exactly one resource archive',
        { firmwareUpdateCode: 'FirmwareArtifactsNotPrepared' }
      );
    }

    const archiveArtifact = archiveArtifacts[0];
    const archiveSource = await this.openProtocolV2PreparedSource(archiveArtifact.artifact);
    if (archiveSource.size > PROTOCOL_V2_RESOURCE_TOTAL_MAX_BYTES) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'Protocol V2 prepared resource archive exceeds the total size limit',
        { firmwareUpdateCode: 'FirmwareArtifactsNotPrepared' }
      );
    }

    let archiveBinary: ArrayBuffer;
    try {
      archiveBinary = await readFirmwareByteSourceFully(archiveSource);
    } finally {
      await archiveSource.close();
    }
    const archiveDigest = bytesToHex(sha256(new Uint8Array(archiveBinary)));
    if (archiveDigest !== archiveArtifact.artifact.sha256.toLowerCase()) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'Protocol V2 prepared resource archive does not match its approved receipt',
        { firmwareUpdateCode: 'FirmwareArtifactReceiptMismatch' }
      );
    }

    // The verified ZIP bytes are authoritative. Non-okpkg entries are release
    // metadata only; each RESOURCE package carries its own device path.
    return this.createProtocolV2ResourceSourcesFromArchive(archiveBinary);
  }

  private async runProtocolV2PreparedArtifacts(
    features: Features,
    firmwareType: EFirmwareType,
    announceDownload = true
  ) {
    try {
      if (announceDownload) {
        this.postTipMessage(FirmwareUpdateTipMessage.StartDownloadFirmware);
      }
      const installSources = await this.prepareProtocolV2InstallSources(firmwareType, features);
      const resourceSources = await this.prepareProtocolV2ResourceSources();
      if (installSources.length === 0 && resourceSources.length === 0) {
        throw ERRORS.TypedError(
          HardwareErrorCode.FirmwareUpdateDownloadFailed,
          'No firmware to update'
        );
      }
      if (announceDownload) {
        this.postTipMessage(FirmwareUpdateTipMessage.FinishDownloadFirmware);
      }

      return await this.executeProtocolV2SourceUpdate({
        installSources,
        resourceSources,
      });
    } finally {
      await this.closeProtocolV2PreparedSources();
    }
  }

  private validateExpectedTargetVersions() {
    const expected = this.params.expectedTargetVersions;
    if (expected === undefined) return;
    if (typeof expected !== 'object' || expected === null || Array.isArray(expected)) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'Protocol V2 expected target versions are invalid'
      );
    }
    for (const [target, version] of Object.entries(expected)) {
      if (
        !Array.from(PROTOCOL_V2_UPDATE_TARGET_BY_TARGET_ID.values()).includes(
          target as Exclude<FirmwareUpdateV4Target, 'boot_resources'>
        ) ||
        typeof version !== 'string' ||
        !/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/u.test(version) ||
        version.length > 64
      ) {
        throw ERRORS.TypedError(
          HardwareErrorCode.RuntimeError,
          'Protocol V2 expected target version is invalid'
        );
      }
    }
  }

  private getExpectedProtocolV2TargetVersion(targetId: number) {
    const target = PROTOCOL_V2_UPDATE_TARGET_BY_TARGET_ID.get(targetId);
    const version = target ? this.params?.expectedTargetVersions?.[target] : undefined;
    if (!version) return undefined;
    const parts = version.split(/[+-]/u, 1)[0].split('.').map(Number);
    if (
      parts.length !== 3 ||
      parts.some(part => !Number.isSafeInteger(part) || part < 0 || part > 0xff)
    ) {
      return undefined;
    }
    return parts[0] * 0x10000 + parts[1] * 0x100 + parts[2];
  }

  private assertExpectedProtocolV2Versions(targets?: readonly FirmwareUpdateV4Target[]) {
    const expected = this.params?.expectedTargetVersions;
    if (!expected) return;
    const features = this.protocolV2LatestFinalFeatures;
    const deviceInfo = this.protocolV2LatestFinalDeviceInfo;
    const visibleVersions: Partial<Record<FirmwareUpdateV4Target, string>> = {
      boot: features ? getDeviceBootloaderVersion(features).join('.') : undefined,
      // Protocol V2 firmware exposes P1 as the device firmware version after reboot.
      app_v1: features
        ? getDeviceFirmwareVersion(features).join('.')
        : deviceInfo?.main_mcu?.application?.version,
      app_v2: deviceInfo?.main_mcu?.application_data?.version,
      coprocessor: features ? getDeviceBLEFirmwareVersion(features).join('.') : undefined,
      se01: features?.se01Version ?? undefined,
      se02: features?.se02Version ?? undefined,
      se03: features?.se03Version ?? undefined,
      se04: features?.se04Version ?? undefined,
    };
    const expectedEntries = (
      Object.entries(expected) as Array<[FirmwareUpdateV4Target, string]>
    ).filter(([target]) => !targets || targets.includes(target));
    for (const [target, expectedVersion] of expectedEntries) {
      const targetId = Array.from(PROTOCOL_V2_UPDATE_TARGET_BY_TARGET_ID.entries()).find(
        ([, mappedTarget]) => mappedTarget === target
      )?.[0];
      const statusVersion =
        targetId === undefined ? undefined : this.protocolV2CompletedTargetVersions.get(targetId);
      const observedVersion =
        statusVersion === undefined
          ? visibleVersions[target]
          : `${Math.floor(statusVersion / 0x10000) % 0x100}.${
              Math.floor(statusVersion / 0x100) % 0x100
            }.${statusVersion % 0x100}`;
      if (!observedVersion) {
        const hasCompleteTargetEvidence =
          targetId !== undefined && this.protocolV2CompletedTargetIds.has(targetId);
        if (hasCompleteTargetEvidence) {
          Log.warn(
            `Protocol V2 target ${target} has no observable final version; install completion is authoritative`
          );
        } else {
          throw ERRORS.TypedError(
            HardwareErrorCode.FirmwareVerificationFailed,
            `Protocol V2 target ${target} has no observable final version after status fallback`
          );
        }
      } else if (observedVersion !== expectedVersion) {
        throw ERRORS.TypedError(
          HardwareErrorCode.FirmwareVerificationFailed,
          `Protocol V2 target ${target} reached ${observedVersion}, expected ${expectedVersion}`
        );
      }
    }
  }

  private async getProtocolV2DeviceFeatures(): Promise<Features> {
    let { features } = this.device;
    if (typeof this.device.getFeatures === 'function') {
      features ??= await this.device.getFeatures();
    }
    if (!features) {
      throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Device features not available');
    }
    const deviceType = this.device.getCurrentDeviceType();
    if (deviceType !== EDeviceType.Pro2 && deviceType !== EDeviceType.Neo) {
      return features;
    }
    return {
      ...features,
      deviceType,
      firmwareType: this.device.getCurrentFirmwareType(),
    };
  }

  private getProtocolV2SerialNumber(deviceInfo: ProtocolV2DeviceInfo) {
    const serialNumber = deviceInfo.hw?.serial_no?.trim();
    return serialNumber || undefined;
  }

  private getProtocolV2PreparedPlanDeviceModel(features?: Features) {
    const currentDeviceType = this.device.getCurrentDeviceType();
    const featureDeviceType = features ? getDeviceType(features) : undefined;
    const deviceType =
      currentDeviceType === EDeviceType.Pro2 || currentDeviceType === EDeviceType.Neo
        ? currentDeviceType
        : featureDeviceType;
    return deviceType === EDeviceType.Pro2 || deviceType === EDeviceType.Neo
      ? String(deviceType)
      : undefined;
  }

  private getProtocolV2ConnectionRoute() {
    const descriptor = this.device.originalDescriptor;
    return (
      descriptor?.path?.trim() ||
      this.device.getConnectId?.()?.trim() ||
      descriptor?.id?.trim() ||
      undefined
    );
  }

  private assertProtocolV2DeviceInfoIdentity(deviceInfo: ProtocolV2DeviceInfo) {
    assertProtocolV2ReconnectIdentity(
      this.protocolV2ExpectedSerialNumber,
      this.getProtocolV2SerialNumber(deviceInfo),
      this.protocolV2ExpectedPath,
      this.getProtocolV2ConnectionRoute()
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
    const path = this.getProtocolV2ConnectionRoute();
    if (this.params?.preparedPlan) {
      assertFirmwareUpdatePreparedPlanDeviceIdentity({
        preparedPlan: this.params.preparedPlan,
        deviceIdentity: serialNumber,
        deviceModel: this.getProtocolV2PreparedPlanDeviceModel(this.device.features),
      });
    } else if (this.params?.expectedDeviceId) {
      assertProtocolV2ReconnectIdentity(this.params?.expectedDeviceId, serialNumber);
    } else {
      assertProtocolV2ReconnectIdentity(serialNumber, serialNumber, path, path);
    }
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

  private getMissingProtocolV2FirmwareTargets(installItems: ProtocolV2InstallItem[]) {
    const preparedTargets = new Set(
      installItems.flatMap(item => {
        const target = PROTOCOL_V2_UPDATE_TARGET_BY_TARGET_ID.get(item.targetId);
        return target ? [target] : [];
      })
    );
    return (this.params.targetsToUpdate ?? [])
      .filter(
        (target): target is Exclude<FirmwareUpdateV4Target, 'resource' | 'boot_resources'> =>
          target !== 'resource' && target !== 'boot_resources'
      )
      .filter(target => !preparedTargets.has(target));
  }

  private filterProtocolV2LocalInstallItems(installItems: ProtocolV2InstallItem[]) {
    if (!this.protocolV2HasExplicitTargetSelection) {
      return installItems;
    }
    const requestedTargets = new Set(this.params.targetsToUpdate ?? []);
    return installItems.filter(item => {
      const target = PROTOCOL_V2_UPDATE_TARGET_BY_TARGET_ID.get(item.targetId);
      return target !== undefined && requestedTargets.has(target);
    });
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
    const expectedFingerprint = normalizeProtocolV2Hex(component.fingerprint);
    if (
      !Number.isSafeInteger(component.expectedSize) ||
      Number(component.expectedSize) <= 0 ||
      !expectedFingerprint ||
      !/^[0-9a-f]{64}$/u.test(expectedFingerprint)
    ) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        `Protocol V2 firmware component integrity metadata is invalid: ${key}/${component.target}`,
        { firmwareUpdateCode: 'FirmwarePlanInvalid' }
      );
    }

    const { binary } = await getSysResourceBinary(component.url);
    if (binary.byteLength !== component.expectedSize) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        `Protocol V2 firmware size mismatch: ${key}/${component.target}`,
        { firmwareUpdateCode: 'FirmwareArtifactReceiptMismatch' }
      );
    }
    if (!isProtocolV2FirmwareFingerprintValid(binary, component.fingerprint)) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        `Protocol V2 firmware fingerprint mismatch: ${key}/${component.target}`
      );
    }
    return {
      ...target,
      binary,
    };
  }

  private async downloadRemoteProtocolV2ResourceArchive(
    features: Features,
    firmwareType: EFirmwareType
  ): Promise<ArrayBuffer> {
    const deviceType = getDeviceType(features);
    if (deviceType !== EDeviceType.Pro2 && deviceType !== EDeviceType.Neo) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'Protocol V2 resource archive requires a Pro2 or Neo device'
      );
    }
    const release = DataManager.getFirmwareLatestRelease(features, firmwareType);
    const source = DataManager.getProtocolV2ResourceSource(release);
    const expectedSha256 = normalizeProtocolV2Hex(source?.archiveSha256);
    if (
      !source?.archiveUrl ||
      !Number.isSafeInteger(source.archiveSize) ||
      source.archiveSize <= 0 ||
      source.archiveSize > PROTOCOL_V2_RESOURCE_TOTAL_MAX_BYTES ||
      !expectedSha256 ||
      !/^[0-9a-f]{64}$/u.test(expectedSha256)
    ) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'Protocol V2 resource archive integrity metadata is invalid',
        { firmwareUpdateCode: 'FirmwarePlanInvalid' }
      );
    }
    const { binary } = await getSysResourceBinary(source.archiveUrl);
    if (
      binary.byteLength !== source.archiveSize ||
      bytesToHex(sha256(new Uint8Array(binary))) !== expectedSha256
    ) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        'Protocol V2 resource archive does not match the remote config',
        { firmwareUpdateCode: 'FirmwareArtifactReceiptMismatch' }
      );
    }
    return binary;
  }

  private async prepareRemoteProtocolV2Binaries(
    firmwareType: EFirmwareType,
    features: Features,
    explicitInstallItems: ProtocolV2InstallItem[] = []
  ) {
    const release = DataManager.getFirmwareLatestRelease(features, firmwareType);

    let bootloaderBinary: ArrayBuffer | null = null;
    const fwBinaryMap: ProtocolV2TargetBinary[] = [];
    const installItems: ProtocolV2InstallItem[] = [];

    if (!release) {
      const missingFirmwareTargets = this.getMissingProtocolV2FirmwareTargets(explicitInstallItems);
      if (missingFirmwareTargets.length > 0) {
        throw ERRORS.TypedError(
          HardwareErrorCode.RuntimeError,
          `Protocol V2 firmware release is unavailable for requested targets: ${missingFirmwareTargets.join(
            ', '
          )}`
        );
      }
      return {
        bootloaderBinary,
        fwBinaryMap,
        installItems,
      };
    }

    const entries = this.getRemoteComponentEntries(release);
    const targetsToUpdate = new Set(this.params.targetsToUpdate ?? []);
    const explicitInstallItemByTargetId = new Map(
      explicitInstallItems.map(item => [item.targetId, item] as const)
    );
    const preparedTargets = new Set<FirmwareUpdateV4Target>();

    for (const [key, component] of entries) {
      const targetName = component.target?.toUpperCase();
      const target = PROTOCOL_V2_REMOTE_COMPONENT_TARGETS[targetName];
      const updateTarget = target
        ? PROTOCOL_V2_UPDATE_TARGET_BY_TARGET_ID.get(target.targetId)
        : undefined;
      if (updateTarget && targetsToUpdate.has(updateTarget)) {
        const explicitInstallItem = explicitInstallItemByTargetId.get(target.targetId);
        let installItem = explicitInstallItem;
        if (!installItem) {
          installItem = await this.downloadRemoteProtocolV2Component(key, component);
          if (component.version) {
            this.params.expectedTargetVersions ??= {};
            this.params.expectedTargetVersions[updateTarget] = component.version.join('.');
          }
        }
        if (installItem.kind === 'bootloader') {
          bootloaderBinary = installItem.binary;
        } else {
          const binaryEntry = {
            fileName: installItem.fileName,
            binary: installItem.binary,
            targetId: installItem.targetId,
          };
          fwBinaryMap.push(binaryEntry);
        }
        installItems.push({ ...installItem });
        preparedTargets.add(updateTarget);
      }
    }

    const missingTarget = Array.from(targetsToUpdate).find(
      target => target !== 'resource' && !preparedTargets.has(target)
    );
    if (missingTarget) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        `Protocol V2 release does not contain requested target ${missingTarget}`
      );
    }

    return {
      bootloaderBinary,
      fwBinaryMap,
      installItems,
    };
  }

  private getProtocolV2ResourceFilePath(path: string) {
    if (path.startsWith('vol')) return path;
    if (path.startsWith('/')) return `vol0:${path}`;
    return `vol0:/${path}`;
  }

  private getProtocolV2ResourceComparePath(devicePath: string) {
    return isProtocolV2BootResourcePackagePath(devicePath)
      ? PROTOCOL_V2_BOOT_RESOURCE_PACKAGE_PATH
      : devicePath;
  }

  private async readProtocolV2DeviceFileHeader(path: string, expectedSize?: number) {
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
      fileSize < PROTOCOL_V2_RESOURCE_PACKAGE_HEADER_SIZE ||
      (expectedSize !== undefined && fileSize !== expectedSize)
    ) {
      return null;
    }

    const chunkSize = this.getProtocolV2FirmwareChunkSize('read');
    const chunks: Uint8Array[] = [];
    let offset = 0;
    while (offset < PROTOCOL_V2_RESOURCE_PACKAGE_HEADER_SIZE) {
      const readLen = Math.min(chunkSize, PROTOCOL_V2_RESOURCE_PACKAGE_HEADER_SIZE - offset);
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
    try {
      return parseProtocolV2ResourcePackageHeader(headerBytes, fileSize);
    } catch {
      return null;
    }
  }

  /** Compare the downloaded and installed okpkg headers before transferring a resource. */
  private async isProtocolV2ResourceBundleUpToDate(
    bundle: Pick<
      ProtocolV2ResourceBundleSource,
      'name' | 'source' | 'devicePath' | 'version' | 'payloadHash' | 'headerHash'
    >
  ): Promise<boolean> {
    if (this.params?.forcedUpdateRes) return false;
    if (!bundle.payloadHash || !bundle.headerHash) return false;

    try {
      const header = await this.readProtocolV2DeviceFileHeader(
        this.getProtocolV2ResourceComparePath(bundle.devicePath),
        bundle.source.size
      );
      if (!header) return false;

      if (bundle.version) {
        const cmp = compareProtocolV2Versions(header.version, bundle.version);
        if (cmp === undefined || cmp !== 0) return false;
      }
      const expectedPayloadHash = normalizeProtocolV2Hex(bundle.payloadHash);
      const expectedHeaderHash = normalizeProtocolV2Hex(bundle.headerHash);
      if (!expectedPayloadHash || header.payloadHash !== expectedPayloadHash) return false;
      if (!expectedHeaderHash || header.headerHash !== expectedHeaderHash) return false;
      return true;
    } catch (error) {
      if (isBleStaleBondHardwareError(error)) {
        throw error;
      }
      Log.log(`[FirmwareUpdateV4] RESC bundle ${bundle.name} header check failed: `, error);
      return false;
    }
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

  private async rebootProtocolV2ToBootloader() {
    try {
      this.postTipMessage(FirmwareUpdateTipMessage.AutoRebootToBootloader);
      await this.protocolV2Reboot(DeviceRebootType.Bootloader);
      await wait(1000);
      await this.waitForProtocolV2BootloaderMode();
      this.protocolV2ExecutionInLoader = true;
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

  async enterProtocolV2BootloaderMode() {
    // romloader is the first update environment and forwards targets to bootloader.
    // It rejects DeviceRebootType.Bootloader, so reuse the current connection.
    if (this.isProtocolV2RomloaderMode()) {
      Log.debug('Protocol V2 device is in romloader mode; start firmware update directly');
      this.protocolV2ExecutionInLoader = true;
      return false;
    }
    if (this.isProtocolV2BootloaderMode()) {
      Log.debug('Protocol V2 device is already in bootloader mode, skip reboot');
      this.protocolV2ExecutionInLoader = true;
      this.postTipMessage(FirmwareUpdateTipMessage.GoToBootloaderSuccess);
      return false;
    }

    return this.rebootProtocolV2ToBootloader();
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
        if (isBleStaleBondHardwareError(error) || this.isProtocolV2ReconnectIdentityError(error)) {
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

  private async executeProtocolV2SourceUpdate({
    installSources,
    resourceSources,
  }: {
    installSources: ProtocolV2InstallSource[];
    resourceSources: ProtocolV2ResourceBundleSource[];
  }) {
    this.protocolV2BootResourceStagingSafe = false;
    if (installSources.length > 0 || resourceSources.length > 0) {
      await this.enterProtocolV2BootloaderMode();
      // Clear stale boot-resource staging before writing any artifacts. The new
      // boot resource, resources and firmware then share one transfer session,
      // one global progress range and one multi-target install request.
      // Preserve the approved source order instead of synthesizing a boot-first
      // phase. Loader firmware owns the cross-stage handoff: bootloader runs its
      // component targets and leaves boot pending for romloader, while pending
      // runner-backed records always resume before the application boots.
      await this.ensureProtocolV2BootResourceStagingIsEmpty();
      await this.executeProtocolV2TransferPhase({
        installSources,
        resourceSources,
      });
    }
    return this.completeProtocolV2FinalVerification();
  }

  private async ensureProtocolV2BootResourceStagingIsEmpty() {
    if (this.protocolV2BootResourceStagingSafe) return;
    const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());
    const query = () =>
      typedCall('FilesystemPathInfoQuery', 'FilesystemPathInfo', {
        path: PROTOCOL_V2_BOOT_RESOURCE_PACKAGE_STAGING_PATH,
      });
    const current = await query();
    if (current.message?.exist) {
      if (current.message.directory) {
        throw ERRORS.TypedError(
          HardwareErrorCode.EmmcFileWriteFirmwareError,
          'Protocol V2 boot resource staging path is not a file'
        );
      }
      await typedCall('FilesystemFileDelete', 'Success', {
        path: PROTOCOL_V2_BOOT_RESOURCE_PACKAGE_STAGING_PATH,
      });
      const remaining = await query();
      if (remaining.message?.exist) {
        throw ERRORS.TypedError(
          HardwareErrorCode.EmmcFileWriteFirmwareError,
          'Protocol V2 stale boot resource staging file could not be removed'
        );
      }
    }
    this.protocolV2BootResourceStagingSafe = true;
  }

  private async executeProtocolV2Update({
    fwBinaryMap,
    bootloaderBinary,
    installItems,
  }: {
    fwBinaryMap?: ProtocolV2TargetBinary[];
    bootloaderBinary?: ArrayBuffer | null;
    installItems?: ProtocolV2InstallItem[];
  }) {
    const memoryInstallItems =
      installItems ??
      this.buildProtocolV2InstallItems({
        fwBinaryMap: fwBinaryMap ?? [],
        bootloaderBinary: bootloaderBinary ?? null,
      });
    try {
      const installSources = await Promise.all(
        memoryInstallItems.map(async item => ({
          fileName: item.fileName,
          source: await this.openProtocolV2MemorySource(item.binary),
          targetId: item.targetId,
          kind: item.kind,
        }))
      );
      return await this.executeProtocolV2SourceUpdate({
        installSources,
        resourceSources: [],
      });
    } finally {
      await this.closeProtocolV2PreparedSources();
    }
  }

  private async executeProtocolV2TransferPhase({
    installSources,
    resourceSources,
  }: ProtocolV2TransferBatch) {
    let totalSize = installSources.reduce((total, item) => total + item.source.size, 0);
    const resourcesToSync: ProtocolV2ResourceBundleSource[] = [];
    for (const resource of resourceSources) {
      if (await this.isProtocolV2ResourceBundleUpToDate(resource)) {
        Log.log(`[FirmwareUpdateV4] skip RESC bundle ${resource.name}; already up to date`);
      } else {
        resourcesToSync.push(resource);
        totalSize += resource.source.size;
      }
    }

    this.postTipMessage(FirmwareUpdateTipMessage.StartTransferData);
    this.protocolV2LastTransferProgress = undefined;
    this.protocolV2LastTransferProgressAt = 0;
    const transferStartedAt = Date.now();
    let processedSize = 0;
    for (const resource of resourcesToSync) {
      // The bootloader keeps its live resource package mounted. FatFs rejects
      // replacing an open file, so early boot promotes this staging file before mounting it.
      const writePath = resource.devicePath;
      processedSize = await this.protocolV2SourceUpdateProcess({
        source: resource.source,
        filePath: writePath,
        processedSize,
        totalSize,
        transferStartedAt,
      });
      await this.verifyProtocolV2StagedFile(writePath, resource.source.size);
      if (isProtocolV2BootResourcePackagePath(resource.devicePath)) {
        this.protocolV2BootResourceStagingSafe = true;
      }
    }

    const stagedInstallTargets: Array<{ targetId: number; path: string }> = [];
    for (const item of installSources) {
      const filePath = this.getProtocolV2InstallItemStagingPath(item);
      processedSize = await this.protocolV2SourceUpdateProcess({
        source: item.source,
        filePath,
        processedSize,
        totalSize,
        transferStartedAt,
      });
      await this.verifyProtocolV2StagedFile(filePath, item.source.size);
      stagedInstallTargets.push({
        targetId: item.targetId,
        path: filePath,
      });
    }

    if (totalSize > 0) {
      const elapsedMs = Math.max(Date.now() - transferStartedAt, 0);
      this.postProgressMessage(100, 'transferData', {
        transferredBytes: totalSize,
        totalBytes: totalSize,
        rateBytesPerSecond: elapsedMs > 0 ? Math.round((totalSize / elapsedMs) * 1000) : undefined,
        elapsedMs,
      });
    }
    if (stagedInstallTargets.length === 0) {
      return;
    }

    this.postTipMessage(FirmwareUpdateTipMessage.ConfirmOnDevice);
    const targets = stagedInstallTargets.map(item => ({
      target_id: item.targetId,
      path: item.path,
    }));
    try {
      await this.protocolV2StartFirmwareUpdate({ targets });
      await wait(PROTOCOL_V2_INSTALL_STATUS_INITIAL_DELAY);
      await this.waitForProtocolV2FirmwareUpdateComplete(targets, true);
    } finally {
      this.device?.clearCancelableAction();
    }
  }

  private async protocolV2SourceUpdateProcess({
    source,
    filePath,
    processedSize,
    totalSize,
    transferStartedAt = Date.now(),
  }: {
    source: FirmwareByteSource;
    filePath: string;
    processedSize: number;
    totalSize: number;
    transferStartedAt?: number;
  }) {
    let lastError: unknown;
    for (let attempt = 1; attempt <= PROTOCOL_V2_FILE_TRANSFER_RETRY_COUNT; attempt += 1) {
      this.throwIfAborted();
      try {
        await writeFirmwareByteSource({
          source,
          chunkSize: this.getProtocolV2FirmwareChunkSize('write', filePath),
          write: async ({ data, sourceOffset, length, first }) => {
            this.throwIfAborted();
            const chunkEnd = sourceOffset + length;
            const deviceProgress = getProtocolV2DeviceTransferProgress(
              processedSize + sourceOffset,
              processedSize + chunkEnd,
              totalSize
            );
            const response = await this.fileWriteChunk(
              filePath,
              source.size,
              sourceOffset,
              data,
              first,
              deviceProgress
            );
            const rawProcessedByte = response.message.processed_byte;
            const nextOffset = rawProcessedByte === undefined ? chunkEnd : Number(rawProcessedByte);
            if (!Number.isFinite(nextOffset) || nextOffset !== chunkEnd) {
              throw ERRORS.TypedError(
                HardwareErrorCode.EmmcFileWriteFirmwareError,
                `invalid processed_byte ${rawProcessedByte} for offset ${sourceOffset}`
              );
            }
            const transferredBytes = processedSize + chunkEnd;
            const now = Date.now();
            const elapsedMs = Math.max(now - transferStartedAt, 0);
            const progress = Math.min(Math.ceil((transferredBytes / totalSize) * 100), 99);
            const shouldPostProgress =
              progress !== this.protocolV2LastTransferProgress ||
              now - this.protocolV2LastTransferProgressAt >=
                PROTOCOL_V2_TRANSFER_PROGRESS_HEARTBEAT_MS ||
              chunkEnd === source.size;
            if (shouldPostProgress) {
              this.protocolV2LastTransferProgress = progress;
              this.protocolV2LastTransferProgressAt = now;
              this.postProgressMessage(progress, 'transferData', {
                transferredBytes,
                totalBytes: totalSize,
                rateBytesPerSecond:
                  elapsedMs > 0 ? Math.round((transferredBytes / elapsedMs) * 1000) : undefined,
                elapsedMs,
              });
            }
            return length;
          },
        });
        return processedSize + source.size;
      } catch (error) {
        this.throwIfAborted();
        if (isBleStaleBondHardwareError(error)) {
          throw error;
        }
        lastError = error;
        if (attempt < PROTOCOL_V2_FILE_TRANSFER_RETRY_COUNT) {
          await this.recoverProtocolV2FileTransfer();
          this.throwIfAborted();
        }
      }
    }
    const causeCode = getProtocolV2ErrorCode(lastError);
    throw ERRORS.TypedError(
      HardwareErrorCode.EmmcFileWriteFirmwareError,
      `transfer data error: ${getProtocolV2UnknownErrorText(lastError)}`,
      causeCode === undefined ? undefined : { causeCode }
    );
  }

  private getProtocolV2InstallItemStagingPath(item: Pick<ProtocolV2InstallItem, 'fileName'>) {
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

  private collectProtocolV2LiveTargetIds(
    statusTargets: ProtocolV2FirmwareUpdateStatusTarget[],
    expectedTargetIds: Set<number>,
    liveTargetIds: Set<number>
  ) {
    statusTargets.forEach(target => {
      const targetId = normalizeProtocolV2TargetId(target.target_id);
      if (
        targetId !== undefined &&
        expectedTargetIds.has(targetId) &&
        isProtocolV2TargetStatusInProgress(target.status)
      ) {
        liveTargetIds.add(targetId);
      }
    });
  }

  private assertProtocolV2TargetStatus(
    statusTargets: ProtocolV2FirmwareUpdateStatusTarget[],
    expectedTargetIds: Set<number>,
    expectedPaths?: Map<number, string>,
    liveTargetIds?: Set<number>
  ) {
    const resolvedExpectedPaths = expectedPaths ?? new Map<number, string>();
    Log.log(
      `[FirmwareUpdateV4] DeviceFirmwareUpdateStatus records=${JSON.stringify(statusTargets)}`
    );
    const failedTarget = statusTargets.find(target => {
      const targetId = normalizeProtocolV2TargetId(target.target_id) ?? -1;
      return (
        expectedTargetIds.has(targetId) &&
        isProtocolV2TargetStatusFailed(target.status) &&
        (!liveTargetIds || liveTargetIds.has(targetId))
      );
    });
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
        'Protocol V2 firmware install failed',
        {
          firmwareUpdateCode: PROTOCOL_V2_INSTALL_FAILED_CODE,
        }
      );
    }
    if (liveTargetIds) {
      const staleFailedTargets = statusTargets.filter(target => {
        const targetId = normalizeProtocolV2TargetId(target.target_id) ?? -1;
        return (
          expectedTargetIds.has(targetId) &&
          isProtocolV2TargetStatusFailed(target.status) &&
          !liveTargetIds.has(targetId)
        );
      });
      if (staleFailedTargets.length > 0) {
        Log.log(
          `[FirmwareUpdateV4] ignoring stale failed firmware status until those targets start: ${JSON.stringify(
            staleFailedTargets.map(target => ({
              targetId: target.target_id,
              status: target.status,
              path: target.path,
            }))
          )}`
        );
      }
    }

    const matchingTargets = statusTargets.filter(target =>
      expectedTargetIds.has(normalizeProtocolV2TargetId(target.target_id) ?? -1)
    );
    const seenTargetIds = new Set<number>();
    for (const target of matchingTargets) {
      const targetId = normalizeProtocolV2TargetId(target.target_id);
      const pathConflictsWithCurrentInstall =
        targetId !== undefined &&
        Boolean(target.path) &&
        Boolean(resolvedExpectedPaths.get(targetId)) &&
        target.path !== resolvedExpectedPaths.get(targetId) &&
        (!liveTargetIds || liveTargetIds.has(targetId));
      if (
        targetId === undefined ||
        seenTargetIds.has(targetId) ||
        pathConflictsWithCurrentInstall
      ) {
        Log.error(`[FirmwareUpdateV4] install status conflicts with target=${target.target_id}`);
        throw ERRORS.TypedError(
          HardwareErrorCode.FirmwareError,
          'Protocol V2 firmware install status conflict',
          {
            firmwareUpdateCode: PROTOCOL_V2_INSTALL_STATUS_CONFLICT_CODE,
          }
        );
      }
      seenTargetIds.add(targetId);
    }
    const completedTargets = matchingTargets.filter(target => {
      const targetId = normalizeProtocolV2TargetId(target.target_id);
      return (
        isProtocolV2TargetStatusFinished(target.status) &&
        (!liveTargetIds || (targetId !== undefined && liveTargetIds.has(targetId)))
      );
    });
    const completedTargetIds = new Set<number>();
    completedTargets.forEach(target => {
      const targetId = normalizeProtocolV2TargetId(target.target_id);
      if (targetId !== undefined) {
        completedTargetIds.add(targetId);
        this.protocolV2CompletedTargetIds.add(targetId);
      }
    });
    if (completedTargetIds.size === expectedTargetIds.size && expectedTargetIds.size > 0) {
      for (const target of completedTargets) {
        const targetId = normalizeProtocolV2TargetId(target.target_id);
        const payloadVersion = toProtocolV2FiniteNumber(target.payload_version);
        if (targetId === undefined) {
          throw ERRORS.TypedError(
            HardwareErrorCode.RuntimeError,
            'Protocol V2 completed target identity is invalid'
          );
        }
        const expectedVersion = this.getExpectedProtocolV2TargetVersion(targetId);
        if (expectedVersion !== undefined && payloadVersion !== undefined) {
          if (payloadVersion !== expectedVersion) {
            throw ERRORS.TypedError(
              HardwareErrorCode.FirmwareVerificationFailed,
              `Protocol V2 target ${targetId} reached payload version ${payloadVersion}, expected ${expectedVersion}`
            );
          }
        }
        if (payloadVersion !== undefined) {
          this.protocolV2CompletedTargetVersions.set(targetId, payloadVersion);
        }
      }
      this.postProgressMessage(100, 'installingFirmware');
      return true;
    }

    if (expectedTargetIds.size > 0 && matchingTargets.length > 0) {
      let detailedProgress = completedTargetIds.size * 100;
      let installProgressMetadata:
        | {
            installTargetId: number;
            installPhase: 'prepare' | 'install' | 'verify';
            installPhaseProgress: number;
          }
        | undefined;
      let hasInProgressTarget = false;
      matchingTargets.forEach(target => {
        const targetId = normalizeProtocolV2TargetId(target.target_id);
        if (
          targetId === undefined ||
          completedTargetIds.has(targetId) ||
          !isProtocolV2TargetStatusInProgress(target.status) ||
          (liveTargetIds && !liveTargetIds.has(targetId))
        ) {
          return;
        }
        hasInProgressTarget = true;
        detailedProgress += normalizeProtocolV2ProgressPercent(target.progress_percent) ?? 0;
        const installPhase = target.phase_info
          ? PROTOCOL_V2_INSTALL_PHASE_BY_DECODED_VALUE.get(target.phase_info.phase)
          : undefined;
        const installPhaseProgress = normalizeProtocolV2ProgressPercent(
          target.phase_info?.progress_percent
        );
        if (installPhase && installPhaseProgress !== undefined && !installProgressMetadata) {
          installProgressMetadata = {
            installTargetId: targetId,
            installPhase,
            installPhaseProgress,
          };
        }
      });
      const completedProgress = Math.floor(
        (completedTargetIds.size / expectedTargetIds.size) * 100
      );
      const reportedProgress = Math.floor(detailedProgress / expectedTargetIds.size);
      const progress = Math.min(
        99,
        Math.max(completedProgress, reportedProgress, hasInProgressTarget ? 1 : 0)
      );
      if (installProgressMetadata) {
        this.postProgressMessage(progress, 'installingFirmware', installProgressMetadata);
      } else {
        this.postProgressMessage(progress, 'installingFirmware');
      }
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

  private getProtocolV2ObservableTargetVersions(features: Features) {
    const versions = new Map<number, string>();
    versions.set(
      ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_BOOTLOADER,
      getDeviceBootloaderVersion(features).join('.')
    );
    const applicationVersion = getDeviceFirmwareVersion(features).join('.');
    versions.set(ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_APPLICATION_P1, applicationVersion);
    versions.set(ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_APPLICATION_P2, applicationVersion);
    versions.set(
      ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_COPROCESSOR,
      getDeviceBLEFirmwareVersion(features).join('.')
    );
    const secureElementVersions: Array<[number, string | null | undefined]> = [
      [ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE01, features.se01Version],
      [ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE02, features.se02Version],
      [ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE03, features.se03Version],
      [ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE04, features.se04Version],
    ];
    secureElementVersions.forEach(([targetId, version]) => {
      if (version) versions.set(targetId, version);
    });
    return versions;
  }

  private hasProtocolV2InstallVersionChanged(expectedTargetIds: Set<number>) {
    if (!this.protocolV2LastRuntimeProbeFeatures) return false;
    const currentVersions = this.getProtocolV2ObservableTargetVersions(
      this.protocolV2LastRuntimeProbeFeatures
    );
    return Array.from(expectedTargetIds).some(targetId => {
      const previousVersion = this.protocolV2InstallBaselineVersions.get(targetId);
      const currentVersion = currentVersions.get(targetId);
      return (
        previousVersion !== undefined &&
        currentVersion !== undefined &&
        previousVersion !== currentVersion
      );
    });
  }

  private recordProtocolV2AuthoritativeInstallCompletion(expectedTargetIds: Set<number>) {
    expectedTargetIds.forEach(targetId => this.protocolV2CompletedTargetIds.add(targetId));
  }

  private async waitForProtocolV2FirmwareUpdateComplete(
    targets: Array<{ target_id: number; path: string }>,
    requireCurrentInstallStatus = false
  ) {
    const expectedTargetIds = new Set(targets.map(target => target.target_id));
    const expectedPaths = new Map(targets.map(target => [target.target_id, target.path]));
    const isBleInstall = this.isBleReconnect();
    const startTime = Date.now();
    let lastError: unknown;
    // The loader may release either USB or BLE as installation starts. Recovery reconnects
    // directly to status polling without generic Ping or DeviceInfo probes.
    let shouldReconnect = this.protocolV2InstallNeedsReconnect;
    this.protocolV2InstallNeedsReconnect = false;
    let deviceInfo: ProtocolV2DeviceInfo | undefined;
    let bleInstallLinkReady = false;
    let installStatusDisconnectObserved = isBleInstall && this.protocolV2InstallDisconnectObserved;
    this.protocolV2InstallDisconnectObserved = false;
    let installReconnectObserved = false;
    let finishedStatusSnapshotKey: string | undefined;
    let finishedStatusSnapshotPolls = 0;
    let fastFinishedInstallProgressReported = false;
    let installEvidenceObserved = this.protocolV2InstallTerminalSuccessObserved;
    let currentInstallStatusObserved = false;
    const liveTargetIds = new Set<number>();
    const recordBleInstallDisconnect = (error: unknown) => {
      if (
        !isBleInstall ||
        !isProtocolV2DeviceDisconnectedError(error) ||
        isProtocolV2InstallResponseTimeout(error)
      ) {
        return;
      }
      installStatusDisconnectObserved = true;
      installReconnectObserved = false;
      finishedStatusSnapshotKey = undefined;
      finishedStatusSnapshotPolls = 0;
    };

    while (Date.now() - startTime < PROTOCOL_V2_INSTALL_TIMEOUT) {
      // A transport release caused by an explicit workflow cancellation must not
      // be mistaken for the expected device reboot during installation.
      this.throwIfAborted();
      try {
        if (shouldReconnect) {
          const isBleInstallReconnect = this.isBleReconnect();
          await this.reconnectProtocolV2Device({ skipProtocolProbe: true });
          bleInstallLinkReady = isBleInstallReconnect;
          deviceInfo = isBleInstallReconnect
            ? undefined
            : await this.verifyProtocolV2ReconnectIdentity();
          if (isBleInstallReconnect && installStatusDisconnectObserved) {
            installReconnectObserved = true;
          }
          shouldReconnect = false;
        }
        let currentDeviceInfo = deviceInfo;
        try {
          const statusResponse = await this.device.getCommands().typedCall(
            'DeviceFirmwareUpdateStatusGet',
            'DeviceFirmwareUpdateStatus',
            {
              fields: {
                status: true,
                progress_percent: true,
                phase_info: true,
                payload_version: true,
                path: true,
              },
            },
            { timeoutMs: PROTOCOL_V2_FIRMWARE_STATUS_RESPONSE_TIMEOUT }
          );
          if (this.protocolV2InstallTerminalSuccessObserved) {
            installEvidenceObserved = true;
          }
          const statusTargets = (statusResponse.message.records ??
            []) as ProtocolV2FirmwareUpdateStatusTarget[];
          this.collectProtocolV2LiveTargetIds(statusTargets, expectedTargetIds, liveTargetIds);
          if (liveTargetIds.size > 0) {
            currentInstallStatusObserved = true;
          }
          const hasMatchingTargetStatus = statusTargets.some(target => {
            const targetId = normalizeProtocolV2TargetId(target.target_id);
            return targetId !== undefined && expectedTargetIds.has(targetId);
          });
          if (
            hasMatchingTargetStatus &&
            (!requireCurrentInstallStatus || currentInstallStatusObserved)
          ) {
            installEvidenceObserved = true;
          }
          const matchingStatusTargets = statusTargets.filter(target => {
            const targetId = normalizeProtocolV2TargetId(target.target_id);
            return targetId !== undefined && expectedTargetIds.has(targetId);
          });
          const matchingFinishedTargetIds = new Set<number>();
          const matchingFinishedStatus = matchingStatusTargets
            .map(target => {
              const targetId = normalizeProtocolV2TargetId(target.target_id);
              const expectedPath = targetId === undefined ? undefined : expectedPaths.get(targetId);
              const expectedVersion =
                targetId === undefined
                  ? undefined
                  : this.getExpectedProtocolV2TargetVersion(targetId);
              const payloadVersion = toProtocolV2FiniteNumber(target.payload_version);
              if (
                targetId === undefined ||
                matchingFinishedTargetIds.has(targetId) ||
                !isProtocolV2TargetStatusFinished(target.status) ||
                (Boolean(target.path) && Boolean(expectedPath) && target.path !== expectedPath) ||
                (expectedVersion !== undefined &&
                  payloadVersion !== undefined &&
                  payloadVersion !== expectedVersion)
              ) {
                return undefined;
              }
              matchingFinishedTargetIds.add(targetId);
              return [targetId, target.path ?? null, payloadVersion ?? null] as const;
            })
            .filter((target): target is readonly [number, string | null, number | null] => !!target)
            .sort(([leftTargetId], [rightTargetId]) => leftTargetId - rightTargetId);
          const hasCompleteMatchingFinishedStatus =
            matchingFinishedStatus.length === expectedTargetIds.size &&
            matchingFinishedTargetIds.size === expectedTargetIds.size &&
            expectedTargetIds.size > 0;
          if (
            requireCurrentInstallStatus &&
            installReconnectObserved &&
            hasCompleteMatchingFinishedStatus
          ) {
            const nextSnapshotKey = JSON.stringify(matchingFinishedStatus);
            if (nextSnapshotKey === finishedStatusSnapshotKey) {
              finishedStatusSnapshotPolls += 1;
            } else {
              finishedStatusSnapshotKey = nextSnapshotKey;
              finishedStatusSnapshotPolls = 1;
            }
          } else {
            finishedStatusSnapshotKey = undefined;
            finishedStatusSnapshotPolls = 0;
          }
          if (
            requireCurrentInstallStatus &&
            installReconnectObserved &&
            hasCompleteMatchingFinishedStatus &&
            !currentInstallStatusObserved &&
            !this.protocolV2InstallTerminalSuccessObserved &&
            !fastFinishedInstallProgressReported
          ) {
            // A fast BLE install may finish while disconnected, so IN_PROGRESS can be hidden.
            // A status response timeout alone is not evidence that the install was accepted.
            this.postProgressMessage(1, 'installingFirmware');
            fastFinishedInstallProgressReported = true;
          }
          const finishedAfterDisconnectObserved =
            finishedStatusSnapshotPolls >= PROTOCOL_V2_INSTALL_FINISHED_AFTER_DISCONNECT_POLLS;
          const hasCurrentInstallEvidence =
            currentInstallStatusObserved ||
            this.protocolV2InstallTerminalSuccessObserved ||
            finishedAfterDisconnectObserved;
          if (hasCurrentInstallEvidence) {
            installEvidenceObserved = true;
          }
          const shouldVerifyTargetCompletion =
            !requireCurrentInstallStatus || hasCurrentInstallEvidence;
          if (
            shouldVerifyTargetCompletion &&
            this.assertProtocolV2TargetStatus(
              statusTargets,
              expectedTargetIds,
              expectedPaths,
              requireCurrentInstallStatus &&
                !this.protocolV2InstallTerminalSuccessObserved &&
                !finishedAfterDisconnectObserved
                ? liveTargetIds
                : undefined
            )
          ) {
            return;
          }

          if (!hasCurrentInstallEvidence) {
            // A successful status poll clears DeviceCommands' cancel action. Keep cancellation
            // available while UpdateRequest is still waiting for confirmation on the device.
            // Bootloader does not register the protocol Cancel message. Keep the
            // operation locally cancellable; interruptionFromUser() disposes the link.
            this.device.setCancelableAction(() => Promise.resolve());
          }

          if (
            requireCurrentInstallStatus &&
            !hasCurrentInstallEvidence &&
            matchingStatusTargets.length > 0
          ) {
            lastError = new Error(
              'Protocol V2 firmware status is stale; waiting for the current install to start'
            );
          }

          if (
            statusTargets.length === 0 &&
            !currentDeviceInfo &&
            bleInstallLinkReady &&
            installEvidenceObserved
          ) {
            // BLE install reconnect skips generic probes because loaders may not answer Ping.
            // Restore the verified identity only after current-install evidence disappears.
            currentDeviceInfo = await this.verifyProtocolV2ReconnectIdentity();
            deviceInfo = currentDeviceInfo;
          }

          if (statusTargets.length === 0 && currentDeviceInfo) {
            const isNormalMode = await this.probeProtocolV2NormalMode(currentDeviceInfo);
            if (
              isNormalMode &&
              (installEvidenceObserved ||
                this.hasProtocolV2InstallVersionChanged(expectedTargetIds))
            ) {
              Log.log(
                '[FirmwareUpdateV4] empty firmware status after confirmed App reboot; update complete'
              );
              this.recordProtocolV2AuthoritativeInstallCompletion(expectedTargetIds);
              this.postProgressMessage(100, 'installingFirmware');
              return;
            }
          }

          if (statusTargets.length === 0) {
            lastError = new Error(
              'Protocol V2 firmware update is waiting for user confirmation or target status'
            );
          } else {
            const missingTargetIds = this.getProtocolV2MissingTargetIds(
              statusTargets,
              expectedTargetIds
            );
            if (missingTargetIds.length > 0) {
              const missingKey = missingTargetIds.join(',');
              lastError = new Error(
                `Protocol V2 firmware status is temporarily missing targetIds=${missingKey}`
              );
            } else {
              lastError = new Error('Protocol V2 firmware targets are still installing');
            }
          }
        } catch (error) {
          if (isProtocolV2TerminalInstallStatusError(error)) {
            throw error;
          }
          // App firmware does not register DeviceFirmwareUpdateStatusGet. Treat the
          // missing endpoint as completion only after the runtime probe confirms App mode.
          if (isProtocolV2FirmwareStatusEndpointUnavailable(error)) {
            if (!currentDeviceInfo) {
              if (!bleInstallLinkReady) {
                throw ERRORS.TypedError(
                  HardwareErrorCode.RuntimeError,
                  'Protocol V2 device identity is unavailable during install polling'
                );
              }
              deviceInfo = await this.verifyProtocolV2ReconnectIdentity();
            }
            const reconnectDeviceInfo = currentDeviceInfo ?? deviceInfo;
            if (!reconnectDeviceInfo) {
              throw ERRORS.TypedError(
                HardwareErrorCode.RuntimeError,
                'Protocol V2 device identity is unavailable during install polling'
              );
            }
            const isNormalMode = await this.probeProtocolV2NormalMode(reconnectDeviceInfo);
            if (
              isNormalMode &&
              (installEvidenceObserved ||
                this.hasProtocolV2InstallVersionChanged(expectedTargetIds))
            ) {
              Log.log(
                '[FirmwareUpdateV4] firmware status endpoint unavailable after confirmed App reboot'
              );
              this.recordProtocolV2AuthoritativeInstallCompletion(expectedTargetIds);
              this.postProgressMessage(100, 'installingFirmware');
              return;
            }
            if (isNormalMode) {
              lastError = new Error(
                'Protocol V2 device is in normal mode but installation is not yet confirmed'
              );
            } else {
              lastError = new Error(
                'Protocol V2 firmware status endpoint is unavailable while the device remains in loader mode'
              );
            }
          } else {
            recordBleInstallDisconnect(error);
            shouldReconnect = true;
            deviceInfo = undefined;
            bleInstallLinkReady = false;
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
        if (isProtocolV2TerminalInstallStatusError(error)) {
          throw error;
        }
        if (
          error instanceof HardwareError &&
          error.params?.firmwareUpdateCode === 'FirmwareInstallStatusUnavailable'
        ) {
          throw error;
        }
        recordBleInstallDisconnect(error);
        shouldReconnect = true;
        deviceInfo = undefined;
        bleInstallLinkReady = false;
        Log.log('Protocol V2 firmware install device readiness probe failed: ', error);
      }
      await wait(1000);
    }

    Log.error(
      `[FirmwareUpdateV4] install timed out after ${
        PROTOCOL_V2_INSTALL_TIMEOUT / 1000
      }s: ${this.normalizeErrorMessage(lastError)}`
    );
    throw ERRORS.TypedError(
      HardwareErrorCode.FirmwareError,
      'Protocol V2 firmware install timed out',
      {
        firmwareUpdateCode: PROTOCOL_V2_INSTALL_TIMEOUT_CODE,
      }
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
      if (isBleStaleBondHardwareError(error)) {
        throw error;
      }
      Log.log('[FirmwareUpdateV4] unable to confirm App mode before Normal reboot: ', error);
    }
    await this.protocolV2Reboot(DeviceRebootType.Normal);
    this.protocolV2ExecutionInLoader = false;
  }

  private async probeProtocolV2NormalMode(deviceInfo: ProtocolV2DeviceInfo) {
    const features = await this.device.probeProtocolV2RuntimeState(
      deviceInfo,
      PROTOCOL_V2_SHORT_RESPONSE_TIMEOUT
    );
    this.protocolV2LastRuntimeProbeFeatures = features;
    return this.isProtocolV2ApplicationMode(features);
  }

  private isProtocolV2ApplicationMode(features: Features) {
    return (
      (features.mode === 'normal' || features.mode === 'notInitialized') && !features.bootloaderMode
    );
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
    this.protocolV2LatestFinalFeatures = features;
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

  private async completeProtocolV2FinalVerification() {
    if (this.protocolV2ExecutionInLoader || this.isProtocolV2BootloaderMode()) {
      await this.exitProtocolV2BootloaderToNormal();
    }
    const versions = await this.waitForProtocolV2FinalFeatures();
    this.assertExpectedProtocolV2Versions();
    this.postTipMessage(FirmwareUpdateTipMessage.FirmwareUpdateCompleted);
    DevicePool.resetState();
    return versions;
  }

  private async waitForProtocolV2ReconnectAndFeatures(timeout: number) {
    const startTime = Date.now();
    let lastError: unknown;
    let shouldReconnect = true;
    this.protocolV2LatestFinalDeviceInfo = undefined;

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
          PROTOCOL_V2_SHORT_RESPONSE_TIMEOUT,
          { forceRuntimeContextRefresh: true }
        );
        if (this.isProtocolV2ApplicationMode(features)) {
          this.protocolV2LatestFinalDeviceInfo = deviceInfo;
          return features;
        }
        lastError = ERRORS.TypedError(
          HardwareErrorCode.DeviceNotFound,
          'Protocol V2 device is still in bootloader mode'
        );
      } catch (error) {
        if (isBleStaleBondHardwareError(error) || this.isProtocolV2ReconnectIdentityError(error)) {
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

  private async reconnectProtocolV2Device(options?: { skipProtocolProbe?: boolean }) {
    if (this.isBleReconnect()) {
      await this.acquireProtocolV2BleDevice(options?.skipProtocolProbe);
      return;
    }

    const deviceDiff = await this.device.deviceConnector?.enumerate();
    const devicesDescriptor = deviceDiff?.descriptors ?? [];
    const env = DataManager.getSettings('env');
    const isWebUsb = DataManager.isBrowserWebUsb(env) || DataManager.isDesktopWebUsb(env);

    if (isWebUsb && options?.skipProtocolProbe) {
      const expectedSerialNumber = this.protocolV2ExpectedSerialNumber?.trim();
      const expectedPath = this.protocolV2ExpectedPath?.trim();
      const reconnectDescriptor = devicesDescriptor.find(descriptor => {
        const descriptorPath = descriptor.path?.trim();
        return (
          (!!expectedSerialNumber && descriptorPath === expectedSerialNumber) ||
          (!!expectedPath && descriptorPath === expectedPath)
        );
      });
      if (!reconnectDescriptor?.path) {
        throw ERRORS.TypedError(HardwareErrorCode.DeviceNotFound);
      }
      this.device.updateDescriptor(
        {
          ...reconnectDescriptor,
          protocolType: PROTOCOL_V2_CONNECT_PROTOCOL,
        },
        true
      );
      const mainId = await this.device.deviceConnector?.acquire(
        reconnectDescriptor.path,
        null,
        undefined,
        PROTOCOL_V2_CONNECT_PROTOCOL,
        undefined,
        undefined,
        true
      );
      this.device.mainId = typeof mainId === 'string' ? mainId : reconnectDescriptor.path;
      this.device.commands.disposed = false;
      this.device.getCommands().mainId = this.device.mainId;
      return;
    }

    if (isWebUsb && devicesDescriptor.length === 1) {
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
    // A serial can be temporarily unavailable while Loader starts, and BLE has no stable path.
    // Keep polling unless the device explicitly reports a different serial.
    return this.normalizeErrorMessage(error).includes(
      'Protocol V2 reconnect physical identity mismatch'
    );
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
    const writeRes = await typedCall(
      'FilesystemFileWrite',
      'FilesystemFile',
      {
        file: {
          path: filePath,
          offset,
          total_size: totalFileSize,
          data: chunk,
        },
        overwrite,
        append: false,
        ui_percentage: progress ?? undefined,
      },
      {
        writeWithResponse: false,
        onWriteCompleted: () => undefined,
      }
    );
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
    }
    await this.reconnectProtocolV2Device();
    await this.verifyProtocolV2ReconnectIdentity();
    await this.device.initialize();
    await wait(2000);
  }

  private async acquireProtocolV2BleDevice(skipProtocolProbe = false) {
    const connector = this.device.deviceConnector;
    const expectedId = this.device.originalDescriptor.id;
    if (!skipProtocolProbe) {
      await connector?.acquire(expectedId, null, true, PROTOCOL_V2_CONNECT_PROTOCOL);
      return;
    }
    await connector?.acquire(
      expectedId,
      null,
      true,
      PROTOCOL_V2_CONNECT_PROTOCOL,
      undefined,
      undefined,
      skipProtocolProbe
    );
    this.device.commands.disposed = false;
    this.device.getCommands().mainId = expectedId;
  }

  private async protocolV2StartFirmwareUpdate({
    targets,
  }: {
    targets: Array<{ target_id: number; path: string }>;
  }) {
    this.protocolV2LastRuntimeProbeFeatures = undefined;
    this.protocolV2InstallNeedsReconnect = false;
    this.protocolV2InstallDisconnectObserved = false;
    this.protocolV2InstallTerminalSuccessObserved = false;
    const commands = this.device.getCommands();
    await commands.typedCall('DeviceFirmwareUpdateStage', 'Success', { targets });
    // Bootloader does not register the protocol Cancel message. Keep the
    // operation locally cancellable; interruptionFromUser() disposes the link.
    this.device.setCancelableAction(() => Promise.resolve());
    const interaction = this.device.createProtocolV2UiPhaseMetadata('button', 'start');
    this.postMessage(
      createUiMessage(UI_REQUEST.REQUEST_BUTTON, {
        device: this.device.toMessageObject() as KnownDevice,
        source: 'method-lifecycle',
        reason: 'firmware-update',
        completion: 'operation-completed',
        deviceOnly: true,
        operation: this.name,
        ...(interaction ? { interaction } : {}),
      })
    );

    try {
      await commands.call(
        'DeviceFirmwareUpdateRequest',
        {},
        {
          returnAfterWrite: true,
          expectedTypes: ['Success'],
          onResponseAfterWrite: response => {
            if (response.type !== 'Success') return;
            this.protocolV2InstallTerminalSuccessObserved = true;
            this.device.clearCancelableAction();
            Log.log('[FirmwareUpdateV4] firmware install completed by device response');
          },
        }
      );
      Log.log('[FirmwareUpdateV4] firmware install request written; continue with status polling');
    } catch (error) {
      this.throwIfAborted();
      if (!isProtocolV2DeviceDisconnectedError(error)) {
        throw error;
      }
      Log.log(
        '[FirmwareUpdateV4] transport released while writing install request; continue status polling'
      );
      this.protocolV2InstallNeedsReconnect = true;
      this.protocolV2InstallDisconnectObserved = !isProtocolV2InstallResponseTimeout(error);
    }
  }

  private async protocolV2Reboot(rebootType: DeviceRebootType) {
    const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());
    try {
      const res = await typedCall(
        'DeviceReboot',
        'Success',
        {
          reboot_type: rebootType,
        },
        { timeoutMs: PROTOCOL_V2_SHORT_RESPONSE_TIMEOUT }
      );
      this.device.markProtocolV2Reboot(rebootType);
      return res.message;
    } catch (error) {
      if (
        isProtocolV2DeviceDisconnectedError(error) ||
        isProtocolV2ReconnectProbeError(error) ||
        isProtocolV2ResponseTimeout(error)
      ) {
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
