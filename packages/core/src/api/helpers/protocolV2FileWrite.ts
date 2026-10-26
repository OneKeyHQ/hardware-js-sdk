import {
  PROTOCOL_V2_BLE_FILE_CHUNK_SIZE,
  PROTOCOL_V2_FILE_WRITE_PIPELINE_WINDOW,
  PROTOCOL_V2_WEBUSB_FILE_CHUNK_SIZE,
} from '@onekeyfe/hd-transport';
import { EDeviceType, ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import semver from 'semver';

import { DataManager } from '../../data-manager';
import { LoggerNames, getLogger } from '../../utils/logger';

import type { DeviceCommands } from '../../device/DeviceCommands';

const Log = getLogger(LoggerNames.Core);

export type ProtocolV2FileWriteData = ArrayBuffer | Uint8Array | Blob | string;

export type ProtocolV2FileWriteProgress = {
  progress: number;
  transferredBytes: number;
  totalBytes: number;
  rateBytesPerSecond?: number;
  elapsedMs: number;
};

export type ProtocolV2FileWriteChunkContext = {
  offset: number;
  chunkLength: number;
  totalSize: number;
};

export type ProtocolV2FileWriteOptions = {
  commands: Pick<DeviceCommands, 'typedCall'> & Partial<Pick<DeviceCommands, 'device'>>;
  path: string;
  data: ProtocolV2FileWriteData;
  offset?: number;
  totalSize?: number;
  chunkSize?: number;
  chunkLen?: number;
  chunkSizeLimit?: number;
  /** BLE-only limit for a caller whose fixed short path has a verified larger frame budget. */
  bleChunkSizeLimit?: number;
  overwrite?: boolean;
  append?: boolean;
  uiPercentage?: number;
  timeoutMs?: number;
  writeWithResponse?: boolean;
  maxChunkRetries?: number;
  paceMs?: number;
  throwIfAborted?: () => void;
  getUiPercentage?: (context: ProtocolV2FileWriteChunkContext) => number | undefined;
  onProgress?: (progress: ProtocolV2FileWriteProgress) => void;
};

const MIN_FILE_CHUNK_SIZE = 64;
const FILE_TRANSFER_RATE_WINDOW_MS = 1000;
const FILE_TRANSFER_LOG_INTERVAL_MS = 10_000;
const SESSION_ERROR = 'session not found';
// Application firmware from firmware-pro2 #239 has the 4096-byte UART FIFO required for
// two 1800-byte chunks. Gate on the running application, not the installed bootloader.
const ASSET_FILE_WRITE_MIN_APPLICATION_VERSION = '1.0.3';
const ASSET_FILE_WRITE_RESPONSE_TIMEOUT = 10_000;

function shouldPipelineAssetFileWrite(options: ProtocolV2FileWriteOptions) {
  const env = DataManager.getSettings('env');
  if (env !== 'react-native' && env !== 'desktop-web-ble') return false;
  if (
    options.overwrite !== true ||
    options.append ||
    (options.offset ?? 0) !== 0 ||
    (options.paceMs ?? 0) > 0 ||
    options.writeWithResponse === true ||
    !/^vol1:\/(?:wallpapers\/wallpaper\.okpkg|nft\/nft-[0-9a-f]{8}-[1-9][0-9]*\.okpkg|portfolio\/portfolio\.okpkg\.pending)$/.test(
      options.path
    )
  ) {
    return false;
  }
  const { device } = options.commands;
  const deviceType = device?.getCurrentDeviceType();
  const firmwareVersion = device?.state?.versions.firmware;
  const mode = device?.state?.status.mode;
  return Boolean(
    device?.isProtocolV2() &&
      (deviceType === EDeviceType.Pro2 || deviceType === EDeviceType.Neo) &&
      (mode === 'normal' || mode === 'notInitialized') &&
      firmwareVersion &&
      semver.valid(firmwareVersion) &&
      semver.gte(firmwareVersion, ASSET_FILE_WRITE_MIN_APPLICATION_VERSION)
  );
}

function formatFileTransferRate(bytesPerSecond: number) {
  return (Math.max(bytesPerSecond, 0) / 1024).toFixed(2);
}

function getAverageFileTransferRate(transferredBytes: number, elapsedMs: number) {
  if (elapsedMs <= 0) return 0;
  return Math.round((Math.max(transferredBytes, 0) / elapsedMs) * 1000);
}

function getFileTransferTransport() {
  const env = DataManager.getSettings('env');
  return env && DataManager.isBleConnect(env) ? 'BLE' : String(env ?? 'unknown');
}

function logFileTransferMetrics({
  transport,
  status,
  path,
  transferredBytes,
  totalBytes,
  elapsedMs,
  rateBytesPerSecond,
  hostWriteElapsedMs,
  responseWaitElapsedMs,
  measuredAttempts,
}: {
  transport: string;
  status: 'progress' | 'completed' | 'failed';
  path: string;
  transferredBytes: number;
  totalBytes: number;
  elapsedMs: number;
  rateBytesPerSecond: number;
  hostWriteElapsedMs: number;
  responseWaitElapsedMs: number;
  measuredAttempts: number;
}) {
  const segmentedMetrics =
    measuredAttempts > 0
      ? ` hostWriteTotal=${(hostWriteElapsedMs / 1000).toFixed(2)}s responseWaitTotal=${(
          responseWaitElapsedMs / 1000
        ).toFixed(2)}s measuredAttempts=${measuredAttempts}`
      : '';
  Log.log(
    `[FileWrite] metrics transport=${transport} status=${status} path=${path} bytes=${transferredBytes}/${totalBytes} elapsed=${(
      elapsedMs / 1000
    ).toFixed(2)}s speed=${formatFileTransferRate(rateBytesPerSecond)} KiB/s${segmentedMetrics}`
  );
}

export function isProtocolV2ResponseTimeout(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { errorCode?: number; code?: number | string; message?: string };
  const code = candidate.errorCode ?? candidate.code;
  return (
    code === HardwareErrorCode.BleTimeoutError ||
    code === 'response-timeout' ||
    /(?:BLE|Lowlevel|Protocol V2) response timeout/i.test(candidate.message ?? '')
  );
}

function getProtocolV2FileChunkLimit(bleChunkSizeLimit?: number) {
  const env = DataManager.getSettings('env');
  if (env && DataManager.isBleConnect(env)) {
    const configuredLimit = Number(bleChunkSizeLimit);
    return Number.isFinite(configuredLimit) && configuredLimit > 0
      ? Math.floor(configuredLimit)
      : PROTOCOL_V2_BLE_FILE_CHUNK_SIZE;
  }
  return PROTOCOL_V2_WEBUSB_FILE_CHUNK_SIZE;
}

async function dataToUint8Array(data: ProtocolV2FileWriteData): Promise<Uint8Array> {
  if (typeof data === 'string') return new TextEncoder().encode(data);
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    return new Uint8Array(await data.arrayBuffer());
  }
  throw ERRORS.TypedError(
    HardwareErrorCode.CallMethodInvalidParameter,
    'Unsupported FilesystemFileWrite data'
  );
}

