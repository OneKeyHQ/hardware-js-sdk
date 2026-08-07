import { EDeviceType, ERRORS, HardwareError, HardwareErrorCode, wait } from '@onekeyfe/hd-shared';
import {
  DeviceRebootType,
  PROTOCOL_V2_BLE_FILE_READ_CHUNK_SIZE,
  PROTOCOL_V2_BLE_FILE_CHUNK_SIZE,
  PROTOCOL_V2_BLE_FIRMWARE_FILE_CHUNK_SIZE,
  PROTOCOL_V2_WEBUSB_FILE_CHUNK_SIZE,
} from '@onekeyfe/hd-transport';
import { sha256 } from '@noble/hashes/sha256';

import { FirmwareUpdateTipMessage, UI_REQUEST } from '../events/ui-request';
import { validateProtocolV2FilesystemPath } from './helpers/filesystemValidation';
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
  PROTOCOL_V2_RESOURCE_DEVICE_PATHS,
  buildProtocolV2ResourceUpdatePlan,
  isProtocolV2ResourceFileValid,
  readProtocolV2ResourceInventory,
} from '../protocols/protocol-v2/resources';
import {
  getProtocolV2UnknownErrorText,
  isProtocolV2DeviceDisconnectedError,
} from './protocol-v2/helpers';
import { openFirmwareByteSource, writeFirmwareByteSource } from './firmware/FirmwareArtifactSource';
import { resolveFirmwareUpdateHostBinding } from './firmware/FirmwareHostBinding';
import {
  assertFirmwareUpdatePreparedPlanBinding,
  assertFirmwareUpdatePreparedPlanDeviceIdentity,
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
  IProtocolV2Resource,
  IProtocolV2ResourceFile,
  IVersionArray,
} from '../types';
import type { FirmwareByteSource } from './firmware/FirmwareArtifactSource';

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
const PROTOCOL_V2_INSTALL_STATUS_CONFLICT_CODE = 'FirmwareInstallStatusConflict';
const PROTOCOL_V2_OKPP_HEADER_SIZE = 0x52a0;
const PROTOCOL_V2_OKPP_PAYLOAD_HASH_OFFSET = 0x200;
const PROTOCOL_V2_OKPP_HEADER_HASH_OFFSET = 0x240;
const PROTOCOL_V2_OKPP_HASH_SIZE = 64;

const PROTOCOL_V2_NEO_UNSUPPORTED_TARGETS = new Set<FirmwareUpdateV4Target>(['se03', 'se04']);

