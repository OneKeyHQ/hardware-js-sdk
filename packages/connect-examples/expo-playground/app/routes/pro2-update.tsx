import { useCallback, useMemo, useRef, useState } from 'react';
import { DeviceFirmwareTargetType } from '@onekeyfe/hd-transport';
import { CheckCircle2, FileUp, Loader2, Play, RefreshCw, RotateCcw, Search, X } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Progress } from '../components/ui/Progress';
import { PageLayout } from '../components/common/PageLayout';
import {
  callHardwareAPI,
  hydrateConnectedDeviceInfo,
  searchDevices,
} from '../services/hardwareService';
import { useFirmwareProgress } from '../components/providers/SDKProvider';
import { useToast } from '../hooks/use-toast';
import { useDeviceStore } from '../store/deviceStore';
import { isPro2DeviceInfo } from '../utils/pro2Device';
import { buildBootResourceFiles } from '../utils/protocolV2ResourceManifest';
import type { DeviceInfo } from '../types/hardware';
import { PRO2_FIRMWARE_FILE_ACCEPT } from '../constants/firmwareFiles';

const TARGET_FIELDS = [
  {
    param: 'bootloaderBinary',
    label: 'Bootloader',
    targetId: DeviceFirmwareTargetType.FW_MGMT_TARGET_BOOTLOADER,
    accept: PRO2_FIRMWARE_FILE_ACCEPT,
    formatHint: 'signed OKPP .okpkg',
  },
  {
    param: 'applicationP1Binary',
    label: 'APP P1',
    targetId: DeviceFirmwareTargetType.FW_MGMT_TARGET_APPLICATION_P1,
    accept: PRO2_FIRMWARE_FILE_ACCEPT,
    formatHint: 'signed OKPP .okpkg',
  },
  {
    param: 'applicationP2Binary',
    label: 'APP P2',
    targetId: DeviceFirmwareTargetType.FW_MGMT_TARGET_APPLICATION_P2,
    accept: PRO2_FIRMWARE_FILE_ACCEPT,
    formatHint: 'signed OKPP .okpkg',
  },
  {
    param: 'coprocessorBinary',
    label: 'Coprocessor',
    targetId: DeviceFirmwareTargetType.FW_MGMT_TARGET_COPROCESSOR,
    accept: PRO2_FIRMWARE_FILE_ACCEPT,
    formatHint: 'signed target package',
  },
  {
    param: 'se01Binary',
    label: 'SE01',
    targetId: DeviceFirmwareTargetType.FW_MGMT_TARGET_SE01,
    accept: PRO2_FIRMWARE_FILE_ACCEPT,
    formatHint: 'signed target package',
  },
  {
    param: 'se02Binary',
    label: 'SE02',
    targetId: DeviceFirmwareTargetType.FW_MGMT_TARGET_SE02,
    accept: PRO2_FIRMWARE_FILE_ACCEPT,
    formatHint: 'signed target package',
  },
  {
    param: 'se03Binary',
    label: 'SE03',
    targetId: DeviceFirmwareTargetType.FW_MGMT_TARGET_SE03,
    accept: PRO2_FIRMWARE_FILE_ACCEPT,
    formatHint: 'signed target package',
  },
  {
    param: 'se04Binary',
    label: 'SE04',
    targetId: DeviceFirmwareTargetType.FW_MGMT_TARGET_SE04,
    accept: PRO2_FIRMWARE_FILE_ACCEPT,
    formatHint: 'signed target package',
  },
] as const;

const BUNDLE_SLOTS = [
  {
    key: 'images',
    label: 'Images',
    devicePath: 'vol0:/bundles/images/images.okpkg',
    accept: '.okpkg',
    formatHint: 'RESC bundle .okpkg (images)',
  },
  {
    key: 'animation',
    label: 'Animation',
    devicePath: 'vol0:/bundles/images/animation.okpkg',
    accept: '.okpkg',
    formatHint: 'RESC bundle .okpkg (animation gifs)',
  },
  {
    key: 'wallpaper',
    label: 'Wallpaper',
    devicePath: 'vol0:/bundles/images/wallpaper.okpkg',
    accept: '.okpkg',
    formatHint: 'RESC bundle .okpkg (wallpapers)',
  },
  {
    key: 'translations',
    label: 'Translations',
    devicePath: 'vol0:/bundles/translations/translations.okpkg',
    accept: '.okpkg',
    formatHint: 'RESC bundle .okpkg (i18n)',
  },
  {
    key: 'fonts_roobert',
    label: 'Fonts Roobert',
    devicePath: 'vol0:/bundles/font/roobert.okpkg',
    accept: '.okpkg',
    formatHint: 'RESC bundle .okpkg (Latin fonts)',
  },
  {
    key: 'fonts_noto',
    label: 'Fonts Noto',
    devicePath: 'vol0:/bundles/font/noto.okpkg',
    accept: '.okpkg',
    formatHint: 'RESC bundle .okpkg (CJK fonts)',
  },
] as const;

