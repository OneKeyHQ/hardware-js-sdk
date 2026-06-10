import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileUp,
  FolderOpen,
  Loader2,
  Play,
  RotateCcw,
  Square,
  Trash2,
  BarChart3,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Progress } from '../components/ui/Progress';
import { PageLayout } from '../components/common/PageLayout';
import { DeviceNotConnectedState } from '../components/common/DeviceNotConnectedState';
import {
  callHardwareAPI,
  searchDevices,
  type HardwareApiMethod,
} from '../services/hardwareService';
import { useFirmwareProgress } from '../components/providers/SDKProvider';
import { useToast } from '../hooks/use-toast';
import { useDeviceStore } from '../store/deviceStore';
import { isPro2DeviceInfo } from '../utils/pro2Device';
import type { DeviceInfo } from '../types/hardware';

type WorkflowTarget = 'all' | 'step1' | 'step2' | 'step3' | 'step4';
type WorkflowStepId = 'step1' | 'step2' | 'step3' | 'step4';
type StepStatus = 'idle' | 'running' | 'success' | 'failed' | 'skipped';
type LogLevel = 'info' | 'ok' | 'warn' | 'error';
type SeFileKey = 'se1' | 'se2' | 'se3' | 'se4';
type RequiredFileKey = 'romloader' | 'updateRom' | 'bluetooth' | 'firmware' | SeFileKey;

type DirectoryHandle = {
  kind: 'directory';
  name: string;
  entries(): AsyncIterable<[string, FileSystemHandleLike]>;
};

type FileHandle = {
  kind: 'file';
  name: string;
  getFile(): Promise<File>;
};

type FileSystemHandleLike = DirectoryHandle | FileHandle;

type DirectoryRequest = {
  title: string;
  description: string;
  resolve: (handle: DirectoryHandle) => void;
  reject: (error: Error) => void;
};

type WorkflowLog = {
  id: number;
  time: string;
  level: LogLevel;
  message: string;
};

type AssetFile = {
  relativePath: string[];
  size: number;
  file?: File;
  sourcePath?: string;
};

type CopyProgress = {
  copiedFiles: number;
  totalFiles: number;
  copiedBytes: number;
  totalBytes: number;
  currentFile?: string;
  currentFileBytes?: number;
  currentFileSize?: number;
  rateBytesPerSecond?: number;
  elapsedMs?: number;
};

type PathInfoResult = {
  exist?: boolean;
  directory?: boolean;
  size?: number;
};

type DeviceUpdateBinaryManifest = {
  name: string;
  sourcePath: string;
  size: number;
  available: boolean;
};

type DeviceUpdateAssetManifest = {
  relativePath: string;
  sourcePath: string;
  size: number;
};

type DeviceUpdateManifest = {
  generatedAt?: string;
  binaries?: Partial<Record<RequiredFileKey, DeviceUpdateBinaryManifest>>;
  assets?: DeviceUpdateAssetManifest[];
};

type WorkflowBinaryFile =
  | {
      mode: 'default';
      name: string;
      sourcePath: string;
      size?: number;
      available?: boolean;
    }
  | {
      mode: 'manual';
      file: File;
    };

type AssetSource =
  | {
      mode: 'default';
      files: DeviceUpdateAssetManifest[];
      totalBytes: number;
    }
  | {
      mode: 'directory';
      handle: DirectoryHandle;
    };

const REQUIRED_FILES: Array<{ key: RequiredFileKey; label: string; expectedName: string }> = [
  {
    key: 'romloader',
    label: 'Romloader',
    expectedName: 'pro2_romloader_v3_msc.bin',
  },
  {
    key: 'updateRom',
    label: 'Update Bootloader',
    expectedName: 'pro2_boot_update_rom_signed.bin',
  },
  {
    key: 'bluetooth',
    label: 'Bluetooth',
    expectedName: 'pro2_bluetooth_signed.bin',
  },
  {
    key: 'firmware',
    label: 'Firmware',
    expectedName: 'pro2_firmware_signed.bin',
  },
  {
    key: 'se1',
    label: 'SE1 Firmware (optional)',
    expectedName: 'pro2_se1_signed.bin',
  },
  {
    key: 'se2',
    label: 'SE2 Firmware (optional)',
    expectedName: 'pro2_se2_signed.bin',
  },
  {
    key: 'se3',
    label: 'SE3 Firmware (optional)',
    expectedName: 'pro2_se3_signed.bin',
  },
  {
    key: 'se4',
    label: 'SE4 Firmware (optional)',
    expectedName: 'pro2_se4_signed.bin',
  },
];

// DevFirmwareTargetType（matches firmware FwMgmtTarget_t）：SE01-04 = 6-9
const SE_FILE_CONFIG: Array<{ key: SeFileKey; targetId: number; devicePath: string }> = [
  { key: 'se1', targetId: 6, devicePath: 'vol0:se1.bin' },
  { key: 'se2', targetId: 7, devicePath: 'vol0:se2.bin' },
  { key: 'se3', targetId: 8, devicePath: 'vol0:se3.bin' },
  { key: 'se4', targetId: 9, devicePath: 'vol0:se4.bin' },
];

function getDeviceUpdateBaseUrl() {
  const commitSha = process.env.COMMIT_SHA;
  return commitSha && commitSha !== 'dev' ? `${commitSha}/device-update` : 'device-update';
}

function encodeSourcePath(sourcePath: string) {
  return sourcePath.split('/').map(encodeURIComponent).join('/');
}

function getDeviceUpdateUrl(sourcePath: string) {
  return `${getDeviceUpdateBaseUrl()}/${encodeSourcePath(sourcePath)}`;
}

async function fetchDeviceUpdateBlob(sourcePath: string) {
  const response = await fetch(getDeviceUpdateUrl(sourcePath));
  if (!response.ok) {
    throw new Error(`Failed to fetch ${sourcePath}: HTTP ${response.status}`);
  }
  return response.blob();
}

function createDefaultFileState(
  manifest?: DeviceUpdateManifest | null
): Record<RequiredFileKey, WorkflowBinaryFile> {
  return REQUIRED_FILES.reduce((acc, item) => {
    const manifestFile = manifest?.binaries?.[item.key];
    acc[item.key] = {
      mode: 'default',
      name: manifestFile?.name ?? item.expectedName,
      sourcePath: manifestFile?.sourcePath ?? `bin/${item.expectedName}`,
      size: manifestFile?.size,
      available: manifestFile?.available,
    };
    return acc;
  }, {} as Record<RequiredFileKey, WorkflowBinaryFile>);
}