export function assertProtocolV2FirmwareTargetsSupported(
  deviceType: EDeviceType | string | undefined,
  params: FirmwareUpdateV4Params
) {
  const unsupportedTargets = new Set(
    (params.targetsToUpdate ?? []).filter(target => PROTOCOL_V2_NEO_UNSUPPORTED_TARGETS.has(target))
  );
  if (params.se03Binary) unsupportedTargets.add('se03');
  if (params.se04Binary) unsupportedTargets.add('se04');

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

type ProtocolV2TargetBinary = { fileName: string; binary: ArrayBuffer; targetId: number };
type ProtocolV2InstallItem = ProtocolV2TargetBinary & {
  kind: ProtocolV2RemoteComponentTarget['kind'];
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

type ProtocolV2ExecutionPhaseKind =
  | 'resource-sync'
  | 'bootloader-install'
  | 'bootloader-verify'
  | 'component-install'
  | 'final-verify';

type ProtocolV2ExecutionPhase = {
  kind: ProtocolV2ExecutionPhaseKind;
  installSources: ProtocolV2InstallSource[];
  resourceSources: ProtocolV2ResourceBundleSource[];
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

const PROTOCOL_V2_FIRMWARE_STAGING_PATHS = new Set(
  Object.values(PROTOCOL_V2_REMOTE_COMPONENT_TARGETS).map(
    target => `${PROTOCOL_V2_FIRMWARE_STAGING_VOLUME}${target.fileName}`
  )
);

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

const isProtocolV2TerminalInstallStatusError = (error: unknown) =>
  error instanceof HardwareError &&
  (error.errorCode === HardwareErrorCode.FirmwareError ||
    error.errorCode === HardwareErrorCode.FirmwareVerificationFailed ||
    error.params?.firmwareUpdateCode === PROTOCOL_V2_INSTALL_STATUS_CONFLICT_CODE);

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

  private protocolV2PreparedSources: FirmwareByteSource[] = [];

  private protocolV2ExecutionInLoader = false;

  private protocolV2CompletedTargetVersions = new Map<number, number>();

  private protocolV2LatestFinalFeatures?: Features;

  private protocolV2FinalStatusVerified = false;

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
      { name: 'expectedDeviceId', type: 'string' },
      { name: 'resourceFiles', type: 'array', allowEmpty: true },
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
    const hostBinding =
      payload.preparedPlan || payload.componentArtifacts || payload.resourceBundleArtifacts
        ? resolveFirmwareUpdateHostBinding(payload.hostBindingGeneration)
        : undefined;
    if (hostBinding) {
      assertFirmwareUpdatePreparedPlanBinding({
        preparedPlan: payload.preparedPlan,
        executor: 'v4',
        platform: payload.platform,
        scopeTargets: [
          'boot',
          'app_v1',
          'app_v2',
          'coprocessor',
          'resource',
          'se01',
          'se02',
          'se03',
          'se04',
        ],
        bindings: [
          ...Object.entries(payload.componentArtifacts ?? {}).flatMap(([target, artifact]) =>
            artifact
              ? [
                  {
                    target: target as Exclude<FirmwareUpdateV4Target, 'resource'>,
                    artifact,
                  },
                ]
              : []
          ),
          ...(payload.resourceBundleArtifacts ?? []).map(
            (entry: { name: string; artifact: FirmwareArtifactReference }) => ({
              target: 'resource' as const,
              logicalName: entry.name,
              artifact: entry.artifact,
            })
          ),
        ],
      });
    }

    this.params = {
      preparedPlan: payload.preparedPlan,
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
      expectedTargetVersions: payload.expectedTargetVersions,
      platform: payload.platform,
      expectedDeviceId: payload.expectedDeviceId,
      artifactReader: hostBinding?.artifactReader ?? payload.artifactReader,
      componentArtifacts: payload.componentArtifacts,
      resourceBundleArtifacts: payload.resourceBundleArtifacts,
    };
  }

  private getProtocolV2FirmwareChunkSize(direction: 'read' | 'write' = 'write', filePath?: string) {
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
    const currentDeviceType = this.device.getCurrentDeviceType();
    const capabilityDeviceType =
      currentDeviceType === EDeviceType.Pro2 || currentDeviceType === EDeviceType.Neo
        ? currentDeviceType
        : getDeviceType(deviceFeatures);
    assertProtocolV2FirmwareTargetsSupported(capabilityDeviceType, this.params);
    const deviceFirmwareType = getFirmwareType(deviceFeatures);
    const firmwareType = this.params.firmwareType ?? deviceFirmwareType;
    this.validateExpectedTargetVersions();

    if (
      (this.params.componentArtifacts && Object.keys(this.params.componentArtifacts).length > 0) ||
      this.params.resourceBundleArtifacts?.length
    ) {
      return this.runProtocolV2PreparedArtifacts(deviceFeatures, firmwareType);
    }
    const hasExplicitResourceFiles = !!this.params.resourceFiles?.length;
    const wantsStableResources = !!this.params.targetsToUpdate?.includes('resource');
    const wantsBootResources = !!this.params.targetsToUpdate?.includes('boot_resources');
    const needsRemoteResources = !hasExplicitResourceFiles && wantsStableResources;
    const needsRemoteBootResources =
      !hasExplicitResourceFiles && (wantsBootResources || wantsStableResources);

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
      if (
        (needsRemoteFirmware || needsRemoteResources || needsRemoteBootResources) &&
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
        resourceBundles = this.mergeProtocolV2ResourceBundles(resourceBundles, bootResourceFiles);
      }
      if (!needsRemoteResources) {
        this.postTipMessage(FirmwareUpdateTipMessage.FinishDownloadFirmware);
      }
    } catch (err) {
      if (err instanceof HardwareError && err.errorCode === HardwareErrorCode.NetworkError) {
        throw err;
      }
      throw normalizeFirmwarePreparationError(err);
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

    if (needsRemoteResources) {
      const enteredBootloader = await this.enterProtocolV2BootloaderMode();
      try {
        const stableResources = await this.prepareProtocolV2ResourceBundles();
        resourceBundles = this.mergeProtocolV2ResourceBundles(resourceBundles, stableResources);
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
        throw normalizeFirmwarePreparationError(err);
      }
    }

    return this.executeProtocolV2Update({
      fwBinaryMap,
      bootloaderBinary,
      ...(installItems ? { installItems } : undefined),
      ...(resourceBundles?.length ? { resourceBundles } : undefined),
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

  private async prepareProtocolV2ResourceSources(
    firmwareType: EFirmwareType,
    features: Features
  ): Promise<ProtocolV2ResourceBundleSource[]> {
    const preparedArtifacts = this.params.resourceBundleArtifacts ?? [];
    const resourceRequested =
      this.params.targetsToUpdate?.includes('resource') || preparedArtifacts.length > 0;
    if (!resourceRequested) {
      return [];
    }
    const release = DataManager.getFirmwareLatestRelease(features, firmwareType);
    const descriptors = release?.resourceBundles ?? [];
    const artifactByName = new Map(
      preparedArtifacts.map(item => [item.name, item.artifact] as const)
    );
    const sources: ProtocolV2ResourceBundleSource[] = [];
    for (const descriptor of descriptors) {
      const artifact = artifactByName.get(descriptor.name);
      if (!artifact) {
        throw ERRORS.TypedError(
          HardwareErrorCode.RuntimeError,
          `Protocol V2 resource bundle ${descriptor.name} is not prepared`,
          {
            firmwareUpdateCode: 'FirmwareArtifactsNotPrepared',
            artifactName: descriptor.name,
          }
        );
      }
      const devicePath = validateProtocolV2FilesystemPath(
        descriptor.devicePath,
        'resourceBundles[].devicePath'
      );
      sources.push({
        name: descriptor.name,
        source: await this.openProtocolV2PreparedSource(artifact),
        devicePath,
        version: descriptor.version,
        payloadHash: descriptor.payloadHash,
        headerHash: descriptor.headerHash,
      });
      artifactByName.delete(descriptor.name);
    }
    if (artifactByName.size > 0) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        `Protocol V2 release does not contain resource bundle ${artifactByName.keys().next().value}`
      );
    }
    return sources;
  }

  private async runProtocolV2PreparedArtifacts(features: Features, firmwareType: EFirmwareType) {
    try {
      this.postTipMessage(FirmwareUpdateTipMessage.StartDownloadFirmware);
      const installSources = await this.prepareProtocolV2InstallSources(firmwareType, features);
      const resourceSources = await this.prepareProtocolV2ResourceSources(firmwareType, features);
      if (installSources.length === 0 && resourceSources.length === 0) {
        throw ERRORS.TypedError(
          HardwareErrorCode.FirmwareUpdateDownloadFailed,
          'No firmware to update'
        );
      }
      this.postTipMessage(FirmwareUpdateTipMessage.FinishDownloadFirmware);

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
          target as FirmwareUpdateV4Target
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
    const requestedTargets = this.getProtocolV2RequestedTargets();
    const applicationTargets = requestedTargets.filter(
      target => target === 'app_v1' || target === 'app_v2'
    );
    const visibleVersions: Partial<Record<FirmwareUpdateV4Target, string>> = {
      boot: features ? getDeviceBootloaderVersion(features).join('.') : undefined,
      coprocessor: features ? getDeviceBLEFirmwareVersion(features).join('.') : undefined,
      se01: features?.se01Version ?? undefined,
      se02: features?.se02Version ?? undefined,
      se03: features?.se03Version ?? undefined,
      se04: features?.se04Version ?? undefined,
    };
    if (features && applicationTargets.length === 1) {
      visibleVersions[applicationTargets[0]] = getDeviceFirmwareVersion(features).join('.');
    }
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
        if (this.protocolV2FinalStatusVerified) {
          Log.warn(
            `Protocol V2 target ${target} has no observable final version; completed target status is authoritative`
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

  private getProtocolV2RequestedTargets(): FirmwareUpdateV4Target[] {
    if (this.params.targetsToUpdate?.length) {
      return [...new Set(this.params.targetsToUpdate)];
    }
    const targets = new Set<FirmwareUpdateV4Target>();
    Object.keys(this.params.componentArtifacts ?? {}).forEach(target =>
      targets.add(target as FirmwareUpdateV4Target)
    );
    if (this.params.resourceBundleArtifacts?.length || this.params.resourceFiles?.length) {
      targets.add('resource');
    }
    if (this.params.bootloaderBinary) targets.add('boot');
    if (this.params.applicationP1Binary) targets.add('app_v1');
    if (this.params.applicationP2Binary) targets.add('app_v2');
    if (this.params.coprocessorBinary) targets.add('coprocessor');
    if (this.params.se01Binary) targets.add('se01');
    if (this.params.se02Binary) targets.add('se02');
    if (this.params.se03Binary) targets.add('se03');
    if (this.params.se04Binary) targets.add('se04');
    return Array.from(targets);
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
    const path = this.device.originalDescriptor?.path?.trim() || undefined;
    if (this.params?.preparedPlan) {
      assertFirmwareUpdatePreparedPlanDeviceIdentity({
        preparedPlan: this.params.preparedPlan,
        deviceIdentity: serialNumber,
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
    const wantsStableResources = !!this.params.targetsToUpdate?.includes('resource');
    const wantsBootResources = !!this.params.targetsToUpdate?.includes('boot_resources');
    if (!wantsStableResources && !wantsBootResources) {
      return undefined;
    }
    if (this.params.resourceFiles?.length) {
      return undefined;
    }
    const resource = DataManager.getProtocolV2BootResources(this.getProtocolV2DeviceType());
    if (!resource) {
      if (wantsBootResources) {
        throw new Error('Missing Protocol V2 boot resources configuration');
      }
      Log.debug('[FirmwareUpdateV4] no boot resources configured; continue with stable resources');
      return undefined;
    }

    const files: ProtocolV2ResourceBundleBinary[] = [];
    for (const file of resource.files) {
      const isCurrent =
        !this.params.forcedUpdateRes && (await this.isProtocolV2BootResourceCurrent(file));
      if (isCurrent) {
        Log.log(`[FirmwareUpdateV4] boot resource unchanged, skipping ${file.devicePath}`);
      } else {
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
    }
    return files;
  }

  private async isProtocolV2BootResourceCurrent(file: IProtocolV2ResourceFile) {
    try {
      const commands = this.device.getCommands();
      const pathInfo = await commands.typedCall(
        'FilesystemPathInfoQuery',
        'FilesystemPathInfo',
        { path: file.devicePath },
        { timeoutMs: PROTOCOL_V2_SHORT_RESPONSE_TIMEOUT }
      );
      const size = toProtocolV2FiniteNumber(pathInfo.message?.size);
      if (
        !pathInfo.message?.exist ||
        pathInfo.message?.directory ||
        !Number.isSafeInteger(size) ||
        size !== file.size
      ) {
        return false;
      }

      const digest = sha256.create();
      const chunkSize = this.getProtocolV2FirmwareChunkSize();
      let offset = 0;
      while (offset < file.size) {
        const response = await commands.typedCall(
          'FilesystemFileRead',
          'FilesystemFile',
          {
            file: { path: file.devicePath, offset, total_size: 0 },
            chunk_len: Math.min(chunkSize, file.size - offset),
          },
          { timeoutMs: PROTOCOL_V2_SHORT_RESPONSE_TIMEOUT }
        );
        const data = toProtocolV2Bytes(response.message?.data);
        if (data.byteLength === 0) return false;
        const consumed = data.subarray(0, Math.min(data.byteLength, file.size - offset));
        digest.update(consumed);
        offset += consumed.byteLength;
      }
      return bytesToHex(digest.digest()) === normalizeProtocolV2Hex(file.fileHash);
    } catch (error) {
      Log.debug(
        `[FirmwareUpdateV4] unable to compare boot resource ${file.devicePath}; scheduling rewrite`,
        error
      );
      return false;
    }
  }

  private mergeProtocolV2ResourceBundles(
    ...groups: Array<ProtocolV2ResourceBundleBinary[] | undefined>
  ): ProtocolV2ResourceBundleBinary[] | undefined {
    const merged = groups.flatMap(group => group ?? []);
    if (!merged.length) return undefined;
    const seenPaths = new Set<string>();
    for (const bundle of merged) {
      if (seenPaths.has(bundle.devicePath)) {
        throw new Error(`Duplicate Protocol V2 resource devicePath: ${bundle.devicePath}`);
      }
      seenPaths.add(bundle.devicePath);
    }
    return merged;
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

    const chunkSize = this.getProtocolV2FirmwareChunkSize('read');
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

  /** Compare a prepared okpkg header when its manifest supplies version or hash metadata. */
  private async isProtocolV2ResourceBundleUpToDate(
    bundle: Pick<
      ProtocolV2ResourceBundleSource,
      'name' | 'devicePath' | 'version' | 'payloadHash' | 'headerHash'
    >
  ): Promise<boolean> {
    if (this.params?.forcedUpdateRes) return false;
    if (!bundle.version && !bundle.payloadHash) return false;

    try {
      const header = await this.readProtocolV2DeviceFileHeader(bundle.devicePath);
      if (!header) return false;

      if (bundle.version) {
        const cmp = compareProtocolV2Versions(header.version, bundle.version);
        if (cmp === undefined || cmp !== 0) return false;
      }
      if (bundle.payloadHash) {
        const expected = normalizeProtocolV2Hex(bundle.payloadHash);
        if (expected && header.payloadHash !== expected) return false;
      }
      if (bundle.headerHash) {
        const expected = normalizeProtocolV2Hex(bundle.headerHash);
        if (expected && header.headerHash !== expected) return false;
      }
      return true;
    } catch (error) {
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

  private buildProtocolV2ExecutionPhases({
    installSources,
    resourceSources,
  }: {
    installSources: ProtocolV2InstallSource[];
    resourceSources: ProtocolV2ResourceBundleSource[];
  }): ProtocolV2ExecutionPhase[] {
    const phases: ProtocolV2ExecutionPhase[] = [];
    if (resourceSources.length > 0) {
      phases.push({
        kind: 'resource-sync',
        installSources: [],
        resourceSources,
      });
    }
    const bootloaderSources = installSources.filter(source => source.kind === 'bootloader');
    if (bootloaderSources.length > 0) {
      phases.push(
        {
          kind: 'bootloader-install',
          installSources: bootloaderSources,
          resourceSources: [],
        },
        {
          kind: 'bootloader-verify',
          installSources: [],
          resourceSources: [],
        }
      );
    }
    const componentSources = installSources.filter(source => source.kind !== 'bootloader');
    if (componentSources.length > 0) {
      phases.push({
        kind: 'component-install',
        installSources: componentSources,
        resourceSources: [],
      });
    }
    phases.push({
      kind: 'final-verify',
      installSources: [],
      resourceSources: [],
    });
    return phases;
  }

  private async executeProtocolV2Phases({
    installSources,
    resourceSources,
  }: {
    installSources: ProtocolV2InstallSource[];
    resourceSources: ProtocolV2ResourceBundleSource[];
  }) {
    const phases = this.buildProtocolV2ExecutionPhases({
      installSources,
      resourceSources,
    });
    for (const phase of phases) {
      if (phase.kind === 'final-verify') {
        return this.completeProtocolV2FinalVerification();
      }
      if (phase.kind === 'resource-sync') {
        await this.enterProtocolV2BootloaderMode();
        await this.executeProtocolV2TransferPhase(phase);
      } else if (phase.kind === 'bootloader-install' || phase.kind === 'component-install') {
        await this.enterProtocolV2BootloaderMode();
        await this.executeProtocolV2TransferPhase(phase);
        await this.exitProtocolV2BootloaderToNormal();
      } else if (phase.kind === 'bootloader-verify') {
        await this.waitForProtocolV2FinalFeatures();
        this.assertExpectedProtocolV2Versions(['boot']);
      }
    }
    throw ERRORS.TypedError(
      HardwareErrorCode.RuntimeError,
      'Protocol V2 execution has no final verification phase'
    );
  }

  private async executeProtocolV2SourceUpdate({
    installSources,
    resourceSources,
  }: {
    installSources: ProtocolV2InstallSource[];
    resourceSources: ProtocolV2ResourceBundleSource[];
  }) {
    return this.executeProtocolV2Phases({
      installSources,
      resourceSources,
    });
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
      const resourceSources = await Promise.all(
        (resourceBundles ?? []).map(async bundle => ({
          name: bundle.name,
          source: await this.openProtocolV2MemorySource(bundle.binary),
          devicePath: bundle.devicePath,
        }))
      );
      return await this.executeProtocolV2Phases({
        installSources,
        resourceSources,
      });
    } finally {
      await this.closeProtocolV2PreparedSources();
    }
  }

  private async executeProtocolV2TransferPhase({
    installSources,
    resourceSources,
  }: ProtocolV2ExecutionPhase) {
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
    let processedSize = 0;
    for (const resource of resourcesToSync) {
      processedSize = await this.protocolV2SourceUpdateProcess({
        source: resource.source,
        filePath: resource.devicePath,
        processedSize,
        totalSize,
      });
      await this.verifyProtocolV2StagedFile(resource.devicePath, resource.source.size);
    }

    const stagedInstallTargets: Array<{ targetId: number; path: string }> = [];
    for (const item of installSources) {
      const filePath = this.getProtocolV2InstallItemStagingPath(item);
      processedSize = await this.protocolV2SourceUpdateProcess({
        source: item.source,
        filePath,
        processedSize,
        totalSize,
      });
      await this.verifyProtocolV2StagedFile(filePath, item.source.size);
      stagedInstallTargets.push({
        targetId: item.targetId,
        path: filePath,
      });
    }

    if (totalSize > 0) {
      this.postProgressMessage(100, 'transferData');
    }
    if (stagedInstallTargets.length === 0) {
      return;
    }

    this.postTipMessage(FirmwareUpdateTipMessage.ConfirmOnDevice);
    const targets = stagedInstallTargets.map(item => ({
      target_id: item.targetId,
      path: item.path,
    }));
    await this.protocolV2StartFirmwareUpdate({ targets });
    await this.waitForProtocolV2FirmwareUpdateComplete(targets);
  }

  private async protocolV2SourceUpdateProcess({
    source,
    filePath,
    processedSize,
    totalSize,
  }: {
    source: FirmwareByteSource;
    filePath: string;
    processedSize: number;
    totalSize: number;
  }) {
    let lastError: unknown;
    for (let attempt = 1; attempt <= PROTOCOL_V2_FILE_TRANSFER_RETRY_COUNT; attempt += 1) {
      try {
        const transferStartedAt = Date.now();
        await writeFirmwareByteSource({
          source,
          chunkSize: this.getProtocolV2FirmwareChunkSize('write', filePath),
          write: async ({ data, sourceOffset, length, first }) => {
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
            const elapsedMs = Math.max(Date.now() - transferStartedAt, 0);
            this.postProgressMessage(
              Math.min(Math.ceil((transferredBytes / totalSize) * 100), 99),
              'transferData',
              {
                transferredBytes,
                totalBytes: totalSize,
                rateBytesPerSecond:
                  elapsedMs > 0 ? Math.round((chunkEnd / elapsedMs) * 1000) : undefined,
                elapsedMs,
              }
            );
            return length;
          },
        });
        return processedSize + source.size;
      } catch (error) {
        lastError = error;
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

  private assertProtocolV2TargetStatus(
    statusTargets: ProtocolV2FirmwareUpdateStatusTarget[],
    expectedTargetIds: Set<number>,
    expectedPaths = new Map<number, string>()
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
    const seenTargetIds = new Set<number>();
    for (const target of matchingTargets) {
      const targetId = normalizeProtocolV2TargetId(target.target_id);
      if (
        targetId === undefined ||
        seenTargetIds.has(targetId) ||
        (target.path && expectedPaths.get(targetId) && target.path !== expectedPaths.get(targetId))
      ) {
        throw ERRORS.TypedError(
          HardwareErrorCode.RuntimeError,
          `Protocol V2 install status conflicts with target ${target.target_id}`,
          {
            firmwareUpdateCode: PROTOCOL_V2_INSTALL_STATUS_CONFLICT_CODE,
          }
        );
      }
      seenTargetIds.add(targetId);
    }
    const completedTargets = matchingTargets.filter(target =>
      isProtocolV2TargetStatusFinished(target.status)
    );
    const completedTargetIds = new Set<number>();
    completedTargets.forEach(target => {
      const targetId = normalizeProtocolV2TargetId(target.target_id);
      if (targetId !== undefined) {
        completedTargetIds.add(targetId);
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
    this.protocolV2FinalStatusVerified = false;
    const expectedTargetIds = new Set(targets.map(target => target.target_id));
    const expectedPaths = new Map(targets.map(target => [target.target_id, target.path]));
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
          if (this.assertProtocolV2TargetStatus(statusTargets, expectedTargetIds, expectedPaths)) {
            this.protocolV2FinalStatusVerified = true;
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
          if (isProtocolV2TerminalInstallStatusError(error)) {
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
        if (isProtocolV2TerminalInstallStatusError(error)) {
          throw error;
        }
        if (
          error instanceof HardwareError &&
          error.params?.firmwareUpdateCode === 'FirmwareInstallStatusUnavailable'
        ) {
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
    this.protocolV2ExecutionInLoader = false;
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
