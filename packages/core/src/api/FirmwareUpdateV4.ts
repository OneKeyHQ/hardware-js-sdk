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
  PROTOCOL_V2_FIRMWARE_UPDATE_RESPONSE_TYPES,
  getProtocolV2UnknownErrorText,
  isProtocolV2DeviceDisconnectedError,
} from './protocol-v2/helpers';

import type { FirmwareUpdateV4Params } from '../types/api/firmwareUpdate';
import type { EFirmwareType } from '@onekeyfe/hd-shared';
import type { PROTO } from '../constants';
import type { TypedResponseMessage } from '../device/DeviceCommands';
import type {
  Features,
  IFirmwareReleaseInfo,
  IProtocolV2FirmwareComponent,
  IProtocolV2ResourceManifestPackage,
  IVersionArray,
} from '../types';

const Log = getLogger(LoggerNames.Method);

const SESSION_ERROR = 'session not found';
const PROTOCOL_V2_BOOTLOADER_RECONNECT_TIMEOUT = 60 * 1000;
const PROTOCOL_V2_SHORT_RESPONSE_TIMEOUT = 5 * 1000;
const PROTOCOL_V2_START_UPDATE_TIMEOUT = 60 * 1000;
const PROTOCOL_V2_INSTALL_TIMEOUT = 5 * 60 * 1000;
const PROTOCOL_V2_TARGET_STATUS_PENDING = 0;
const PROTOCOL_V2_TARGET_STATUS_IN_PROGRESS = 1;
const PROTOCOL_V2_TARGET_STATUS_FINISHED = 2;
const PROTOCOL_V2_TARGET_STATUS_FAILED_MIN = 3;
const PROTOCOL_V2_CONNECT_PROTOCOL = 'V2';
const PROTOCOL_V2_FIRMWARE_STAGING_VOLUME = 'vol1:';
const PROTOCOL_V2_MIN_FILE_CHUNK_SIZE = 64;
const PROTOCOL_V2_CONNECT_RETRY_COUNT = 10;
const PROTOCOL_V2_CONNECT_POLL_INTERVAL = 500;
const PROTOCOL_V2_CONNECT_SINGLE_TIMEOUT = 75 * 1000;
const PROTOCOL_V2_DEVICE_INFO_READY_TIMEOUT = 60 * 1000;
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

type ProtocolV2FirmwareUpdateStartResponse =
  | TypedResponseMessage<'Success'>
  | TypedResponseMessage<'DeviceFirmwareUpdateStatus'>
  | undefined;

type ProtocolV2TargetBinary = { fileName: string; binary: ArrayBuffer; targetId: number };
type ProtocolV2InstallItem = ProtocolV2TargetBinary & {
  kind: ProtocolV2RemoteComponentTarget['kind'];
};
type ProtocolV2InstallTarget = ProtocolV2InstallItem & {
  path: string;
};

type ProtocolV2RemoteComponentBinary = ProtocolV2RemoteComponentTarget & {
  binary: ArrayBuffer;
};

type ProtocolV2RemoteComponentTarget = {
  fileName: string;
  targetId: number;
  kind: 'bootloader' | 'firmware' | 'resource';
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
  CRATE: {
    fileName: 'resource.bin',
    targetId: ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_CRATE,
    kind: 'resource',
  },
};

const PROTOCOL_V2_ROMLOADER_UNSUPPORTED_MESSAGE =
  'FW_MGMT_TARGET_ROMLOADER is not accepted by the current Pro2 bootloader update request. Flash romloader with the loader-specific flow instead of firmwareUpdateV4.';

// hd-transport 的历史 decode 行为会把单值 enum 输出为枚举名字符串；
// Protocol V2 沿用这个 SDK 语义，内部比较前再映射回固件协议数值。
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