const STEP_CONFIG: Array<{ id: WorkflowStepId; title: string; description: string }> = [
  {
    id: 'step1',
    title: 'Step 1',
    description: 'Update bootloader',
  },
  {
    id: 'step2',
    title: 'Step 2',
    description: 'Update resources',
  },
  {
    id: 'step3',
    title: 'Step 3',
    description: 'Update bluetooth',
  },
  {
    id: 'step4',
    title: 'Step 4',
    description: 'Update firmware',
  },
];

const INITIAL_STEP_STATUS: Record<WorkflowStepId, StepStatus> = {
  step1: 'idle',
  step2: 'idle',
  step3: 'idle',
  step4: 'idle',
};

const CONNECT_TIMEOUT_MS = 60_000;
const PING_TIMEOUT_MS = 60_000;
const DEVICE_FILE_WRITE_CHUNK_SIZE = 2048;
const STEP1_BOOT_LOGO_PATH = 'vol0:assets/boot/boot_logo.bin';
const STEP1_ROMLOADER_PATH = 'vol0:romloader.bin';
const STEP1_UPDATE_ROM_PATH = 'vol0:update_rom.bin';
const STEP3_BLUETOOTH_PATH = 'vol0:bluetooth.bin';
const STEP4_CORE_PATH = 'vol0:core.bin';
const STEP2_UPLOAD_DONE_WAIT_MS = 3000;
const STEP3_POST_PING_WAIT_MS = 5000;
const STEP3_DONE_WAIT_MS = 5000;
const STEP4_POST_REBOOT_WAIT_MS = 1000;
const STEP4_POST_PING_WAIT_MS = 5000;
const STEP4_FINAL_WAIT_MS = 10_000;
const STEP4_FINAL_CONNECT_TIMEOUT_MS = 30_000;
const STEP1_REBOOT_WAIT_MS = 20_000;
const STEP1_SECOND_REBOOT_WAIT_MS = 40_000;
const STANDALONE_POST_REBOOT_WAIT_MS = 1000;
const IGNORED_ASSET_BASENAMES = new Set(['.DS_Store', 'Thumbs.db', 'desktop.ini']);

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatRate(value?: number) {
  if (!value || !Number.isFinite(value)) return '--';
  return `${formatBytes(value)}/s`;
}

function getWorkflowFileName(file: WorkflowBinaryFile) {
  return file.mode === 'manual' ? file.file.name : file.name;
}

function getWorkflowFileSize(file: WorkflowBinaryFile) {
  return file.mode === 'manual' ? file.file.size : file.size;
}

function getAssetRelativePath(relativePath: string[]) {
  return relativePath.filter(Boolean).join('/');
}

function getAssetDevicePath(relativePath: string[]) {
  return `vol0:${getAssetRelativePath(relativePath)}`;
}

function getAssetDeviceDirPaths(relativePath: string[]) {
  const dirs = relativePath.slice(0, -1).filter(Boolean);
  const result: string[] = [];
  for (let index = 1; index <= dirs.length; index += 1) {
    result.push(`vol0:${dirs.slice(0, index).join('/')}`);
  }
  return result;
}

function isDirectoryAlreadyExistsError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes('not exist') || normalized.includes('no such')) return false;
  return (
    normalized.includes('already') ||
    normalized.includes('exists') ||
    normalized.includes('exist') ||
    normalized.includes('eexist')
  );
}

function getDirectoryPicker() {
  const picker = (
    window as Window & {
      showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<DirectoryHandle>;
    }
  ).showDirectoryPicker;

  if (!picker) {
    throw new Error('Current browser does not support directory access.');
  }

  return picker;
}

function getStepIdsForTarget(target: WorkflowTarget): WorkflowStepId[] {
  if (target === 'all') return ['step1', 'step2', 'step3', 'step4'];
  return [target];
}