type TargetParam = (typeof TARGET_FIELDS)[number]['param'];

type UpdateLog = {
  id: number;
  time: string;
  level: 'info' | 'ok' | 'error';
  message: string;
};

type UpdateVersionsResult = {
  firmwareVersion?: string;
  bleVersion?: string;
  bootloaderVersion?: string;
};

function formatBytes(bytes?: number) {
  if (!bytes || !Number.isFinite(bytes)) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function getApiError(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === 'string' && error) return error;
  }
  return fallback;
}

type CompactFileSlotProps = {
  label: string;
  meta: string;
  formatHint: string;
  accept: string;
  file?: File;
  disabled: boolean;
  onSelect: (file: File) => void;
  onClear: () => void;
};

function CompactFileSlot({
  label,
  meta,
  formatHint,
  accept,
  file,
  disabled,
  onSelect,
  onClear,
}: CompactFileSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const openFilePicker = () => {
    if (!inputRef.current) return;
    // Reset first so selecting the same file again still fires change.
    inputRef.current.value = '';
    inputRef.current.click();
  };

  return (
    <div className="min-w-0 bg-background p-3 transition-colors hover:bg-muted/20">
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept={accept}
        disabled={disabled}
        aria-label={`Select ${label} firmware file`}
        onChange={event => {
          const nextFile = event.currentTarget.files?.[0];
          if (nextFile) onSelect(nextFile);
        }}
      />

      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground" title={label}>
            {label}
          </div>
          <div
            className="truncate font-mono text-[10px] leading-4 text-muted-foreground"
            title={meta}
          >
            {meta}
          </div>
        </div>
        {file ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        ) : (
          <FileUp className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
      </div>

      <div className="mt-2 flex min-w-0 items-center gap-1.5">
        <div
          className={`min-w-0 flex-1 rounded-md px-2.5 py-1.5 text-xs ${
            file ? 'bg-primary/5 text-foreground' : 'bg-muted/45 text-muted-foreground'
          }`}
          title={file ? `${file.name} · ${formatBytes(file.size)}` : formatHint}
        >
          <div className="truncate">{file ? file.name : formatHint}</div>
          {file ? (
            <div className="mt-0.5 text-[10px] leading-3 text-muted-foreground">
              {formatBytes(file.size)}
            </div>
          ) : null}
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          className="h-8 shrink-0 px-2.5 shadow-none hover:scale-100 hover:shadow-none active:scale-100"
          onClick={openFilePicker}
        >
          {file ? <RefreshCw /> : <FileUp />}
          {file ? 'Replace' : 'Choose'}
        </Button>
        {file ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={disabled}
            className="h-8 w-8 shrink-0 text-muted-foreground hover:scale-100 hover:text-destructive active:scale-100"
            aria-label={`Clear ${label} file`}
            title={`Clear ${label}`}
            onClick={onClear}
          >
            <X />
          </Button>
        ) : null}
      </div>
    </div>
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
  const { progressData, reset: resetFirmwareProgress } = useFirmwareProgress();
  const { toast } = useToast();

  const [files, setFiles] = useState<Partial<Record<TargetParam, File>>>({});
  const [bundleFiles, setBundleFiles] = useState<Partial<Record<string, File>>>({});
  const [bootResourceDirectory, setBootResourceDirectory] = useState<File[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isConnectingLocal, setIsConnectingLocal] = useState(false);
  const [logs, setLogs] = useState<UpdateLog[]>([]);
  const [result, setResult] = useState<UpdateVersionsResult | null>(null);
  const logIdRef = useRef(0);
  const bootResourceInputRef = useRef<HTMLInputElement>(null);

  const selectedFields = useMemo(() => TARGET_FIELDS.filter(field => files[field.param]), [files]);
  const selectedBundleCount = BUNDLE_SLOTS.filter(slot => bundleFiles[slot.key]).length;
  const selectedPayloadCount =
    selectedFields.length + selectedBundleCount + (bootResourceDirectory.length > 0 ? 1 : 0);

  const addLog = useCallback((level: UpdateLog['level'], message: string) => {
    const nextLog = {
      id: logIdRef.current + 1,
      time: new Date().toLocaleTimeString(),
      level,
      message,
    };
    logIdRef.current = nextLog.id;
    setLogs(prev => [nextLog, ...prev].slice(0, 200));
  }, []);

  const connectDevice = useCallback(async (): Promise<DeviceInfo> => {
    setIsConnecting(true);
    setIsConnectingLocal(true);
    try {
      const response = await searchDevices();
      if (!response.success || !Array.isArray(response.payload)) {
        throw new Error(getApiError(response.payload, 'searchDevices failed'));
      }
      const devices = (response.payload as DeviceInfo[]).filter(isPro2DeviceInfo);
      if (!devices.length) {
        throw new Error('No Pro2 device found');
      }
      const device = await hydrateConnectedDeviceInfo(devices[0]);
      setConnectedDevices([device, ...devices.slice(1)]);
      setCurrentDevice(device);
      setDeviceFeatures(device.features);
      addLog('ok', `Connected ${device.connectId}`);
      return device;
    } finally {
      setIsConnecting(false);
      setIsConnectingLocal(false);
    }
  }, [addLog, setConnectedDevices, setCurrentDevice, setDeviceFeatures, setIsConnecting]);

  const runUpdate = useCallback(async () => {
    setIsRunning(true);
    setResult(null);
    resetFirmwareProgress();
    try {
      const device = currentDevice ?? (await connectDevice());

      const params: Record<string, unknown> = { platform: 'web' };
      const resourceFiles: Array<{ binary: ArrayBuffer; devicePath: string }> = [];
      for (const slot of BUNDLE_SLOTS) {
        const file = bundleFiles[slot.key];
        if (!file) continue;
        addLog(
          'info',
          `Loading RESC bundle ${slot.label}: ${file.name} (${formatBytes(file.size)})`
        );
        resourceFiles.push({
          binary: await file.arrayBuffer(),
          devicePath: slot.devicePath,
        });
      }
      for (const field of selectedFields) {
        const file = files[field.param];
        if (!file) continue;
        addLog('info', `Loading ${field.label}: ${file.name} (${formatBytes(file.size)})`);
        params[field.param] = await file.arrayBuffer();
      }

      if (resourceFiles.length > 0) {
        params.resourceFiles = resourceFiles;
        addLog(
          'info',
          `Prepared resourceFiles: ${resourceFiles.length} stable bundles, ${formatBytes(
            resourceFiles.reduce((total, item) => total + item.binary.byteLength, 0)
          )}`
        );
      }

      if (bootResourceDirectory.length > 0) {
        const bootResourceFiles = await buildBootResourceFiles(bootResourceDirectory);
        params.resourceFiles = [...resourceFiles, ...bootResourceFiles];
        addLog(
          'info',
          `Prepared boot resources: ${bootResourceFiles.length} files, ${formatBytes(
            bootResourceFiles.reduce((total, item) => total + item.binary.byteLength, 0)
          )}`
        );
      }

      if (selectedPayloadCount === 0) {
        addLog('info', 'firmwareUpdateV4 remote config: pro2 firmware-v1 components');
      } else {
        const targetNames = [
          selectedBundleCount > 0 ? `RESC bundles(${selectedBundleCount})` : null,
          bootResourceDirectory.length > 0 ? 'Boot resources(manifest)' : null,
          ...selectedFields.map(field => `${field.label}(${field.targetId})`),
        ].filter(Boolean);
        addLog('info', `firmwareUpdateV4 targets: ${targetNames.join(', ')}`);
      }
      const response = await callHardwareAPI('firmwareUpdateV4', {
        connectId: device.connectId,
        ...params,
      });
      if (!response.success) {
        throw new Error(getApiError(response.payload, 'firmwareUpdateV4 failed'));
      }

      const versions = (response.payload ?? {}) as UpdateVersionsResult;
      setResult(versions);
      addLog('ok', 'firmwareUpdateV4 completed');
      toast({ title: 'Update completed', description: 'firmwareUpdateV4 finished successfully.' });
    } catch (error) {
      const message = getErrorMessage(error);
      addLog('error', message);
      toast({ title: 'Update failed', description: message, variant: 'destructive' });
    } finally {
      setIsRunning(false);
    }
  }, [
    addLog,
    connectDevice,
    currentDevice,
    bundleFiles,
    bootResourceDirectory,
    files,
    resetFirmwareProgress,
    selectedBundleCount,
    selectedFields,
    selectedPayloadCount,
    toast,
  ]);

  const resetFiles = useCallback(() => {
    setFiles({});
    setBundleFiles({});
    setBootResourceDirectory([]);
    setResult(null);
  }, []);

  const progressPercent = progressData ? Math.min(100, Math.round(progressData.progress)) : 0;

  return (
    <PageLayout>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Pro2 / Neo Update</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Standard Protocol V2 update via firmwareUpdateV4. Leave files empty to use remote
              firmware-v1 components, or pick local targets for a manual update.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={sdkInitState.isInitialized ? 'default' : 'outline'}>
              SDK {sdkInitState.isInitialized ? 'ready' : 'initializing'}
            </Badge>
            <Badge variant={currentDevice ? 'default' : 'outline'} className="max-w-full">
              <span className="truncate">{currentDevice?.connectId ?? 'No device'}</span>
            </Badge>
            <Button
              size="sm"
              variant="outline"
              disabled={isRunning || isConnectingLocal || !sdkInitState.isInitialized}
              onClick={() => {
                connectDevice().catch(error => {
                  const message = getErrorMessage(error);
                  addLog('error', message);
                  toast({ title: 'Connect failed', description: message, variant: 'destructive' });
                });
              }}
            >
              {isConnectingLocal ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Connect
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="space-y-5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-base font-semibold text-foreground">Targets</div>
                <div className="text-sm text-muted-foreground">
                  Local files are optional. Empty selection uses the Pro2 remote firmware-v1
                  package.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={selectedPayloadCount > 0 ? 'default' : 'outline'}>
                  {selectedPayloadCount} selected
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isRunning || selectedPayloadCount === 0}
                  className="shadow-none hover:scale-100 hover:shadow-none active:scale-100"
                  onClick={resetFiles}
                >
                  <RotateCcw className="h-4 w-4" />
                  Clear All
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-foreground">Resource bundles</div>
                    <div className="text-xs text-muted-foreground">
                      Written directly to the matching device path.
                    </div>
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {selectedBundleCount}/{BUNDLE_SLOTS.length}
                  </span>
                </div>
                <div className="grid gap-px overflow-hidden rounded-lg border border-border/70 bg-border/70 sm:grid-cols-2 xl:grid-cols-3">
                  {BUNDLE_SLOTS.map(slot => {
                    const selectedFile = bundleFiles[slot.key];
                    return (
                      <CompactFileSlot
                        key={slot.key}
                        label={slot.label}
                        meta={slot.devicePath}
                        formatHint={slot.formatHint}
                        accept={slot.accept}
                        file={selectedFile}
                        disabled={isRunning}
                        onSelect={nextFile =>
                          setBundleFiles(prev => ({ ...prev, [slot.key]: nextFile }))
                        }
                        onClear={() =>
                          setBundleFiles(prev => {
                            const next = { ...prev };
                            delete next[slot.key];
                            return next;
                          })
                        }
                      />
                    );
                  })}
                </div>
                <div className="rounded-md bg-muted/35 px-3 py-2 text-xs text-muted-foreground">
                  SDK skips bundles whose on-device OKPP header already matches.
                </div>
              </section>

              <section className="space-y-2">
                <div>
                  <div className="text-sm font-semibold text-foreground">Boot resources</div>
                  <div className="text-xs text-muted-foreground">
                    Select an extracted resource directory. The manifest maps every archive path to
                    its device path; stable bundles above are excluded from this group.
                  </div>
                </div>
                <input
                  ref={bootResourceInputRef}
                  className="sr-only"
                  type="file"
                  multiple
                  disabled={isRunning}
                  aria-label="Select boot resource directory"
                  {...({
                    webkitdirectory: '',
                    directory: '',
                  } as React.InputHTMLAttributes<HTMLInputElement>)}
                  onChange={event => {
                    setBootResourceDirectory(Array.from(event.currentTarget.files ?? []));
                  }}
                />
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-background p-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isRunning}
                    onClick={() => {
                      if (!bootResourceInputRef.current) return;
                      bootResourceInputRef.current.value = '';
                      bootResourceInputRef.current.click();
                    }}
                  >
                    <FileUp />
                    {bootResourceDirectory.length > 0 ? 'Replace directory' : 'Choose directory'}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {bootResourceDirectory.length > 0
                      ? `${bootResourceDirectory.length} selected files (manifest is validated before upload)`
                      : 'Expected: manifest.json plus its referenced files'}
                  </span>
                  {bootResourceDirectory.length > 0 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={isRunning}
                      onClick={() => setBootResourceDirectory([])}
                    >
                      <X /> Clear
                    </Button>
                  ) : null}
                </div>
              </section>

              <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-foreground">Firmware targets</div>
                    <div className="text-xs text-muted-foreground">
                      Signed packages for individual firmware components.
                    </div>
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {selectedFields.length}/{TARGET_FIELDS.length}
                  </span>
                </div>
                <div className="grid gap-px overflow-hidden rounded-lg border border-border/70 bg-border/70 sm:grid-cols-2 xl:grid-cols-3">
                  {TARGET_FIELDS.map(field => {
                    const selectedFile = files[field.param];
                    return (
                      <CompactFileSlot
                        key={field.param}
                        label={field.label}
                        meta={`target ${field.targetId} · ${
                          DeviceFirmwareTargetType[field.targetId]
                        }`}
                        formatHint={field.formatHint}
                        accept={field.accept}
                        file={selectedFile}
                        disabled={isRunning}
                        onSelect={nextFile =>
                          setFiles(prev => ({ ...prev, [field.param]: nextFile }))
                        }
                        onClear={() =>
                          setFiles(prev => {
                            const next = { ...prev };
                            delete next[field.param];
                            return next;
                          })
                        }
                      />
                    );
                  })}
                </div>
              </section>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
              <Button disabled={isRunning || !sdkInitState.isInitialized} onClick={runUpdate}>
                {isRunning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {selectedPayloadCount === 0
                  ? 'Run firmwareUpdateV4 (remote config)'
                  : `Run firmwareUpdateV4 (${selectedPayloadCount} ${
                      selectedPayloadCount === 1 ? 'file' : 'files'
                    })`}
              </Button>
              {selectedPayloadCount > 0 ? (
                <span className="text-sm text-muted-foreground">
                  {[
                    selectedBundleCount > 0 ? `${selectedBundleCount} RESC bundles` : null,
                    bootResourceDirectory.length > 0 ? 'Boot resources manifest' : null,
                    ...selectedFields.map(field => field.label),
                  ]
                    .filter(Boolean)
                    .join(' + ')}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">
                  Remote Protocol V2 firmware-v1
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {progressData ? (
          <Card>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-foreground">
                  {progressData.progressType === 'transferData'
                    ? 'Transferring data'
                    : 'Installing firmware'}
                </span>
                <span className="text-muted-foreground">
                  {progressPercent}%
                  {progressData.totalBytes
                    ? ` · ${formatBytes(progressData.transferredBytes)} / ${formatBytes(
                        progressData.totalBytes
                      )}`
                    : ''}
                </span>
              </div>
              <Progress value={progressPercent} />
            </CardContent>
          </Card>
        ) : null}

        {result ? (
          <Card>
            <CardContent className="p-4">
              <div className="text-base font-semibold text-foreground">Result</div>
              <div className="mt-2 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                <div>Firmware: {result.firmwareVersion ?? '-'}</div>
                <div>BLE: {result.bleVersion ?? '-'}</div>
                <div>Bootloader: {result.bootloaderVersion ?? '-'}</div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardContent className="p-4">
            <div className="text-base font-semibold text-foreground">Logs</div>
            <div className="mt-2 max-h-72 space-y-1 overflow-auto font-mono text-xs">
              {logs.length === 0 ? (
                <div className="text-muted-foreground">No logs yet.</div>
              ) : (
                logs.map(log => (
                  <div
                    key={log.id}
                    className={
                      log.level === 'error'
                        ? 'text-red-500'
                        : log.level === 'ok'
                        ? 'text-emerald-500'
                        : 'text-muted-foreground'
                    }
                  >
                    [{log.time}] {log.message}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