const isProtocolV2PollingTransientError = (error: unknown) => {
  const message = getProtocolV2UnknownErrorText(error).toLowerCase();
  return (
    isProtocolV2DeviceDisconnectedError(error) ||
    isProtocolV2ReconnectProbeError(error) ||
    message.includes('libusb_transfer_timed_out') ||
    (message.includes('response timeout') && message.includes('devicefirmwareupdatestatusget')) ||
    message.includes('device not found') ||
    message.includes('transportnotfound')
  );
};

const isProtocolV2StartUpdateTransientError = (error: unknown) => {
  const message = getProtocolV2UnknownErrorText(error).toLowerCase();
  return (
    isProtocolV2DeviceDisconnectedError(error) ||
    isProtocolV2ReconnectProbeError(error) ||
    message.includes('libusb_transfer_timed_out') ||
    (message.includes('response timeout') && message.includes('devicefirmwareupdaterequest'))
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

const versionArrayToNumber = (version?: IVersionArray) => {
  if (!version) return undefined;
  return version[0] * 0x10000 + version[1] * 0x100 + version[2];
};

const versionStringToArray = (version?: string | null): IVersionArray | undefined => {
  if (!version) return undefined;
  const parts = version.split('.').map(part => Number(part));
  if (parts.length !== 3 || parts.some(part => !Number.isFinite(part))) return undefined;
  return parts as IVersionArray;
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

/**
 * FirmwareUpdateV4 is the complete Protocol V2 firmware update flow.
 *
 * It intentionally does not fall back to FirmwareUpdateV3/V1 behavior:
 * - upload uses FilesystemFileWrite
 * - install uses DeviceFirmwareUpdateRequest
 * - completion waits for target status to finish, reboots to normal, then polls DeviceInfo
 */
export default class FirmwareUpdateV4 extends FirmwareUpdateBaseMethod<FirmwareUpdateV4Params> {
  init() {
    this.allowDeviceMode = [UI_REQUEST.BOOTLOADER, UI_REQUEST.NOT_INITIALIZE];
    this.requireDeviceMode = [];
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
      { name: 'resourceBinaries', type: 'array', allowEmpty: true },
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
      { name: 'platform', type: 'string' },
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
      resourceBinaries: payload.resourceBinaries,
      firmwareType: payload.firmwareType,
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
    const deviceFirmwareType = getFirmwareType(deviceFeatures);
    const firmwareType = this.params.firmwareType ?? deviceFirmwareType;

    let resourceBinaryMap: ProtocolV2TargetBinary[] = [];
    let fwBinaryMap: ProtocolV2TargetBinary[] = [];
    let bootloaderBinary: ArrayBuffer | null = null;
    let installItems: ProtocolV2InstallItem[] | undefined;
    try {
      this.postTipMessage(FirmwareUpdateTipMessage.StartDownloadFirmware);
      resourceBinaryMap = await this.prepareResourceBinaries(firmwareType, deviceFeatures);
      fwBinaryMap = this.collectExplicitTargetBinaries();
      bootloaderBinary = this.prepareBootloaderBinary();
      if (!this.hasExplicitProtocolV2Payload(fwBinaryMap)) {
        const remoteBinaries = await this.prepareRemoteProtocolV2Binaries(
          firmwareType,
          deviceFeatures
        );
        resourceBinaryMap = remoteBinaries.resourceBinaryMap;
        bootloaderBinary = remoteBinaries.bootloaderBinary;
        fwBinaryMap = remoteBinaries.fwBinaryMap;
        installItems = remoteBinaries.installItems;
      }
      this.postTipMessage(FirmwareUpdateTipMessage.FinishDownloadFirmware);
    } catch (err) {
      throw ERRORS.TypedError(HardwareErrorCode.FirmwareUpdateDownloadFailed, err.message ?? err);
    }

    if (resourceBinaryMap.length === 0 && !bootloaderBinary && fwBinaryMap.length === 0) {
      throw ERRORS.TypedError(
        HardwareErrorCode.FirmwareUpdateDownloadFailed,
        'No firmware to update'
      );
    }

    await this.enterProtocolV2BootloaderMode();

    await this.executeProtocolV2Update({
      resourceBinaryMap,
      fwBinaryMap,
      bootloaderBinary,
      ...(installItems ? { installItems } : undefined),
    });

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

  private async prepareResourceBinaries(firmwareType: EFirmwareType, features: Features) {
    if (this.params.resourceBinaries?.length) {
      this.params.resourceBinaries.forEach((binary, index) => {
        if (!(binary instanceof ArrayBuffer)) {
          throw ERRORS.TypedError(
            HardwareErrorCode.CallMethodInvalidParameter,
            `Parameter [resourceBinaries.${index}] is of type invalid and should be [buffer].`
          );
        }
      });

      return this.params.resourceBinaries.map((binary, index) => ({
        fileName: `resource-${index + 1}.bin`,
        binary,
        targetId: ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_CRATE,
      }));
    }
    const resourceUrl = DataManager.getSysResourcesLatestRelease({
      features,
      forcedUpdateRes: this.params.forcedUpdateRes,
      firmwareType,
    });

    if (resourceUrl) {
      const resource = (await getSysResourceBinary(resourceUrl)).binary;
      return [
        {
          fileName: 'resource.bin',
          binary: resource,
          targetId: ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_CRATE,
        },
      ];
    }
    Log.warn('No resource url found');
    return [];
  }

  private prepareBootloaderBinary(): ArrayBuffer | null {
    return this.params.bootloaderBinary ?? null;
  }

  private hasExplicitProtocolV2Payload(fwBinaryMap: ProtocolV2TargetBinary[]) {
    return (
      !!this.params.resourceBinaries?.length ||
      !!this.params.bootloaderBinary ||
      fwBinaryMap.length > 0
    );
  }

  private buildProtocolV2InstallItems({
    resourceBinaryMap,
    bootloaderBinary,
    fwBinaryMap,
  }: {
    resourceBinaryMap: ProtocolV2TargetBinary[];
    bootloaderBinary: ArrayBuffer | null;
    fwBinaryMap: ProtocolV2TargetBinary[];
  }): ProtocolV2InstallItem[] {
    const installItems: ProtocolV2InstallItem[] = resourceBinaryMap.map(resource => ({
      ...resource,
      kind: 'resource',
    }));

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

  private getProtocolV2ComponentTargetVersion(
    release: IFirmwareReleaseInfo,
    component: IProtocolV2FirmwareComponent,
    target: ProtocolV2RemoteComponentTarget
  ) {
    if (component.version) return component.version;
    if (target.targetId === ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_BOOTLOADER) {
      return release.bootloaderVersion;
    }
    if (
      target.targetId === ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_APPLICATION_P1 ||
      target.targetId === ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_APPLICATION_P2
    ) {
      return release.version;
    }
    return undefined;
  }

  private getProtocolV2ComponentCurrentVersion(
    features: Features,
    target: ProtocolV2RemoteComponentTarget
  ) {
    switch (target.targetId) {
      case ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_BOOTLOADER:
        return getDeviceBootloaderVersion(features);
      case ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_APPLICATION_P1:
      case ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_APPLICATION_P2:
        return getDeviceFirmwareVersion(features);
      case ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_COPROCESSOR:
        return getDeviceBLEFirmwareVersion(features);
      case ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE01:
        return versionStringToArray(features.se01Version);
      case ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE02:
        return versionStringToArray(features.se02Version);
      case ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE03:
        return versionStringToArray(features.se03Version);
      case ProtocolV2FirmwareTargetType.FW_MGMT_TARGET_SE04:
        return versionStringToArray(features.se04Version);
      default:
        return undefined;
    }
  }

  private isProtocolV2ComponentVersionSatisfied(
    release: IFirmwareReleaseInfo,
    component: IProtocolV2FirmwareComponent,
    target: ProtocolV2RemoteComponentTarget,
    features: Features
  ) {
    const targetVersion = this.getProtocolV2ComponentTargetVersion(release, component, target);
    if (!targetVersion) return false;

    const currentVersion = this.getProtocolV2ComponentCurrentVersion(features, target);
    const compareResult = compareProtocolV2Versions(currentVersion, targetVersion);
    return compareResult !== undefined && compareResult >= 0;
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

  private async isProtocolV2ResourcePackageMatched(
    pkg: IProtocolV2ResourceManifestPackage,
    manifestVersion?: IVersionArray
  ) {
    try {
      const header = await this.readProtocolV2DeviceFileHeader(pkg.path);
      if (!header) return false;

      const expectedType = pkg.type ?? 'RESC';
      const expectedVersion = pkg.version ?? manifestVersion;
      if (header.type !== expectedType) return false;
      if (expectedVersion && compareProtocolV2Versions(header.version, expectedVersion) !== 0) {
        return false;
      }

      const expectedPayloadHash = normalizeProtocolV2Hex(pkg.payloadHash);
      if (expectedPayloadHash && header.payloadHash !== expectedPayloadHash) return false;

      const expectedHeaderHash = normalizeProtocolV2Hex(pkg.headerHash);
      if (expectedHeaderHash && header.headerHash !== expectedHeaderHash) return false;

      return true;
    } catch (error) {
      Log.log(`Protocol V2 resource package check failed for ${pkg.path}: `, error);
      return false;
    }
  }

  private async isProtocolV2ResourceManifestSatisfied(
    manifest: IFirmwareReleaseInfo['resourceManifest']
  ) {
    if (!manifest?.packages?.length) return false;

    for (const pkg of manifest.packages) {
      if (!(await this.isProtocolV2ResourcePackageMatched(pkg, manifest.version))) {
        return false;
      }
    }
    return true;
  }

  private getProtocolV2ResourceManifest(
    release: IFirmwareReleaseInfo,
    component: IProtocolV2FirmwareComponent
  ) {
    return component.resourceManifest ?? release.resourceManifest;
  }

  private getProtocolV2ResourceComponentFileName(key: string) {
    const safeKey = key.replace(/[^a-z0-9_-]/gi, '_') || 'resource';
    return `resource-${safeKey}.bin`;
  }

  private async shouldInstallRemoteProtocolV2Component(
    release: IFirmwareReleaseInfo,
    key: string,
    component: IProtocolV2FirmwareComponent,
    target: ProtocolV2RemoteComponentTarget,
    features: Features
  ) {
    if (target.kind === 'resource') {
      if (
        this.params.forcedUpdateRes ||
        features.bootloaderMode ||
        features.mode === 'bootloader'
      ) {
        return true;
      }
      const resourceMatched = await this.isProtocolV2ResourceManifestSatisfied(
        this.getProtocolV2ResourceManifest(release, component)
      );
      if (resourceMatched) {
        Log.log(`[FirmwareUpdateV4] skip Protocol V2 resource component ${key}; manifest matched`);
      }
      return !resourceMatched;
    }

    const versionSatisfied = this.isProtocolV2ComponentVersionSatisfied(
      release,
      component,
      target,
      features
    );
    if (versionSatisfied) {
      Log.log(`[FirmwareUpdateV4] skip Protocol V2 component ${key}; version is up to date`);
    }
    return !versionSatisfied;
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
    };
  }

  private async prepareRemoteProtocolV2Binaries(firmwareType: EFirmwareType, features: Features) {
    const release = DataManager.getFirmwareLatestRelease(features, firmwareType);

    const resourceBinaryMap: ProtocolV2TargetBinary[] = [];
    let bootloaderBinary: ArrayBuffer | null = null;
    const fwBinaryMap: ProtocolV2TargetBinary[] = [];
    const installItems: ProtocolV2InstallItem[] = [];

    if (!release) {
      return {
        resourceBinaryMap,
        bootloaderBinary,
        fwBinaryMap,
        installItems,
      };
    }

    const entries = this.getRemoteComponentEntries(release);

    for (const [key, component] of entries) {
      const target = this.getRemoteComponentTarget(key, component);
      const shouldInstall = await this.shouldInstallRemoteProtocolV2Component(
        release,
        key,
        component,
        target,
        features
      );
      if (shouldInstall) {
        const remoteBinary = await this.downloadRemoteProtocolV2Component(key, component);
        if (remoteBinary.kind === 'resource') {
          const binaryEntry = {
            fileName: this.getProtocolV2ResourceComponentFileName(key),
            binary: remoteBinary.binary,
            targetId: remoteBinary.targetId,
          };
          resourceBinaryMap.push(binaryEntry);
          installItems.push({ ...binaryEntry, kind: remoteBinary.kind });
        } else if (remoteBinary.kind === 'bootloader') {
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
      resourceBinaryMap,
      bootloaderBinary,
      fwBinaryMap,
      installItems,
    };
  }

  private isProtocolV2BootloaderMode() {
    if (typeof this.device.isBootloader === 'function') {
      return this.device.isBootloader();
    }
    return !!this.device.features?.bootloaderMode;
  }

  async enterProtocolV2BootloaderMode() {
    if (this.isProtocolV2BootloaderMode()) {
      Log.debug('Protocol V2 device is already in bootloader mode, skip reboot to bootloader');
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
        const features = this.device.updateProtocolV2Features(deviceInfo);
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
   * 收集按 DeviceFirmwareTargetType 拆分的显式目标二进制。
   * 文件名仅用于 staging 路径展示，target_id 已显式给定。
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
    resourceBinaryMap,
    fwBinaryMap,
    bootloaderBinary,
    installItems,
  }: {
    resourceBinaryMap?: ProtocolV2TargetBinary[];
    fwBinaryMap?: ProtocolV2TargetBinary[];
    bootloaderBinary?: ArrayBuffer | null;
    installItems?: ProtocolV2InstallItem[];
  }) {
    const orderedInstallItems =
      installItems ??
      this.buildProtocolV2InstallItems({
        resourceBinaryMap: resourceBinaryMap ?? [],
        bootloaderBinary: bootloaderBinary ?? null,
        fwBinaryMap: fwBinaryMap ?? [],
      });
    let totalSize = 0;
    let processedSize = 0;
    let transferredSize = 0;

    for (const item of orderedInstallItems) totalSize += item.binary.byteLength;

    this.postTipMessage(FirmwareUpdateTipMessage.StartTransferData);
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

    const firmwareTargets: Array<{ target_id: number; path: string }> = [];
    const flushFirmwareTargets = async () => {
      if (firmwareTargets.length === 0) return;
      const targets = firmwareTargets.splice(0, firmwareTargets.length);
      Log.log(`[FirmwareUpdateV4] DeviceFirmwareUpdateRequest targets=${JSON.stringify(targets)}`);
      const startResponse = await this.protocolV2StartFirmwareUpdate({ targets });
      await this.waitForProtocolV2FirmwareUpdateComplete(targets, startResponse);
    };

    for (const item of stagedInstallTargets) {
      const target = {
        target_id: item.targetId,
        path: item.path,
      };
      if (item.kind === 'resource') {
        await flushFirmwareTargets();
        const resourceTargets = [target];
        Log.log(
          `[FirmwareUpdateV4] DeviceFirmwareUpdateRequest resources=${JSON.stringify(
            resourceTargets
          )}`
        );
        const startResponse = await this.protocolV2StartFirmwareUpdate({
          targets: resourceTargets,
        });
        await this.waitForProtocolV2FirmwareUpdateComplete(resourceTargets, startResponse);
      } else {
        firmwareTargets.push(target);
      }
    }

    await flushFirmwareTargets();
  }

  private getProtocolV2InstallItemStagingPath(item: ProtocolV2InstallItem) {
    return `${PROTOCOL_V2_FIRMWARE_STAGING_VOLUME}${item.fileName}`;
  }

  private async queryProtocolV2FirmwareUpdateStatus() {
    const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());
    return typedCall(
      'DeviceFirmwareUpdateStatusGet',
      'DeviceFirmwareUpdateStatus',
      {},
      {
        timeoutMs: PROTOCOL_V2_SHORT_RESPONSE_TIMEOUT,
      }
    );
  }

  private async pingProtocolV2Device() {
    const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());
    await typedCall(
      'Ping',
      'Success',
      { message: 'firmware-update' },
      {
        timeoutMs: PROTOCOL_V2_SHORT_RESPONSE_TIMEOUT,
      }
    );
  }

  private isProtocolV2NormalModeFeatures(features?: Features | null) {
    return !!features && !features.bootloaderMode && features.mode !== 'bootloader';
  }

  private async probeProtocolV2NormalMode() {
    const deviceInfo = await requestProtocolV2DeviceInfo({
      commands: this.device.getCommands(),
      timeoutMs: PROTOCOL_V2_SHORT_RESPONSE_TIMEOUT,
      request: PROTOCOL_V2_VERSIONS_DEVICE_INFO_REQUEST,
    });
    const features = this.device.updateProtocolV2Features(deviceInfo);
    if (this.isProtocolV2NormalModeFeatures(features)) {
      Log.log('Protocol V2 firmware install finished; device is back in normal mode');
      return true;
    }
    return false;
  }

  private assertProtocolV2TargetStatus(
    statusTargets: ProtocolV2FirmwareUpdateStatusTarget[],
    expectedTargetIds: Set<number>
  ) {
    const failedTarget = statusTargets.find(
      target =>
        expectedTargetIds.has(normalizeProtocolV2TargetId(target.target_id) ?? -1) &&
        isProtocolV2TargetStatusFailed(target.status)
    );
    if (failedTarget) {
      throw ERRORS.TypedError(
        HardwareErrorCode.FirmwareError,
        `Protocol V2 firmware target ${failedTarget.target_id} failed`
      );
    }

    const completedTargets = statusTargets.filter(
      target =>
        expectedTargetIds.has(normalizeProtocolV2TargetId(target.target_id) ?? -1) &&
        isProtocolV2TargetStatusFinished(target.status)
    );
    if (completedTargets.length === expectedTargetIds.size && expectedTargetIds.size > 0) {
      return true;
    }

    const inProgressTarget = statusTargets.find(
      target =>
        expectedTargetIds.has(normalizeProtocolV2TargetId(target.target_id) ?? -1) &&
        isProtocolV2TargetStatusInProgress(target.status)
    );
    if (inProgressTarget) {
      this.postProgressMessage(99, 'installingFirmware');
    }

    return false;
  }

  private async waitForProtocolV2FirmwareUpdateComplete(
    targets: Array<{ target_id: number; path: string }>,
    startResponse?: ProtocolV2FirmwareUpdateStartResponse
  ) {
    const expectedTargetIds = new Set(targets.map(target => target.target_id));
    if (startResponse?.type === 'DeviceFirmwareUpdateStatus') {
      const statusTargets = (startResponse.message.records ??
        []) as ProtocolV2FirmwareUpdateStatusTarget[];
      if (this.assertProtocolV2TargetStatus(statusTargets, expectedTargetIds)) {
        return;
      }
    }

    const startTime = Date.now();
    let lastError: unknown;

    while (Date.now() - startTime < PROTOCOL_V2_INSTALL_TIMEOUT) {
      try {
        const statusRes = await this.queryProtocolV2FirmwareUpdateStatus();
        const statusTargets = (statusRes.message.records ??
          []) as ProtocolV2FirmwareUpdateStatusTarget[];
        if (this.assertProtocolV2TargetStatus(statusTargets, expectedTargetIds)) {
          return;
        }
      } catch (error) {
        lastError = error;
        if (error instanceof HardwareError && error.errorCode === HardwareErrorCode.FirmwareError) {
          throw error;
        }
        Log.log('Protocol V2 firmware install status polling failed: ', error);
        if (isProtocolV2PollingTransientError(error)) {
          try {
            await this.reconnectProtocolV2Device();
            if (await this.probeProtocolV2NormalMode()) {
              return;
            }
          } catch (reconnectError) {
            lastError = reconnectError;
            Log.log(
              'Protocol V2 firmware install reconnect/normal-mode probe failed: ',
              reconnectError
            );
          }
          try {
            await this.pingProtocolV2Device();
            Log.log('Protocol V2 firmware status unavailable, Ping is ready');
          } catch (pingError) {
            lastError = pingError;
            Log.log('Protocol V2 firmware install Ping polling failed: ', pingError);
          }
        }
      }
      await wait(1000);
    }

    throw ERRORS.TypedError(
      HardwareErrorCode.RuntimeError,
      `Protocol V2 firmware update status timeout: ${this.normalizeErrorMessage(lastError)}`
    );
  }

  private async exitProtocolV2BootloaderToNormal() {
    this.postTipMessage(FirmwareUpdateTipMessage.SwitchFirmwareReconnectDevice);
    try {
      await this.reconnectProtocolV2Device();
      if (await this.probeProtocolV2NormalMode()) {
        Log.log('Protocol V2 device is already in normal mode, skip normal reboot');
        return;
      }
    } catch (error) {
      Log.log('Protocol V2 normal-mode probe before reboot failed: ', error);
    }
    await this.protocolV2Reboot(DeviceRebootType.Normal);
  }

  private async waitForProtocolV2FinalFeatures() {
    const features = await this.waitForProtocolV2ReconnectAndFeatures(
      PROTOCOL_V2_BOOTLOADER_RECONNECT_TIMEOUT
    );

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

    while (Date.now() - startTime < timeout) {
      try {
        await this.reconnectProtocolV2Device();
        const deviceInfo = await requestProtocolV2DeviceInfo({
          commands: this.device.getCommands(),
          timeoutMs: PROTOCOL_V2_SHORT_RESPONSE_TIMEOUT,
          // 更新完成判定只需要各 target 版本号；scope 与请求内容保持一致
          request: PROTOCOL_V2_VERSIONS_DEVICE_INFO_REQUEST,
        });
        const features = this.device.updateProtocolV2Features(deviceInfo);
        if (features.bootloaderMode || features.mode === 'bootloader') {
          throw ERRORS.TypedError(
            HardwareErrorCode.DeviceNotFound,
            'Protocol V2 device is still in bootloader mode'
          );
        }
        return features;
      } catch (error) {
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
      await this.device.acquire(PROTOCOL_V2_CONNECT_PROTOCOL, { throwOnRunPromiseError: true });
      this.device.commands.disposed = false;
      this.device.getCommands().mainId = this.device.mainId ?? '';
      await this.device.initialize();
      return;
    }

    // App 与 bootloader 序列号暂时可能不一致。V4 升级重连阶段只接受唯一枚举设备，
    // 避免继续按旧 app connectId 查缓存导致反复输出 path mismatch 日志。
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
    await this.device.acquire(PROTOCOL_V2_CONNECT_PROTOCOL, { throwOnRunPromiseError: true });
    this.device.commands.disposed = false;
    this.device.getCommands().mainId = this.device.mainId ?? '';
    await this.device.initialize();
  }

  private async protocolV2CommonUpdateProcess({
    payload,
    filePath,
    processedSize,
    totalSize,
    onTransferredBytes,
  }: PROTO.FirmwareUpload & {
    filePath: string;
    processedSize?: number;
    totalSize?: number;
    onTransferredBytes?: (transferredBytes: number) => void;
  }) {
    const chunkSize = this.getProtocolV2FirmwareChunkSize();
    let offset = 0;
    const getUploadProgress = (fileOffset: number) => {
      if (totalSize !== undefined && processedSize !== undefined) {
        return Math.min(Math.ceil(((processedSize + fileOffset) / totalSize) * 100), 99);
      }
      return Math.min(Math.ceil((fileOffset / payload.byteLength) * 100), 99);
    };

    while (offset < payload.byteLength) {
      const chunkEnd = Math.min(offset + chunkSize, payload.byteLength);
      const chunkLength = chunkEnd - offset;
      const chunk = payload.slice(offset, chunkEnd);
      const overwrite = offset === 0;
      const progress = getProtocolV2DeviceTransferProgress(
        (processedSize ?? 0) + offset,
        (processedSize ?? 0) + chunkEnd,
        totalSize ?? payload.byteLength
      );

      const writeRes = await this.fileWriteWithRetry(
        filePath,
        payload.byteLength,
        offset,
        chunk,
        overwrite,
        progress
      );
      const processedByte = Number(writeRes.message.processed_byte);
      const nextOffset =
        Number.isFinite(processedByte) && processedByte > offset
          ? processedByte
          : offset + chunkLength;
      if (nextOffset <= offset || nextOffset > payload.byteLength) {
        throw ERRORS.TypedError(
          HardwareErrorCode.EmmcFileWriteFirmwareError,
          `invalid processed_byte ${writeRes.message.processed_byte} for offset ${offset}`
        );
      }
      offset = nextOffset;
      onTransferredBytes?.((processedSize ?? 0) + offset);
      this.postProgressMessage(getUploadProgress(offset), 'transferData');
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

  private async fileWriteWithRetry(
    filePath: string,
    totalFileSize: number,
    offset: number,
    chunk: ArrayBuffer | Buffer,
    overwrite: boolean,
    progress: number | null
  ): Promise<TypedResponseMessage<'FilesystemFile'>> {
    const writeFunc = async () => {
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
        throw ERRORS.TypedError(
          HardwareErrorCode.EmmcFileWriteFirmwareError,
          'transfer data error'
        );
      }
      return writeRes;
    };

    let retryCount = 10;
    while (retryCount > 0) {
      try {
        const result = await writeFunc();
        return result;
      } catch (error) {
        Log.error(`fileWrite error: `, error);
        retryCount--;
        if (retryCount === 0) {
          throw ERRORS.TypedError(
            HardwareErrorCode.EmmcFileWriteFirmwareError,
            'transfer data error'
          );
        }
        const env = DataManager.getSettings('env');
        if (DataManager.isBleConnect(env)) {
          await wait(3000);
          await this.acquireProtocolV2BleDevice();
          await this.device.initialize();
        }
        await wait(2000);
      }
    }
    throw ERRORS.TypedError(HardwareErrorCode.EmmcFileWriteFirmwareError, 'transfer data error');
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
    let response: ProtocolV2FirmwareUpdateStartResponse;
    try {
      response = await commands.typedCall(
        'DeviceFirmwareUpdateRequest',
        PROTOCOL_V2_FIRMWARE_UPDATE_RESPONSE_TYPES,
        {
          targets,
        },
        {
          intermediateTypes: ['DeviceFirmwareUpdateStatus'],
          timeoutMs: PROTOCOL_V2_START_UPDATE_TIMEOUT,
          onIntermediateResponse: (response: { type?: string }) => {
            if (response.type === 'DeviceFirmwareUpdateStatus') {
              this.postProgressMessage(99, 'installingFirmware');
            }
          },
        }
      );
    } catch (error) {
      if (isProtocolV2StartUpdateTransientError(error)) {
        Log.log(
          'Protocol V2 firmware update request did not return; continue status polling',
          error
        );
      } else {
        throw error;
      }
    }
    this.postTipMessage(FirmwareUpdateTipMessage.FirmwareUpdating);
    return response;
  }

  private async protocolV2Reboot(rebootType: DeviceRebootType) {
    const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());
    try {
      const res = await typedCall('DeviceReboot', 'Success', {
        reboot_type: rebootType,
      });
      return res.message;
    } catch (error) {
      if (isProtocolV2DeviceDisconnectedError(error) || isProtocolV2ReconnectProbeError(error)) {
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