function StatusBadge({ status }: { status: StepStatus }) {
  const variant = status === 'success' || status === 'running' ? 'default' : 'outline';
  const label =
    status === 'running'
      ? 'Running'
      : status === 'success'
      ? 'Done'
      : status === 'failed'
      ? 'Failed'
      : status === 'skipped'
      ? 'Skipped'
      : 'Idle';

  return (
    <Badge variant={variant} className="min-w-16 justify-center">
      {status === 'running' ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
      {label}
    </Badge>
  );
}

export default function Pro2UpdatePage() {
  const {
    currentDevice,
    sdkInitState,
    setConnectedDevices,
    setCurrentDevice,
    setDeviceFeatures,
    setIsConnecting,
  } = useDeviceStore();
  const { reset: resetFirmwareProgress } = useFirmwareProgress();
  const { toast } = useToast();

  const [deviceUpdateManifest, setDeviceUpdateManifest] = useState<DeviceUpdateManifest | null>(
    null
  );
  const [manifestError, setManifestError] = useState('');
  const [files, setFiles] = useState<Record<RequiredFileKey, WorkflowBinaryFile>>(() =>
    createDefaultFileState()
  );
  const [assetSource, setAssetSource] = useState<AssetSource | null>(null);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [runningTarget, setRunningTarget] = useState<WorkflowTarget | null>(null);
  const [stepStatus, setStepStatus] =
    useState<Record<WorkflowStepId, StepStatus>>(INITIAL_STEP_STATUS);
  const [logs, setLogs] = useState<WorkflowLog[]>([]);
  const [copyProgress, setCopyProgress] = useState<CopyProgress | null>(null);
  const [directoryRequest, setDirectoryRequest] = useState<DirectoryRequest | null>(null);

  const abortRef = useRef(false);
  const currentDeviceRef = useRef<DeviceInfo | null>(currentDevice);
  const logIdRef = useRef(0);

  useEffect(() => {
    currentDeviceRef.current = currentDevice;
  }, [currentDevice]);

  const allFilesReady = REQUIRED_FILES.every(item => {
    const selectedFile = files[item.key];
    return selectedFile.mode === 'manual' || selectedFile.available !== false;
  });
  const assetsReady = Boolean(assetSource);
  const copyPercentage = copyProgress?.totalBytes
    ? Math.min(100, Math.round((copyProgress.copiedBytes / copyProgress.totalBytes) * 100))
    : 0;

  const addLog = useCallback((level: LogLevel, message: string) => {
    const nextLog = {
      id: logIdRef.current + 1,
      time: new Date().toLocaleTimeString(),
      level,
      message,
    };
    logIdRef.current = nextLog.id;
    setLogs(prev => [nextLog, ...prev].slice(0, 300));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadManifest = async () => {
      try {
        const response = await fetch(getDeviceUpdateUrl('manifest.json'), { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const manifest = (await response.json()) as DeviceUpdateManifest;
        if (cancelled) return;

        setDeviceUpdateManifest(manifest);
        setFiles(prev => {
          const defaults = createDefaultFileState(manifest);
          return REQUIRED_FILES.reduce((acc, item) => {
            const current = prev[item.key];
            acc[item.key] = current.mode === 'manual' ? current : defaults[item.key];
            return acc;
          }, {} as Record<RequiredFileKey, WorkflowBinaryFile>);
        });

        const defaultAssets = manifest.assets ?? [];
        if (defaultAssets.length > 0) {
          const totalBytes = defaultAssets.reduce((sum, item) => sum + item.size, 0);
          setAssetSource(prev =>
            prev?.mode === 'directory'
              ? prev
              : {
                  mode: 'default',
                  files: defaultAssets,
                  totalBytes,
                }
          );
        }
        setManifestError('');
      } catch (error) {
        if (cancelled) return;
        setManifestError(getErrorMessage(error));
      }
    };

    void loadManifest();

    return () => {
      cancelled = true;
    };
  }, []);

  const assertRunning = useCallback(() => {
    if (abortRef.current) {
      throw new Error('Workflow cancelled');
    }
  }, []);

  const wait = useCallback(
    async (ms: number, label: string) => {
      addLog('info', `${label}: wait ${(ms / 1000).toFixed(0)}s`);
      const startedAt = Date.now();
      while (Date.now() - startedAt < ms) {
        assertRunning();
        await new Promise(resolve => setTimeout(resolve, Math.min(500, ms)));
      }
    },
    [addLog, assertRunning]
  );

  const requestAssetsDirectory = useCallback(
    async () =>
      new Promise<DirectoryHandle>((resolve, reject) => {
        setDirectoryRequest({
          title: 'Select assets source',
          description: 'Pick the device_update/assets directory.',
          resolve,
          reject,
        });
      }),
    []
  );

  const pickAssetsDirectory = useCallback(async () => {
    const picker = getDirectoryPicker();
    const handle = await picker({ mode: 'read' });
    setAssetSource({ mode: 'directory', handle });
    return handle;
  }, []);

  const handleDirectoryRequest = useCallback(async () => {
    if (!directoryRequest) return;
    try {
      const handle = await pickAssetsDirectory();
      directoryRequest.resolve(handle);
      addLog('ok', `${directoryRequest.title}: ${handle.name}`);
    } catch (error) {
      const message = getErrorMessage(error);
      directoryRequest.reject(new Error(message));
      addLog('error', `${directoryRequest.title} failed: ${message}`);
    } finally {
      setDirectoryRequest(null);
    }
  }, [addLog, directoryRequest, pickAssetsDirectory]);

  const handleCancelDirectoryRequest = useCallback(() => {
    if (!directoryRequest) return;
    directoryRequest.reject(new Error(`${directoryRequest.title} cancelled`));
    setDirectoryRequest(null);
  }, [directoryRequest]);

  const connectDevice = useCallback(
    async (timeoutMs: number, label: string): Promise<DeviceInfo> => {
      addLog('info', `${label}: detecting device protocol`);
      const deadline = Date.now() + timeoutMs;
      let lastError = '';

      setIsConnecting(true);
      try {
        while (Date.now() < deadline) {
          assertRunning();
          const response = await searchDevices();
          if (response.success && Array.isArray(response.payload) && response.payload.length > 0) {
            const devices = (response.payload as DeviceInfo[]).filter(isPro2DeviceInfo);
            if (!devices.length) {
              lastError = 'No Pro2 device found';
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            }
            const device = devices[0];
            setConnectedDevices(devices);
            setCurrentDevice(device);
            currentDeviceRef.current = device;
            setDeviceFeatures(device.features);
            addLog('ok', `${label}: connected ${device.connectId}`);
            return device;
          }
          lastError = response.payload?.error || 'No device found';
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } finally {
        setIsConnecting(false);
      }

      throw new Error(`${label}: connect timeout, last error: ${lastError || 'unknown'}`);
    },
    [
      addLog,
      assertRunning,
      setConnectedDevices,
      setCurrentDevice,
      setDeviceFeatures,
      setIsConnecting,
    ]
  );

  const callApi = useCallback(
    async (method: HardwareApiMethod, connectId: string, params: Record<string, unknown> = {}) => {
      assertRunning();
      const response = await callHardwareAPI(method, {
        connectId,
        ...params,
      });
      if (!response.success) {
        throw new Error(response.payload?.error || `${String(method)} failed`);
      }
      return response.payload;
    },
    [assertRunning]
  );

  const pingDevice = useCallback(
    async (connectId: string, timeoutMs: number, label: string) => {
      addLog('info', `${label}: ping`);
      const deadline = Date.now() + timeoutMs;
      let lastError = '';
      while (Date.now() < deadline) {
        try {
          await callApi('ping', connectId, { message: 'workflow' });
          addLog('ok', `${label}: ping ok`);
          return;
        } catch (error) {
          lastError = getErrorMessage(error);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      throw new Error(`${label}: ping timeout, last error: ${lastError || 'unknown'}`);
    },
    [addLog, callApi]
  );

  const getPathInfo = useCallback(
    async (connectId: string, path: string) => {
      const payload = await callApi('filesystemPathInfoQuery', connectId, { path });
      return payload as PathInfoResult;
    },
    [callApi]
  );

  const writeFile = useCallback(
    async (connectId: string, file: File, path: string, label: string) => {
      addLog('info', `${label}: write ${file.name} -> ${path} (${formatBytes(file.size)})`);
      await callApi('filesystemFileWrite', connectId, {
        path,
        offset: 0,
        totalSize: file.size,
        chunkSize: DEVICE_FILE_WRITE_CHUNK_SIZE,
        data: file,
        overwrite: true,
        append: false,
      });
      addLog('ok', `${label}: write complete`);
    },
    [addLog, callApi]
  );

  const rebootDevice = useCallback(
    async (connectId: string, rebootType: number, label: string) => {
      addLog('info', `${label}: reboot type=${rebootType}`);
      await callApi('deviceReboot', connectId, { rebootType });
      addLog('ok', `${label}: reboot command accepted`);
    },
    [addLog, callApi]
  );

  const firmwareUpdate = useCallback(
    async (connectId: string, targetId: number, path: string, label: string) => {
      resetFirmwareProgress();
      addLog('info', `${label}: DeviceFirmwareUpdate target=${targetId} path=${path}`);
      await callApi('deviceFirmwareUpdate', connectId, { targetId, path });
      addLog('ok', `${label}: install command finished`);
    },
    [addLog, callApi, resetFirmwareProgress]
  );

  const firmwareUpdateTargets = useCallback(
    async (
      connectId: string,
      targets: Array<{ target_id: number; path: string }>,
      label: string
    ) => {
      resetFirmwareProgress();
      addLog(
        'info',
        `${label}: DeviceFirmwareUpdate targets=${targets
          .map(target => `${target.target_id}:${target.path}`)
          .join(', ')}`
      );
      await callApi('deviceFirmwareUpdate', connectId, { targets });
      addLog('ok', `${label}: install command finished`);
    },
    [addLog, callApi, resetFirmwareProgress]
  );

  const standalonePrelude = useCallback(
    async (label: string) => {
      const first = await connectDevice(CONNECT_TIMEOUT_MS, `${label}.pre.connect`);
      await rebootDevice(first.connectId, 1, `${label}.pre.reboot`);
      await wait(STANDALONE_POST_REBOOT_WAIT_MS, `${label}.pre`);
      const second = await connectDevice(CONNECT_TIMEOUT_MS, `${label}.pre.reconnect`);
      return second.connectId;
    },
    [connectDevice, rebootDevice, wait]
  );

  const rebootToBoardloaderPrelude = useCallback(async () => {
    const device = await connectDevice(CONNECT_TIMEOUT_MS, 'RunAll.boardloader.connect');
    await rebootDevice(device.connectId, 1, 'RunAll.boardloader.reboot');
    await wait(STANDALONE_POST_REBOOT_WAIT_MS, 'RunAll.boardloader');
    await connectDevice(CONNECT_TIMEOUT_MS, 'RunAll.boardloader.reconnect');
  }, [connectDevice, rebootDevice, wait]);

  const enumerateAssets = useCallback(async (root: DirectoryHandle) => {
    const results: AssetFile[] = [];

    const walk = async (dir: DirectoryHandle, prefix: string[]) => {
      for await (const [name, handle] of dir.entries()) {
        if (IGNORED_ASSET_BASENAMES.has(name)) continue;
        if (handle.kind === 'directory') {
          await walk(handle, [...prefix, name]);
        } else {
          const file = await handle.getFile();
          results.push({
            file,
            relativePath: [...prefix, name],
            size: file.size,
          });
        }
      }
    };

    await walk(root, []);
    results.sort((a, b) => a.relativePath.join('/').localeCompare(b.relativePath.join('/')));
    return results;
  }, []);

  const ensureDeviceDirectories = useCallback(
    async (connectId: string, dirPaths: string[], createdDirs: Set<string>) => {
      for (const dirPath of dirPaths) {
        if (createdDirs.has(dirPath)) continue;
        try {
          await callApi('filesystemDirMake', connectId, { path: dirPath });
        } catch (error) {
          const message = getErrorMessage(error);
          if (!isDirectoryAlreadyExistsError(message)) {
            throw error;
          }
        }
        createdDirs.add(dirPath);
      }
    },
    [callApi]
  );

  const uploadAssetsOverWebUsb = useCallback(
    async (connectId: string, source: AssetSource) => {
      const assetFiles: AssetFile[] =
        source.mode === 'directory'
          ? await enumerateAssets(source.handle)
          : source.files.map(item => ({
              relativePath: item.relativePath.split('/').filter(Boolean),
              sourcePath: item.sourcePath,
              size: item.size,
            }));
      const totalBytes = assetFiles.reduce((sum, item) => sum + item.size, 0);

      if (assetFiles.length === 0) {
        throw new Error('Assets directory is empty.');
      }

      addLog(
        'info',
        `Step2.3: uploading ${assetFiles.length} files (${formatBytes(
          totalBytes
        )}) to vol0 over WebUSB`
      );

      let copiedFiles = 0;
      let copiedBytes = 0;
      const startedAt = Date.now();
      const createdDirs = new Set<string>();

      const publishCopyProgress = (progress: CopyProgress) => {
        setCopyProgress(progress);
      };

      publishCopyProgress({
        copiedFiles: 0,
        totalFiles: assetFiles.length,
        copiedBytes: 0,
        totalBytes,
        currentFile: getAssetRelativePath(assetFiles[0]?.relativePath ?? []),
        currentFileBytes: 0,
        currentFileSize: assetFiles[0]?.size ?? 0,
        rateBytesPerSecond: 0,
        elapsedMs: 0,
      });

      for (const item of assetFiles) {
        assertRunning();
        if (!item.file && !item.sourcePath) {
          throw new Error(`Missing source for asset: ${getAssetRelativePath(item.relativePath)}`);
        }
        const data = item.file ?? (await fetchDeviceUpdateBlob(item.sourcePath ?? ''));
        const currentFile = getAssetRelativePath(item.relativePath);
        const devicePath = getAssetDevicePath(item.relativePath);
        const elapsedBeforeMs = Date.now() - startedAt;
        const currentRateBytesPerSecond =
          elapsedBeforeMs > 0 ? Math.round((copiedBytes / elapsedBeforeMs) * 1000) : 0;

        publishCopyProgress({
          copiedFiles,
          totalFiles: assetFiles.length,
          copiedBytes,
          totalBytes,
          currentFile,
          currentFileBytes: 0,
          currentFileSize: data.size,
          rateBytesPerSecond: currentRateBytesPerSecond,
          elapsedMs: elapsedBeforeMs,
        });

        await ensureDeviceDirectories(
          connectId,
          getAssetDeviceDirPaths(item.relativePath),
          createdDirs
        );
        await callApi('filesystemFileWrite', connectId, {
          path: devicePath,
          offset: 0,
          totalSize: data.size,
          chunkSize: DEVICE_FILE_WRITE_CHUNK_SIZE,
          data,
          overwrite: true,
          append: false,
        });

        copiedFiles += 1;
        copiedBytes += data.size;
        const elapsedMs = Date.now() - startedAt;
        const rateBytesPerSecond = elapsedMs > 0 ? Math.round((copiedBytes / elapsedMs) * 1000) : 0;
        publishCopyProgress({
          copiedFiles,
          totalFiles: assetFiles.length,
          copiedBytes,
          totalBytes,
          currentFile,
          currentFileBytes: data.size,
          currentFileSize: data.size,
          rateBytesPerSecond,
          elapsedMs,
        });
      }

      const finalElapsedMs = Date.now() - startedAt;
      const finalRateBytesPerSecond =
        finalElapsedMs > 0 ? Math.round((copiedBytes / finalElapsedMs) * 1000) : 0;
      publishCopyProgress({
        copiedFiles,
        totalFiles: assetFiles.length,
        copiedBytes,
        totalBytes,
        currentFile: getAssetRelativePath(assetFiles[assetFiles.length - 1]?.relativePath ?? []),
        currentFileBytes: assetFiles[assetFiles.length - 1]?.size ?? 0,
        currentFileSize: assetFiles[assetFiles.length - 1]?.size ?? 0,
        rateBytesPerSecond: finalRateBytesPerSecond,
        elapsedMs: finalElapsedMs,
      });

      addLog(
        'ok',
        `Step2.3: uploaded ${assetFiles.length} asset files at ${formatRate(
          finalRateBytesPerSecond
        )}`
      );
    },
    [addLog, assertRunning, callApi, ensureDeviceDirectories, enumerateAssets]
  );

  const requireFile = useCallback(
    async (key: RequiredFileKey) => {
      const selectedFile = files[key];
      if (!selectedFile) {
        const config = REQUIRED_FILES.find(item => item.key === key);
        throw new Error(`Missing ${config?.label ?? key} file.`);
      }

      if (selectedFile.mode === 'manual') {
        return selectedFile.file;
      }

      if (selectedFile.available === false) {
        throw new Error(`Default file is not available: ${selectedFile.name}`);
      }

      const blob = await fetchDeviceUpdateBlob(selectedFile.sourcePath);
      return new File([blob], selectedFile.name, {
        type: 'application/octet-stream',
      });
    },
    [files]
  );

  /** 可选文件：未手动选择且默认包未确认可用（manifest available !== true）时返回 null，SE1-4 等可选目标用 */
  const getOptionalFile = useCallback(
    async (key: RequiredFileKey): Promise<File | null> => {
      const selectedFile = files[key];
      if (!selectedFile) return null;
      if (selectedFile.mode === 'manual') return selectedFile.file;
      if (selectedFile.available !== true) return null;
      const blob = await fetchDeviceUpdateBlob(selectedFile.sourcePath);
      return new File([blob], selectedFile.name, {
        type: 'application/octet-stream',
      });
    },
    [files]
  );

  const getAssetsDirectory = useCallback(async () => {
    if (assetSource) return assetSource;
    const handle = await requestAssetsDirectory();
    return { mode: 'directory', handle } as AssetSource;
  }, [assetSource, requestAssetsDirectory]);

  const runStep1Once = useCallback(async () => {
    const romloaderFile = await requireFile('romloader');
    const updateRomFile = await requireFile('updateRom');

    const device = await connectDevice(CONNECT_TIMEOUT_MS, 'Step1.1');
    let connectId = device.connectId;
    await pingDevice(connectId, PING_TIMEOUT_MS, 'Step1.2');

    addLog('info', `Step1.3: check ${STEP1_BOOT_LOGO_PATH}`);
    const bootLogoInfo = await getPathInfo(connectId, STEP1_BOOT_LOGO_PATH);
    if (bootLogoInfo.exist) {
      await callApi('filesystemFileDelete', connectId, { path: STEP1_BOOT_LOGO_PATH });
      addLog('ok', `Step1.3: deleted ${STEP1_BOOT_LOGO_PATH}`);
    } else {
      addLog('info', `Step1.3: ${STEP1_BOOT_LOGO_PATH} not found`);
    }

    await writeFile(connectId, romloaderFile, STEP1_ROMLOADER_PATH, 'Step1.4');
    await wait(1000, 'Step1.4 -> Step1.5');
    await writeFile(connectId, updateRomFile, STEP1_UPDATE_ROM_PATH, 'Step1.5');
    // TARGET_BOOTLOADER = 2（FwMgmtTarget_t）
    await firmwareUpdate(connectId, 2, STEP1_UPDATE_ROM_PATH, 'Step1.6');
    await rebootDevice(connectId, 0, 'Step1.7');
    await wait(STEP1_REBOOT_WAIT_MS, 'Step1.7');

    const secondDevice = await connectDevice(CONNECT_TIMEOUT_MS, 'Step1.8');
    connectId = secondDevice.connectId;
    await rebootDevice(connectId, 0, 'Step1.9');
    await wait(STEP1_SECOND_REBOOT_WAIT_MS, 'Step1.9');
  }, [
    addLog,
    callApi,
    connectDevice,
    firmwareUpdate,
    getPathInfo,
    pingDevice,
    rebootDevice,
    requireFile,
    wait,
    writeFile,
  ]);

  const runStep2Once = useCallback(
    async (initialConnectId?: string) => {
      const source = await getAssetsDirectory();
      let connectId = initialConnectId;
      if (!connectId) {
        connectId = (await connectDevice(CONNECT_TIMEOUT_MS, 'Step2.1')).connectId;
      } else {
        addLog('info', 'Step2.1: reusing connected handle from prelude');
      }

      await pingDevice(connectId, PING_TIMEOUT_MS, 'Step2.2');
      await uploadAssetsOverWebUsb(connectId, source);
      await wait(STEP2_UPLOAD_DONE_WAIT_MS, 'Step2.4');
    },
    [addLog, connectDevice, getAssetsDirectory, pingDevice, uploadAssetsOverWebUsb, wait]
  );

  const runStep3Once = useCallback(
    async (initialConnectId?: string) => {
      const bluetoothFile = await requireFile('bluetooth');
      let connectId = initialConnectId;
      if (!connectId) {
        connectId =
          currentDeviceRef.current?.connectId ??
          (await connectDevice(CONNECT_TIMEOUT_MS, 'Step3.1')).connectId;
        addLog('info', `Step3.1: using ${connectId}`);
      }

      await pingDevice(connectId, PING_TIMEOUT_MS, 'Step3.2');
      await wait(STEP3_POST_PING_WAIT_MS, 'Step3.2');

      addLog('info', `Step3.3: check ${STEP3_BLUETOOTH_PATH}`);
      let needsWrite = true;
      try {
        const info = await getPathInfo(connectId, STEP3_BLUETOOTH_PATH);
        needsWrite = !info.exist;
      } catch (error) {
        addLog('warn', `Step3.3: path info failed, writing file: ${getErrorMessage(error)}`);
      }

      if (needsWrite) {
        await writeFile(connectId, bluetoothFile, STEP3_BLUETOOTH_PATH, 'Step3.3');
      } else {
        addLog('info', `Step3.3: ${STEP3_BLUETOOTH_PATH} already exists`);
      }

      // TARGET_COPROCESSOR = 5（FwMgmtTarget_t，蓝牙协处理器）
      await firmwareUpdate(connectId, 5, STEP3_BLUETOOTH_PATH, 'Step3.4');
      await wait(STEP3_DONE_WAIT_MS, 'Step3.5');
    },
    [addLog, connectDevice, firmwareUpdate, getPathInfo, pingDevice, requireFile, wait, writeFile]
  );

  const runStep4Once = useCallback(async () => {
    const firmwareFile = await requireFile('firmware');
    // SE1-4 固件是可选目标：有文件（手动选择或默认包内可用）才参与本次安装
    const seFiles: Array<{ targetId: number; devicePath: string; file: File; key: SeFileKey }> = [];
    for (const seConfig of SE_FILE_CONFIG) {
      const seFile = await getOptionalFile(seConfig.key);
      if (seFile) {
        seFiles.push({ ...seConfig, file: seFile });
      }
    }

    let connectId = (await connectDevice(CONNECT_TIMEOUT_MS, 'Step4.1')).connectId;
    await rebootDevice(connectId, 1, 'Step4.2');
    await wait(STEP4_POST_REBOOT_WAIT_MS, 'Step4.2');

    connectId = (await connectDevice(CONNECT_TIMEOUT_MS, 'Step4.3')).connectId;
    await pingDevice(connectId, PING_TIMEOUT_MS, 'Step4.4');
    await wait(STEP4_POST_PING_WAIT_MS, 'Step4.4');

    addLog('info', `Step4.5: check ${STEP4_CORE_PATH}`);
    let needsWrite = true;
    try {
      const info = await getPathInfo(connectId, STEP4_CORE_PATH);
      needsWrite = !info.exist;
    } catch (error) {
      addLog('warn', `Step4.5: path info failed, writing file: ${getErrorMessage(error)}`);
    }

    if (needsWrite) {
      await writeFile(connectId, firmwareFile, STEP4_CORE_PATH, 'Step4.5');
    } else {
      addLog('info', `Step4.5: ${STEP4_CORE_PATH} already exists`);
    }

    for (const seFile of seFiles) {
      await writeFile(connectId, seFile.file, seFile.devicePath, `Step4.5 ${seFile.key}`);
    }

    try {
      if (seFiles.length > 0) {
        // SE 与主固件合并为一次 DeviceFirmwareUpdate 调用（targets 数组），SE 在前、主固件在后
        await firmwareUpdateTargets(
          connectId,
          [
            ...seFiles.map(seFile => ({ target_id: seFile.targetId, path: seFile.devicePath })),
            // TARGET_APPLICATION_P1 = 3（FwMgmtTarget_t）
            { target_id: 3, path: STEP4_CORE_PATH },
          ],
          'Step4.6'
        );
      } else {
        await firmwareUpdate(connectId, 3, STEP4_CORE_PATH, 'Step4.6');
      }
    } catch (error) {
      addLog('warn', `Step4.6: ignored firmware update error: ${getErrorMessage(error)}`);
    }

    await wait(STEP4_FINAL_WAIT_MS, 'Step4.7');
    await connectDevice(STEP4_FINAL_CONNECT_TIMEOUT_MS, 'Step4.7');
  }, [
    addLog,
    connectDevice,
    firmwareUpdate,
    firmwareUpdateTargets,
    getOptionalFile,
    getPathInfo,
    pingDevice,
    rebootDevice,
    requireFile,
    wait,
    writeFile,
  ]);

  const runWithAttempts = useCallback(
    async (label: string, runner: () => Promise<void>) => {
      const attempts = Math.max(1, Math.floor(maxAttempts));
      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
          addLog('info', `${label}: attempt ${attempt}/${attempts}`);
          await runner();
          addLog('ok', `${label}: success`);
          return;
        } catch (error) {
          const message = getErrorMessage(error);
          addLog(attempt < attempts ? 'warn' : 'error', `${label}: ${message}`);
          if (attempt >= attempts) throw error;
          await wait(2000, `${label}: retry`);
        }
      }
    },
    [addLog, maxAttempts, wait]
  );

  const runStep = useCallback(async (stepId: WorkflowStepId, runner: () => Promise<void>) => {
    setStepStatus(prev => ({ ...prev, [stepId]: 'running' }));
    try {
      await runner();
      setStepStatus(prev => ({ ...prev, [stepId]: 'success' }));
    } catch (error) {
      setStepStatus(prev => ({ ...prev, [stepId]: 'failed' }));
      throw error;
    }
  }, []);

  const runWorkflow = useCallback(
    async (target: WorkflowTarget) => {
      if (runningTarget) return;

      abortRef.current = false;
      resetFirmwareProgress();
      setCopyProgress(null);
      setLogs([]);
      logIdRef.current = 0;

      const activeSteps = new Set(getStepIdsForTarget(target));
      setStepStatus(
        STEP_CONFIG.reduce((acc, item) => {
          acc[item.id] = activeSteps.has(item.id) ? 'idle' : 'skipped';
          return acc;
        }, {} as Record<WorkflowStepId, StepStatus>)
      );

      setRunningTarget(target);
      addLog('info', `Workflow start: ${target}`);

      try {
        if (target === 'all') {
          await rebootToBoardloaderPrelude();
          await runStep('step1', () => runWithAttempts('Step1', runStep1Once));
          await runStep('step2', () => runWithAttempts('Step2', () => runStep2Once()));

          try {
            await runStep('step3', () => runWithAttempts('Step3', () => runStep3Once()));
          } catch (error) {
            addLog('warn', `Step3 failed in all flow; retry standalone: ${getErrorMessage(error)}`);
            await runStep('step3', () =>
              runWithAttempts('Step3 standalone retry', async () => {
                const connectId = await standalonePrelude('Step3');
                await runStep3Once(connectId);
              })
            );
          }

          try {
            await runStep('step4', () => runWithAttempts('Step4', runStep4Once));
          } catch (error) {
            addLog('warn', `Step4 failed in all flow; retry once: ${getErrorMessage(error)}`);
            await runStep('step4', () => runWithAttempts('Step4 retry', runStep4Once));
          }
        } else if (target === 'step1') {
          await runStep('step1', () => runWithAttempts('Step1', runStep1Once));
        } else if (target === 'step2') {
          await runStep('step2', () =>
            runWithAttempts('Step2 standalone', async () => {
              const connectId = await standalonePrelude('Step2');
              await runStep2Once(connectId);
            })
          );
        } else if (target === 'step3') {
          try {
            await runStep('step3', () =>
              runWithAttempts('Step3 standalone', async () => {
                const connectId = await standalonePrelude('Step3');
                await runStep3Once(connectId);
              })
            );
          } catch (error) {
            addLog('warn', `Step3 standalone failed; retry once: ${getErrorMessage(error)}`);
            await runStep('step3', () =>
              runWithAttempts('Step3 standalone retry', async () => {
                const connectId = await standalonePrelude('Step3');
                await runStep3Once(connectId);
              })
            );
          }
        } else {
          try {
            await runStep('step4', () => runWithAttempts('Step4', runStep4Once));
          } catch (error) {
            addLog('warn', `Step4 failed; retry once: ${getErrorMessage(error)}`);
            await runStep('step4', () => runWithAttempts('Step4 retry', runStep4Once));
          }
        }

        addLog('ok', `Workflow finished: ${target}`);
        toast({ title: 'Pro2 update workflow finished', description: target });
      } catch (error) {
        const message = getErrorMessage(error);
        addLog('error', `Workflow failed: ${message}`);
        toast({
          title: 'Pro2 update workflow failed',
          description: message,
          variant: 'warning',
        });
      } finally {
        setRunningTarget(null);
      }
    },
    [
      addLog,
      resetFirmwareProgress,
      runStep,
      runStep1Once,
      runStep2Once,
      runStep3Once,
      runStep4Once,
      runWithAttempts,
      runningTarget,
      rebootToBoardloaderPrelude,
      standalonePrelude,
      toast,
    ]
  );

  const stopWorkflow = useCallback(() => {
    abortRef.current = true;
    addLog('warn', 'Workflow cancellation requested');
  }, [addLog]);

  const clearRunState = useCallback(() => {
    setLogs([]);
    setCopyProgress(null);
    setStepStatus(INITIAL_STEP_STATUS);
    resetFirmwareProgress();
  }, [resetFirmwareProgress]);

  const restoreDefaultInputs = useCallback(() => {
    setFiles(createDefaultFileState(deviceUpdateManifest));
    const defaultAssets = deviceUpdateManifest?.assets ?? [];
    if (defaultAssets.length > 0) {
      setAssetSource({
        mode: 'default',
        files: defaultAssets,
        totalBytes: defaultAssets.reduce((sum, item) => sum + item.size, 0),
      });
    }
  }, [deviceUpdateManifest]);

  const runButtons = useMemo(
    () =>
      [
        { target: 'all' as const, label: 'Run All' },
        { target: 'step1' as const, label: 'Step 1' },
        { target: 'step2' as const, label: 'Step 2' },
        { target: 'step3' as const, label: 'Step 3' },
        { target: 'step4' as const, label: 'Step 4' },
      ].map(item => (
        <Button
          key={item.target}
          size="sm"
          variant={item.target === 'all' ? 'default' : 'outline'}
          disabled={Boolean(runningTarget) || !sdkInitState.isInitialized}
          onClick={() => void runWorkflow(item.target)}
          title={item.label}
        >
          <Play className="h-4 w-4" />
          {item.label}
        </Button>
      )),
    [runWorkflow, runningTarget, sdkInitState.isInitialized]
  );

  return (
    <PageLayout fixedHeight>
      <div className="min-h-full px-4 py-4">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold text-foreground">OneKey Pro 2 Update</h1>
                <Badge variant="outline" className="border-amber-300 text-amber-700">
                  Non-standard process
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Romloader, resources, bluetooth, and firmware workflow.
              </p>
              <div className="mt-2 flex max-w-3xl items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  When the boot UI appears, swipe from the top-left corner to the bottom-right
                  corner within 3 seconds and hold to stay in romloader mode.
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={sdkInitState.isInitialized ? 'default' : 'outline'}>
                SDK {sdkInitState.isInitialized ? 'ready' : 'initializing'}
              </Badge>
              <Badge variant={currentDevice ? 'default' : 'outline'} className="max-w-full">
                <span className="truncate">{currentDevice?.connectId ?? 'No device'}</span>
              </Badge>
            </div>
          </div>

          <DeviceNotConnectedState pro2Only />

          {directoryRequest ? (
            <Card className="rounded-xl border border-primary/30 bg-primary/5 shadow-sm">
              <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="font-semibold text-foreground">{directoryRequest.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {directoryRequest.description}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => void handleDirectoryRequest()}>
                    <FolderOpen className="h-4 w-4" />
                    Select Directory
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancelDirectoryRequest}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="flex flex-col gap-4">
            <Card className="order-4 rounded-xl border border-border/60 bg-card shadow-sm">
              <CardContent className="space-y-4 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">Inputs</h2>
                    <p className="text-sm text-muted-foreground">
                      Select local binaries and resource assets before running the workflow.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={Boolean(runningTarget)}
                      onClick={restoreDefaultInputs}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Use Defaults
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  {REQUIRED_FILES.map(item => {
                    const selectedFile = files[item.key];
                    const selectedSize = getWorkflowFileSize(selectedFile);
                    return (
                      <div
                        key={item.key}
                        className="rounded-lg border border-border/60 bg-background/70 p-3"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-foreground">
                              {item.label}
                            </div>
                            <div className="truncate font-mono text-[11px] text-muted-foreground">
                              {item.expectedName}
                            </div>
                          </div>
                          {selectedFile.mode === 'manual' || selectedFile.available !== false ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                          ) : (
                            <FileUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                        </div>
                        <Input
                          type="file"
                          accept=".bin"
                          onChange={event => {
                            const nextFile = event.currentTarget.files?.[0];
                            if (!nextFile) return;
                            setFiles(prev => ({
                              ...prev,
                              [item.key]: {
                                mode: 'manual',
                                file: nextFile,
                              },
                            }));
                          }}
                        />
                        <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge
                            variant={selectedFile.mode === 'default' ? 'secondary' : 'outline'}
                          >
                            {selectedFile.mode === 'default' ? 'Default' : 'Manual'}
                          </Badge>
                          <span className="min-w-0 truncate">
                            {getWorkflowFileName(selectedFile)}
                            {selectedSize ? ` · ${formatBytes(selectedSize)}` : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid gap-3">
                  <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-foreground">Assets source</div>
                        <div className="text-xs text-muted-foreground">
                          {assetSource?.mode === 'default'
                            ? `device_update/assets (${
                                assetSource.files.length
                              } files · ${formatBytes(assetSource.totalBytes)})`
                            : assetSource?.handle.name ?? 'Not selected'}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant={assetsReady ? 'secondary' : 'outline'}
                          onClick={() => void pickAssetsDirectory()}
                        >
                          <FolderOpen className="h-4 w-4" />
                          Select
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!deviceUpdateManifest?.assets?.length}
                          onClick={() => {
                            const defaultAssets = deviceUpdateManifest?.assets ?? [];
                            setAssetSource({
                              mode: 'default',
                              files: defaultAssets,
                              totalBytes: defaultAssets.reduce((sum, item) => sum + item.size, 0),
                            });
                          }}
                        >
                          Default
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Defaults to device_update/assets and uploads its contents to vol0 over WebUSB.
                    </div>
                    {manifestError ? (
                      <div className="mt-2 text-xs text-red-500">
                        Default manifest unavailable: {manifestError}
                      </div>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="order-1 rounded-xl border border-border/60 bg-card shadow-sm">
              <CardContent className="space-y-4 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">Run Control</h2>
                    <p className="text-sm text-muted-foreground">
                      Standalone step2/step3 run the reboot prelude before their body.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground" htmlFor="max-attempts">
                      Attempts
                    </label>
                    <Input
                      id="max-attempts"
                      type="number"
                      min={1}
                      max={5}
                      value={maxAttempts}
                      onChange={event =>
                        setMaxAttempts(Math.max(1, Math.min(5, Number(event.target.value) || 1)))
                      }
                      className="w-20"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">{runButtons}</div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="warning"
                    disabled={!runningTarget}
                    onClick={stopWorkflow}
                  >
                    <Square className="h-4 w-4" />
                    Stop
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={Boolean(runningTarget)}
                    onClick={clearRunState}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={Boolean(runningTarget)}
                    onClick={() => {
                      setCopyProgress(null);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Reset Upload
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="order-2 rounded-xl border border-border/60 bg-card shadow-sm">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-foreground">Workflow Steps</h2>
                  <Badge variant={allFilesReady ? 'default' : 'outline'}>
                    {allFilesReady ? 'Files ready' : 'Files missing'}
                  </Badge>
                </div>
                <div className="grid gap-2 lg:grid-cols-4">
                  {STEP_CONFIG.map(item => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-border/60 bg-background/70 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="font-semibold text-foreground">{item.title}</div>
                        <StatusBadge status={stepStatus[item.id]} />
                      </div>
                      <div className="text-sm text-muted-foreground">{item.description}</div>
                    </div>
                  ))}
                </div>

                {copyProgress ? (
                  <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-foreground">Resource upload</span>
                      <span className="ml-auto text-xs font-medium text-muted-foreground">
                        {copyPercentage}%
                      </span>
                    </div>
                    <Progress value={copyPercentage} className="mb-2 h-2" />
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        {formatBytes(copyProgress.copiedBytes)} /{' '}
                        {formatBytes(copyProgress.totalBytes)}
                      </span>
                      <span>{formatRate(copyProgress.rateBytesPerSecond)}</span>
                      <span>
                        {copyProgress.copiedFiles}/{copyProgress.totalFiles} files
                      </span>
                    </div>
                    {copyProgress.currentFile ? (
                      <div className="mt-2 min-w-0 text-xs text-muted-foreground">
                        <div className="truncate">{copyProgress.currentFile}</div>
                        <div>
                          {formatBytes(copyProgress.currentFileBytes ?? 0)} /{' '}
                          {formatBytes(copyProgress.currentFileSize ?? 0)}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="order-3 rounded-xl border border-border/60 bg-card shadow-sm">
              <CardContent className="flex h-[420px] flex-col p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-foreground">Run Log</h2>
                  <Badge variant={runningTarget ? 'default' : 'outline'}>
                    {runningTarget ?? 'idle'}
                  </Badge>
                </div>
                <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border/60 bg-neutral-950 p-3 font-mono text-[11px] leading-relaxed text-neutral-200">
                  {logs.length === 0 ? (
                    <div className="text-neutral-500">No log entries.</div>
                  ) : (
                    logs.map(item => (
                      <div key={item.id} className="mb-1 grid grid-cols-[64px_48px_1fr] gap-2">
                        <span className="text-neutral-500">{item.time}</span>
                        <span
                          className={
                            item.level === 'ok'
                              ? 'text-emerald-300'
                              : item.level === 'warn'
                              ? 'text-amber-300'
                              : item.level === 'error'
                              ? 'text-red-300'
                              : 'text-cyan-300'
                          }
                        >
                          {item.level.toUpperCase()}
                        </span>
                        <span className="break-words">{item.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