function normalizeChunkSize(value: unknown, maxChunkSize: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return maxChunkSize;
  return Math.min(Math.max(Math.floor(numeric), MIN_FILE_CHUNK_SIZE), maxChunkSize);
}

function getDeviceTransferProgress(before: number, after: number, total: number) {
  if (!Number.isFinite(total) || total <= 0) return 100;
  if (before <= 0 && after < total) return 0;
  if (after >= total) return 100;
  return Math.min(Math.max(Math.ceil((after / total) * 100), 1), 99);
}

function getConfirmedProgress(processed: number, total: number, written: number, length: number) {
  if (Number.isFinite(processed) && Number.isFinite(total) && total > 0) {
    if (processed >= total) return 100;
    return Math.min(Math.max(Math.floor((processed / total) * 100), 0), 99);
  }
  if (length > 0) return written >= length ? 100 : Math.floor((written / length) * 100);
  return 100;
}

export async function writeProtocolV2File(options: ProtocolV2FileWriteOptions) {
  options.throwIfAborted?.();
  const data = await dataToUint8Array(options.data);
  const dataLength = data.byteLength;
  const startOffset =
    Number.isFinite(options.offset) && Number(options.offset) > 0 ? Number(options.offset) : 0;
  const totalSize =
    Number.isFinite(options.totalSize) && Number(options.totalSize) > 0
      ? Number(options.totalSize)
      : startOffset + dataLength;

  if (totalSize < startOffset + dataLength) {
    throw ERRORS.TypedError(
      HardwareErrorCode.RuntimeError,
      `FilesystemFileWrite totalSize ${totalSize} is smaller than offset + data length ${
        startOffset + dataLength
      }`
    );
  }

  const defaultChunkSizeLimit = getProtocolV2FileChunkLimit(options.bleChunkSizeLimit);
  const pipelineAsset = totalSize === dataLength && shouldPipelineAssetFileWrite(options);
  const configuredChunkSizeLimit = Number(options.chunkSizeLimit);
  const chunkSizeLimit =
    Number.isFinite(configuredChunkSizeLimit) && configuredChunkSizeLimit > 0
      ? Math.floor(configuredChunkSizeLimit)
      : defaultChunkSizeLimit;
  const chunkSize = normalizeChunkSize(
    options.chunkSize ?? options.chunkLen,
    pipelineAsset ? Math.min(chunkSizeLimit, PROTOCOL_V2_BLE_FILE_CHUNK_SIZE) : chunkSizeLimit
  );
  let written = 0;
  let chunks = 0;
  let lastMessage: Record<string, unknown> | undefined;
  const startTime = Date.now();
  let rateWindowStartedAt = startTime;
  let rateWindowStartedBytes = 0;
  let rateBytesPerSecond: number | undefined;
  let lastConfirmedAt = startTime;
  let logWindowStartedAt = startTime;
  let logWindowStartedBytes = 0;
  let hostWriteElapsedMs = 0;
  let responseWaitElapsedMs = 0;
  let measuredAttempts = 0;
  const createRequest = (position: number) => {
    const chunk = data.slice(position, Math.min(position + chunkSize, dataLength));
    const offset = startOffset + position;
    const progress =
      options.uiPercentage ??
      options.getUiPercentage?.({
        offset,
        chunkLength: chunk.byteLength,
        totalSize,
      }) ??
      getDeviceTransferProgress(offset, offset + chunk.byteLength, totalSize);
    return {
      file: { path: options.path, offset, total_size: totalSize, data: chunk },
      overwrite: position === 0 ? options.overwrite ?? false : false,
      append: options.append ?? false,
      ui_percentage: progress,
    };
  };

  const confirmChunk = (
    response: { type?: string; message?: Record<string, unknown> },
    offset: number,
    chunkLength: number
  ) => {
    const responseType = (response as { type?: string }).type;
    if (responseType && responseType !== 'FilesystemFile') {
      const responseError = (response as { message?: { error?: unknown } }).message?.error;
      if (typeof responseError === 'string' && responseError.includes(SESSION_ERROR)) {
        throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, SESSION_ERROR);
      }
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        `FilesystemFileWrite received unexpected response ${responseType}`
      );
    }
    options.throwIfAborted?.();
    lastMessage = response.message;
    const rawProcessedByte = response.message?.processed_byte;
    const processedByte = Number(rawProcessedByte);
    if (
      rawProcessedByte !== undefined &&
      (!Number.isFinite(processedByte) ||
        processedByte <= offset ||
        processedByte > offset + chunkLength)
    ) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        `FilesystemFileWrite invalid processed_byte ${processedByte}`
      );
    }
    written = rawProcessedByte === undefined ? written + chunkLength : processedByte - startOffset;
    chunks += 1;
    const now = Date.now();
    lastConfirmedAt = now;
    const elapsedMs = now - startTime;
    const transferredBytes = Math.min(written, dataLength);
    const rateWindowElapsedMs = now - rateWindowStartedAt;
    if (rateWindowElapsedMs >= FILE_TRANSFER_RATE_WINDOW_MS) {
      const rateWindowBytes = Math.max(transferredBytes - rateWindowStartedBytes, 0);
      rateBytesPerSecond = Math.round((rateWindowBytes / rateWindowElapsedMs) * 1000);
      rateWindowStartedAt = now;
      rateWindowStartedBytes = transferredBytes;
    } else if (rateBytesPerSecond === undefined && elapsedMs > 0) {
      rateBytesPerSecond = Math.round((transferredBytes / elapsedMs) * 1000);
    }
    options.onProgress?.({
      progress: getConfirmedProgress(startOffset + written, totalSize, written, dataLength),
      transferredBytes,
      totalBytes: dataLength,
      rateBytesPerSecond,
      elapsedMs,
    });
    const logWindowElapsedMs = now - logWindowStartedAt;
    if (logWindowElapsedMs >= FILE_TRANSFER_LOG_INTERVAL_MS && transferredBytes < dataLength) {
      const logWindowBytes = Math.max(transferredBytes - logWindowStartedBytes, 0);
      logFileTransferMetrics({
        transport,
        status: 'progress',
        path: options.path,
        transferredBytes,
        totalBytes: dataLength,
        elapsedMs,
        rateBytesPerSecond: getAverageFileTransferRate(logWindowBytes, logWindowElapsedMs),
        hostWriteElapsedMs,
        responseWaitElapsedMs,
        measuredAttempts,
      });
      logWindowStartedAt = now;
      logWindowStartedBytes = transferredBytes;
    }
  };

  const transport = getFileTransferTransport();
  Log.log(
    `[FileWrite] started transport=${transport} path=${options.path} bytes=${dataLength} offset=${startOffset} chunk=${chunkSize}`
  );

  try {
    if (pipelineAsset && dataLength > chunkSize) {
      Log.debug('[FileWrite] BLE asset pipeline', {
        window: PROTOCOL_V2_FILE_WRITE_PIPELINE_WINDOW,
        applicationVersion: options.commands.device?.state?.versions.firmware,
      });
      let sendOffset = chunkSize;
      let interrupted = false;
      let interruption: unknown;
      const response = await options.commands.typedCall(
        'FilesystemFileWrite',
        'FilesystemFile',
        createRequest(0),
        {
          timeoutMs: options.timeoutMs ?? ASSET_FILE_WRITE_RESPONSE_TIMEOUT,
          writeWithResponse: false,
          fileWritePipeline: {
            next: () => {
              if (interrupted || sendOffset >= dataLength) return Promise.resolve(undefined);
              try {
                options.throwIfAborted?.();
                const request = createRequest(sendOffset);
                sendOffset += request.file.data.byteLength;
                return Promise.resolve(request);
              } catch (error) {
                interrupted = true;
                interruption = error;
                return Promise.resolve(undefined);
              }
            },
            onResponse: confirmed => {
              if (interrupted) return;
              try {
                const offset = startOffset + written;
                const length = Math.min(chunkSize, dataLength - written);
                if (Number(confirmed.message.processed_byte) !== offset + length) {
                  throw ERRORS.TypedError(
                    HardwareErrorCode.RuntimeError,
                    'FilesystemFileWrite pipeline did not confirm the complete chunk'
                  );
                }
                confirmChunk(confirmed, offset, length);
              } catch (error) {
                // Drain already-sent responses before raising callback errors or cancellation.
                interrupted = true;
                interruption = error;
              }
            },
          },
        }
      );
      options.throwIfAborted?.();
      if (interrupted) throw interruption;
      if (
        response.type !== 'FilesystemFile' ||
        Number(response.message.processed_byte) !== startOffset + dataLength ||
        written !== dataLength
      ) {
        throw ERRORS.TypedError(
          HardwareErrorCode.RuntimeError,
          'FilesystemFileWrite pipeline ended before the complete file was confirmed'
        );
      }
    }
    while (written < dataLength) {
      options.throwIfAborted?.();
      const request = createRequest(written);
      const { offset, data: chunk } = request.file;
      const maxChunkRetries = Math.max(Math.floor(options.maxChunkRetries ?? 0), 0);
      let retryCount = 0;
      let response;
      let isWritePending = true;
      while (isWritePending) {
        let currentHostWriteElapsedMs: number | undefined;
        let responseWaitStartedAt: number | undefined;
        try {
          const callOptions =
            options.writeWithResponse === undefined
              ? {
                  timeoutMs: options.timeoutMs,
                  onWriteCompleted: ({ elapsedMs }: { elapsedMs: number }) => {
                    currentHostWriteElapsedMs = elapsedMs;
                    responseWaitStartedAt = Date.now();
                  },
                }
              : {
                  ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
                  writeWithResponse: options.writeWithResponse,
                  onWriteCompleted: ({ elapsedMs }: { elapsedMs: number }) => {
                    currentHostWriteElapsedMs = elapsedMs;
                    responseWaitStartedAt = Date.now();
                  },
                };
          response = await options.commands.typedCall(
            'FilesystemFileWrite',
            'FilesystemFile',
            request,
            callOptions
          );
          isWritePending = false;
        } catch (error) {
          if (retryCount >= maxChunkRetries || !isProtocolV2ResponseTimeout(error)) throw error;
          retryCount += 1;
          options.throwIfAborted?.();
        } finally {
          if (currentHostWriteElapsedMs !== undefined && responseWaitStartedAt !== undefined) {
            hostWriteElapsedMs += currentHostWriteElapsedMs;
            responseWaitElapsedMs += Math.max(Date.now() - responseWaitStartedAt, 0);
            measuredAttempts += 1;
          }
        }
      }
      if (!response) {
        throw ERRORS.TypedError(
          HardwareErrorCode.RuntimeError,
          'FilesystemFileWrite completed without a response'
        );
      }
      confirmChunk(response, offset, chunk.byteLength);
      if (options.paceMs && options.paceMs > 0) {
        await new Promise(resolve => {
          setTimeout(resolve, options.paceMs);
        });
      }
    }
  } catch (error) {
    const now = Date.now();
    const elapsedMs = Math.max(now - startTime, 0);
    const logWindowElapsedMs = Math.max(now - logWindowStartedAt, 0);
    const logWindowBytes = Math.max(written - logWindowStartedBytes, 0);
    logFileTransferMetrics({
      transport,
      status: 'failed',
      path: options.path,
      transferredBytes: written,
      totalBytes: dataLength,
      elapsedMs,
      rateBytesPerSecond: getAverageFileTransferRate(logWindowBytes, logWindowElapsedMs),
      hostWriteElapsedMs,
      responseWaitElapsedMs,
      measuredAttempts,
    });
    throw error;
  }

  const elapsedMs = Math.max(lastConfirmedAt - startTime, 0);
  const logWindowElapsedMs = Math.max(lastConfirmedAt - logWindowStartedAt, 0);
  const logWindowBytes = Math.max(written - logWindowStartedBytes, 0);
  logFileTransferMetrics({
    transport,
    status: 'completed',
    path: options.path,
    transferredBytes: written,
    totalBytes: dataLength,
    elapsedMs,
    rateBytesPerSecond: getAverageFileTransferRate(logWindowBytes, logWindowElapsedMs),
    hostWriteElapsedMs,
    responseWaitElapsedMs,
    measuredAttempts,
  });

  return {
    ...lastMessage,
    path: options.path,
    offset: startOffset,
    total_size: totalSize,
    processed_byte: startOffset + written,
    chunks,
  };
}
