import { useCallback, useMemo, useRef, useState } from 'react';
import { CheckCircle2, FileUp, Loader2, Play, RotateCcw, Search } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
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
import type { DeviceInfo } from '../types/hardware';

const TARGET_FIELDS = [
  {
    param: 'bootloaderBinary',
    label: 'Bootloader',
    targetId: 2,
    targetName: 'FW_MGMT_TARGET_BOOTLOADER',
    accept: '.okpkg,.bin',
    formatHint: 'signed OKPP .okpkg',
  },
  {
    param: 'applicationP1Binary',
    label: 'APP P1',
    targetId: 3,
    targetName: 'FW_MGMT_TARGET_APPLICATION_P1',
    accept: '.okpkg,.bin',
    formatHint: 'signed OKPP .okpkg',
  },
  {
    param: 'applicationP2Binary',
    label: 'APP P2',
    targetId: 4,
    targetName: 'FW_MGMT_TARGET_APPLICATION_P2',
    accept: '.okpkg,.bin',
    formatHint: 'signed OKPP .okpkg',
  },
  {
    param: 'coprocessorBinary',
    label: 'Coprocessor',
    targetId: 5,
    targetName: 'FW_MGMT_TARGET_COPROCESSOR',
    accept: '.okpkg,.bin',
    formatHint: 'signed target package',
  },
  {
    param: 'se01Binary',
    label: 'SE01',
    targetId: 6,
    targetName: 'FW_MGMT_TARGET_SE01',
    accept: '.okpkg,.bin',
    formatHint: 'signed target package',
  },
  {
    param: 'se02Binary',
    label: 'SE02',
    targetId: 7,
    targetName: 'FW_MGMT_TARGET_SE02',
    accept: '.okpkg,.bin',
    formatHint: 'signed target package',
  },
  {
    param: 'se03Binary',
    label: 'SE03',
    targetId: 8,
    targetName: 'FW_MGMT_TARGET_SE03',
    accept: '.okpkg,.bin',
    formatHint: 'signed target package',
  },
  {
    param: 'se04Binary',
    label: 'SE04',
    targetId: 9,
    targetName: 'FW_MGMT_TARGET_SE04',
    accept: '.okpkg,.bin',
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
  const [isRunning, setIsRunning] = useState(false);
  const [isConnectingLocal, setIsConnectingLocal] = useState(false);
  const [logs, setLogs] = useState<UpdateLog[]>([]);
  const [result, setResult] = useState<UpdateVersionsResult | null>(null);
  const logIdRef = useRef(0);

  const selectedFields = useMemo(() => TARGET_FIELDS.filter(field => files[field.param]), [files]);
  const selectedBundleCount = BUNDLE_SLOTS.filter(slot => bundleFiles[slot.key]).length;
  const selectedPayloadCount = selectedFields.length + selectedBundleCount;

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
        throw new Error(response.payload?.error || 'searchDevices failed');
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
      const resourceBundleFiles: Array<{ binary: ArrayBuffer; devicePath: string }> = [];
      for (const slot of BUNDLE_SLOTS) {
        const file = bundleFiles[slot.key];
        if (!file) continue;
        addLog('info', `Loading RESC bundle ${slot.label}: ${file.name} (${formatBytes(file.size)})`);
        resourceBundleFiles.push({
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

      if (resourceBundleFiles.length > 0) {
        params.resourceBundleFiles = resourceBundleFiles;
        addLog(
          'info',
          `Prepared resourceBundleFiles: ${resourceBundleFiles.length} bundles, ${formatBytes(
            resourceBundleFiles.reduce((total, item) => total + item.binary.byteLength, 0)
          )}`
        );
      }

      if (selectedPayloadCount === 0) {
        addLog('info', 'firmwareUpdateV4 remote config: pro2 firmware-v1 components');
      } else {
        const targetNames = [
          selectedBundleCount > 0 ? `RESC bundles(${selectedBundleCount})` : null,
          ...selectedFields.map(field => `${field.label}(${field.targetId})`),
        ].filter(Boolean);
        addLog('info', `firmwareUpdateV4 targets: ${targetNames.join(', ')}`);
      }
      const response = await callHardwareAPI('firmwareUpdateV4', {
        connectId: device.connectId,
        ...params,
      });
      if (!response.success) {
        throw new Error(response.payload?.error || 'firmwareUpdateV4 failed');
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
    setResult(null);
  }, []);

  const progressPercent = progressData ? Math.min(100, Math.round(progressData.progress)) : 0;

  return (
    <PageLayout>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Pro2 Update</h1>
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
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-base font-semibold text-foreground">Targets</div>
                <div className="text-sm text-muted-foreground">
                  Local files are optional. Empty selection uses the Pro2 remote firmware-v1
                  package.
                </div>
              </div>
              <Button size="sm" variant="outline" disabled={isRunning} onClick={resetFiles}>
                <RotateCcw className="h-4 w-4" />
                Clear All
              </Button>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {BUNDLE_SLOTS.map(slot => {
                const selectedFile = bundleFiles[slot.key];
                return (
                  <div
                    key={slot.key}
                    className="rounded-lg border border-border/60 bg-background/70 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground">
                          {slot.label}
                        </div>
                        <div className="truncate font-mono text-[11px] text-muted-foreground">
                          {slot.devicePath}
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {slot.formatHint}
                        </div>
                      </div>
                      {selectedFile ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      ) : (
                        <FileUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                    </div>
                    <Input
                      type="file"
                      accept={slot.accept}
                      disabled={isRunning}
                      onChange={event => {
                        const nextFile = event.currentTarget.files?.[0];
                        if (!nextFile) return;
                        setBundleFiles(prev => ({ ...prev, [slot.key]: nextFile }));
                      }}
                    />
                    {selectedFile ? (
                      <div className="mt-2 truncate text-xs text-muted-foreground">
                        {selectedFile.name} · {formatBytes(selectedFile.size)}
                      </div>
                    ) : null}
                  </div>
                );
              })}
              <div className="rounded-lg border border-dashed border-border/40 bg-muted/30 p-3 lg:col-span-2">
                <div className="text-xs text-muted-foreground">
                  RESC bundles use FilesystemFileWrite to overwrite okpkg files directly at the
                  device path. SDK skips bundles whose on-device OKPP header already matches.
                </div>
              </div>
              {TARGET_FIELDS.map(field => {
                const selectedFile = files[field.param];
                return (
                  <div
                    key={field.param}
                    className="rounded-lg border border-border/60 bg-background/70 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground">{field.label}</div>
                        <div className="truncate font-mono text-[11px] text-muted-foreground">
                          target_id = {field.targetId} · {field.targetName}
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {field.formatHint}
                        </div>
                      </div>
                      {selectedFile ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      ) : (
                        <FileUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                    </div>
                    <Input
                      type="file"
                      accept={field.accept}
                      disabled={isRunning}
                      onChange={event => {
                        const nextFile = event.currentTarget.files?.[0];
                        if (!nextFile) return;
                        setFiles(prev => ({ ...prev, [field.param]: nextFile }));
                      }}
                    />
                    {selectedFile ? (
                      <div className="mt-2 truncate text-xs text-muted-foreground">
                        {selectedFile.name} · {formatBytes(selectedFile.size)}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
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
                    ...selectedFields.map(field => field.label),
                  ]
                    .filter(Boolean)
                    .join(' + ')}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">Remote pro2 firmware-v1</span>
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
