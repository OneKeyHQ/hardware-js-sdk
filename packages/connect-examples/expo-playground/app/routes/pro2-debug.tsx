import { useCallback, useMemo, useState, type ChangeEvent } from 'react';
import { Cpu, FileCode2, FolderOpen, LockKeyhole, Settings, Zap } from 'lucide-react';
import MethodExecutor from '../components/common/MethodExecutor';
import { DeviceNotConnectedState } from '../components/common/DeviceNotConnectedState';
import { PageLayout } from '../components/common/PageLayout';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { useHardwareMethodExecution } from '../hooks/useHardwareMethodExecution';
import { useDeviceStore } from '../store/deviceStore';
import { device } from '../data/methods/device';
import { firmware } from '../data/methods/firmware';
import { isSdkDebugEnabled } from '../utils/hardwareInstance';
import { logHardware } from '../utils/logger';
import { preparePro2Wallpaper, type PreparedPro2Wallpaper } from '../utils/pro2WallpaperImage';
import type { UnifiedMethodConfig } from '../data/types';

const PRO2_METHOD_GROUPS = [
  {
    id: 'device',
    title: 'Device / Factory',
    icon: Cpu,
    methods: [
      'protocolInfoRequest',
      'ping',
      'getDeviceState',
      'deviceReboot',
      'deviceFactoryInfoGet',
      'deviceFactoryInfoSet',
    ],
  },
  {
    id: 'wallet',
    title: 'Wallet / State',
    icon: LockKeyhole,
    methods: [
      'deviceUnlock',
      'deviceLock',
      'deviceGetOnboardingStatus',
      'getPassphraseState',
      'deviceSessionOpen',
      'deviceCancel',
    ],
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: Settings,
    methods: ['deviceSettingsSet', 'deviceSettingsPageShow', 'deviceUploadWallpaper'],
  },
  {
    id: 'firmware',
    title: 'Firmware',
    icon: Zap,
    methods: ['deviceFirmwareUpdate', 'deviceGetFirmwareUpdateStatus'],
  },
  {
    id: 'filesystemAliases',
    title: 'Filesystem Aliases',
    icon: FolderOpen,
    methods: [
      'filesystemPathInfoQuery',
      'filesystemDirList',
      'filesystemDirMake',
      'filesystemDirRemove',
      'filesystemFileRead',
      'filesystemFileWrite',
      'filesystemFileDelete',
    ],
  },
  {
    id: 'filesystemRaw',
    title: 'Filesystem Raw Names',
    icon: FileCode2,
    methods: [
      'filesystemPermissionFix',
      'filesystemFormat',
      'filesystemPathInfoQuery',
      'filesystemDirList',
      'filesystemDirMake',
      'filesystemDirRemove',
      'filesystemFileRead',
      'filesystemFileWrite',
      'filesystemFileDelete',
    ],
  },
] as const;

const DEFAULT_SELECTED_METHOD = 'filesystemDirList';

const PRO2_METHOD_LABELS: Record<string, string> = {
  protocolInfoRequest: 'Protocol Info',
  ping: 'Ping',
  getDeviceState: 'Device State',
  deviceReboot: 'Reboot',
  deviceFactoryInfoGet: 'Factory Info',
  deviceFactoryInfoSet: 'Factory Settings',
  deviceSettingsSet: 'Settings Set',
  deviceSettingsPageShow: 'Settings Page',
  deviceUploadWallpaper: 'Upload Wallpaper',
  deviceUnlock: 'Unlock',
  deviceLock: 'Lock',
  deviceGetOnboardingStatus: 'Onboarding Status',
  getPassphraseState: 'Wallet State',
  deviceSessionOpen: 'Wallet Session',
  deviceCancel: 'Cancel',
  deviceFirmwareUpdate: 'FW Update',
  deviceGetFirmwareUpdateStatus: 'FW Status',
  pathInfo: 'Path Info',
  dirList: 'Dir List',
  dirMake: 'Dir Make',
  dirRemove: 'Dir Remove',
  fileRead: 'File Read',
  fileWrite: 'File Write',
  fileDelete: 'File Delete',
  filesystemPermissionFix: 'Fix Permission',
  filesystemFormat: 'Format',
  filesystemPathInfoQuery: 'Raw Path Info',
  filesystemDirList: 'Raw Dir List',
  filesystemDirMake: 'Raw Dir Make',
  filesystemDirRemove: 'Raw Dir Remove',
  filesystemFileRead: 'Raw File Read',
  filesystemFileWrite: 'Raw File Write',
  filesystemFileDelete: 'Raw File Delete',
};

type MethodWireInfo = {
  tx: string;
  txPayload?: string;
  rx: string;
  rxPayload?: string;
  decoded: string;
};

const PRO2_DYNAMIC_PAYLOAD = 'msg_type(little-endian) + protobuf(Request Parameters)';
const PRO2_DYNAMIC_RESPONSE = 'msg_type(little-endian) + protobuf response';

const PRO2_METHOD_WIRE_INFO: Record<string, MethodWireInfo> = {
  protocolInfoRequest: {
    tx: '60200 (ProtocolInfoRequest)',
    txPayload: '28 eb',
    rx: '60201 (ProtocolInfo)',
    rxPayload: '29 eb + version/supported_messages/protobuf_definition',
    decoded: 'ProtocolInfo',
  },
  ping: {
    tx: '60206 (Ping)',
    txPayload: '2e eb 0a 12 48 65 6c 6c 6f 20 66 72 6f 6d 20 57 65 62 55 53 42 21',
    rx: '60207 (Success)',
    rxPayload: '2f eb 0a 12 48 65 6c 6c 6f 20 66 72 6f 6d 20 57 65 62 55 53 42 21',
    decoded: 'Success: "Hello from WebUSB!"',
  },
  getDeviceState: {
    tx: 'Cached state: no transport request',
    txPayload:
      'identity/versions/verification: DeviceInfoGet; settings: DeviceSettingsGet; status: DeviceStatusGet (normal mode only)',
    rx: 'Response depends on explicitly refreshed sections',
    rxPayload: PRO2_DYNAMIC_RESPONSE,
    decoded: 'Canonical DeviceState snapshot',
  },
  deviceReboot: {
    tx: '60400 (DeviceReboot)',
    txPayload: PRO2_DYNAMIC_PAYLOAD,
    rx: '60207 (Success)',
    rxPayload: PRO2_DYNAMIC_RESPONSE,
    decoded: 'Success.message',
  },
  deviceFactoryInfoGet: {
    tx: '60001 (DeviceFactoryInfoGet)',
    txPayload: '61 ea',
    rx: '60002 (DeviceFactoryInfo)',
    rxPayload: PRO2_DYNAMIC_RESPONSE,
    decoded: 'DeviceFactoryInfo',
  },
  deviceFactoryInfoSet: {
    tx: '60000 (DeviceFactoryInfoSet)',
    txPayload: PRO2_DYNAMIC_PAYLOAD,
    rx: '60207 (Success)',
    rxPayload: PRO2_DYNAMIC_RESPONSE,
    decoded: 'Success.message',
  },
  deviceUnlock: {
    tx: '60608 (DeviceSessionAskPin) + 60602 (DeviceStatusGet)',
    txPayload: 'PIN entry on device + empty status request',
    rx: '60207 (Success) + 60603 (DeviceStatus)',
    rxPayload: PRO2_DYNAMIC_RESPONSE,
    decoded: 'Features with refreshed unlocked/passphrase status',
  },
  deviceLock: {
    tx: '24 (LockDevice)',
    txPayload: 'empty request',
    rx: '60207 (Success)',
    rxPayload: PRO2_DYNAMIC_RESPONSE,
    decoded: 'Success.message',
  },
  deviceGetOnboardingStatus: {
    tx: '60604 (DevGetOnboardingStatus)',
    txPayload: 'bc ec',
    rx: '60605 (DevOnboardingStatus)',
    rxPayload: PRO2_DYNAMIC_RESPONSE,
    decoded: 'DevOnboardingStatus',
  },
  getPassphraseState: {
    tx: '60606 (DeviceSessionOpen), optionally 60608 (DeviceSessionAskPin)',
    txPayload: 'wallet selection/resume coordinated by hd-core',
    rx: '60607 (DeviceSession), optionally 60603 (DeviceStatus)',
    rxPayload: PRO2_DYNAMIC_RESPONSE,
    decoded: 'passphraseState',
  },
  deviceSessionOpen: {
    tx: '60606 (DeviceSessionOpen)',
    txPayload: PRO2_DYNAMIC_PAYLOAD,
    rx: '60607 (DeviceSession)',
    rxPayload: PRO2_DYNAMIC_RESPONSE,
    decoded: 'session_id / btc_test_address',
  },
  deviceCancel: {
    tx: '20 (Cancel)',
    txPayload: 'empty request',
    rx: '60207 (Success)',
    rxPayload: PRO2_DYNAMIC_RESPONSE,
    decoded: 'Success.message',
  },
  deviceSettingsSet: {
    tx: '60412 (DeviceSettingsSet)',
    txPayload: PRO2_DYNAMIC_PAYLOAD,
    rx: '60207 (Success)',
    rxPayload: PRO2_DYNAMIC_RESPONSE,
    decoded: 'Success.message',
  },
  deviceSettingsPageShow: {
    tx: '60413 (DeviceSettingsPageShow)',
    txPayload: PRO2_DYNAMIC_PAYLOAD,
    rx: '60207 (Success)',
    rxPayload: PRO2_DYNAMIC_RESPONSE,
    decoded: 'Success.message',
  },
  deviceUploadWallpaper: {
    tx: 'FilesystemDirMake + FilesystemFileWrite + DeviceSettingsSet(wallpaper_path)',
    txPayload: 'LVGL v9 RGB565/RGB565A8 .bin -> vol1:/wallpapers/',
    rx: 'Success / FilesystemFile / Success',
    rxPayload: PRO2_DYNAMIC_RESPONSE,
    decoded: 'path / size / colorFormat / message',
  },
  deviceFirmwareUpdate: {
    tx: '61000 (DeviceFirmwareUpdateRequest)',
    txPayload: PRO2_DYNAMIC_PAYLOAD,
    rx: '61002 (DeviceFirmwareUpdateStatus) / 60207 (Success)',
    rxPayload: PRO2_DYNAMIC_RESPONSE,
    decoded: 'DeviceFirmwareUpdateStatus / Success',
  },
  deviceGetFirmwareUpdateStatus: {
    tx: '61001 (DeviceFirmwareUpdateStatusGet)',
    txPayload: '49 ee',
    rx: '61002 (DeviceFirmwareUpdateStatus)',
    rxPayload: PRO2_DYNAMIC_RESPONSE,
    decoded: 'DeviceFirmwareUpdateStatus',
  },
  filesystemPermissionFix: {
    tx: '60800 (FilesystemPermissionFix)',
    txPayload: '80 ed',
    rx: '60207 (Success)',
    rxPayload: PRO2_DYNAMIC_RESPONSE,
    decoded: 'Success.message',
  },
  filesystemFormat: {
    tx: '60811 (FilesystemFormat)',
    txPayload: '8b ed',
    rx: '60207 (Success)',
    rxPayload: PRO2_DYNAMIC_RESPONSE,
    decoded: 'Success.message',
  },
  pathInfo: {
    tx: '60802 (FilesystemPathInfoQuery)',
    txPayload: PRO2_DYNAMIC_PAYLOAD,
    rx: '60801 (FilesystemPathInfo)',
    rxPayload: PRO2_DYNAMIC_RESPONSE,
    decoded: 'FilesystemPathInfo',
  },
  filesystemPathInfoQuery: {
    tx: '60802 (FilesystemPathInfoQuery)',
    txPayload: PRO2_DYNAMIC_PAYLOAD,
    rx: '60801 (FilesystemPathInfo)',
    rxPayload: PRO2_DYNAMIC_RESPONSE,
    decoded: 'FilesystemPathInfo',
  },
  dirList: {
    tx: '60808 (FilesystemDirList)',
    txPayload: PRO2_DYNAMIC_PAYLOAD,
    rx: '60807 (FilesystemDir)',
    rxPayload: PRO2_DYNAMIC_RESPONSE,
    decoded: 'FilesystemDir',
  },
  filesystemDirList: {
    tx: '60808 (FilesystemDirList)',
    txPayload: PRO2_DYNAMIC_PAYLOAD,
    rx: '60807 (FilesystemDir)',
    rxPayload: PRO2_DYNAMIC_RESPONSE,
    decoded: 'FilesystemDir',
  },
  dirMake: {
    tx: '60809 (FilesystemDirMake)',
    txPayload: PRO2_DYNAMIC_PAYLOAD,
    rx: '60207 (Success)',
    rxPayload: PRO2_DYNAMIC_RESPONSE,
    decoded: 'Success.message',
  },
  filesystemDirMake: {
    tx: '60809 (FilesystemDirMake)',
    txPayload: PRO2_DYNAMIC_PAYLOAD,
    rx: '60207 (Success)',
    rxPayload: PRO2_DYNAMIC_RESPONSE,
    decoded: 'Success.message',
  },
  dirRemove: {
    tx: '60810 (FilesystemDirRemove)',
    txPayload: PRO2_DYNAMIC_PAYLOAD,
    rx: '60207 (Success)',
    rxPayload: PRO2_DYNAMIC_RESPONSE,
    decoded: 'Success.message',
  },
  filesystemDirRemove: {
    tx: '60810 (FilesystemDirRemove)',
    txPayload: PRO2_DYNAMIC_PAYLOAD,
    rx: '60207 (Success)',
    rxPayload: PRO2_DYNAMIC_RESPONSE,
    decoded: 'Success.message',
  },
  fileRead: {
    tx: '60804 (FilesystemFileRead)',
    txPayload: PRO2_DYNAMIC_PAYLOAD,
    rx: '60803 (FilesystemFile)',
    rxPayload: PRO2_DYNAMIC_RESPONSE,
    decoded: 'FilesystemFile',
  },
  filesystemFileRead: {
    tx: '60804 (FilesystemFileRead)',
    txPayload: PRO2_DYNAMIC_PAYLOAD,
    rx: '60803 (FilesystemFile)',
    rxPayload: PRO2_DYNAMIC_RESPONSE,
    decoded: 'FilesystemFile',
  },
  fileWrite: {
    tx: '60805 (FilesystemFileWrite)',
    txPayload: PRO2_DYNAMIC_PAYLOAD,
    rx: '60803 (FilesystemFile)',
    rxPayload: PRO2_DYNAMIC_RESPONSE,
    decoded: 'FilesystemFile',
  },
  filesystemFileWrite: {
    tx: '60805 (FilesystemFileWrite)',
    txPayload: PRO2_DYNAMIC_PAYLOAD,
    rx: '60803 (FilesystemFile)',
    rxPayload: PRO2_DYNAMIC_RESPONSE,
    decoded: 'FilesystemFile',
  },
  fileDelete: {
    tx: '60806 (FilesystemFileDelete)',
    txPayload: PRO2_DYNAMIC_PAYLOAD,
    rx: '60207 (Success)',
    rxPayload: PRO2_DYNAMIC_RESPONSE,
    decoded: 'Success.message',
  },
  filesystemFileDelete: {
    tx: '60806 (FilesystemFileDelete)',
    txPayload: PRO2_DYNAMIC_PAYLOAD,
    rx: '60207 (Success)',
    rxPayload: PRO2_DYNAMIC_RESPONSE,
    decoded: 'Success.message',
  },
};

function isFileWriteMethod(method: string) {
  return method === 'filesystemFileWrite';
}

function isCurrentSubmoduleMethod(method: string) {
  return method.startsWith('dev') || method === 'getDeviceState';
}

function getDataSummary(data: unknown) {
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    const name = 'name' in data && typeof data.name === 'string' ? data.name : 'Blob';
    return { data_name: name, data_size: data.size };
  }
  if (data instanceof ArrayBuffer) return { data_size: data.byteLength };
  if (ArrayBuffer.isView(data)) return { data_size: data.byteLength };
  if (typeof data === 'string') return { data_size: new TextEncoder().encode(data).byteLength };
  return {};
}

function sanitizeRequestParameters(method: string, params: Record<string, unknown>) {
  if (method === 'deviceUploadWallpaper' && 'rgba' in params) {
    const { rgba, ...rest } = params;
    return { ...rest, rgba_size: getDataSummary(rgba).data_size };
  }
  if (!isFileWriteMethod(method) || !('data' in params)) return params;
  const { data, ...rest } = params;
  return {
    ...rest,
    ...getDataSummary(data),
  };
}

function buildWireLogData(
  method: UnifiedMethodConfig,
  wireInfo: MethodWireInfo | null,
  params?: Record<string, unknown>,
  result?: Record<string, unknown>
) {
  return {
    source: 'pro2Demo/webusb_test.html',
    method: method.method,
    tx_msg_type: wireInfo?.tx ?? '-',
    tx_payload: wireInfo?.txPayload ?? '-',
    rx_msg_type: wireInfo?.rx ?? '-',
    rx_payload: wireInfo?.rxPayload ?? '-',
    decoded: wireInfo?.decoded ?? '-',
    ...(params ? { request_parameters: sanitizeRequestParameters(method.method, params) } : {}),
    ...(result ? { decoded_result: result } : {}),
  };
}

function ProtocolDebugPanel({
  method,
  wireInfo,
}: {
  method: UnifiedMethodConfig;
  wireInfo: MethodWireInfo | null;
}) {
  if (!wireInfo) return null;

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 text-foreground">
          <Settings className="w-4 h-4 text-primary" />
          <h3 className="text-base font-semibold">
            {PRO2_METHOD_LABELS[method.method] ?? method.method}
          </h3>
          <span className="font-mono text-xs text-muted-foreground">{method.method}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap lg:justify-end">
          <span className="rounded-full border border-primary/30 px-2.5 py-1 text-xs text-primary">
            Protocol V2
          </span>
          {isCurrentSubmoduleMethod(method.method) ? (
            <span className="rounded-full border border-emerald-500/30 px-2.5 py-1 text-xs text-emerald-600">
              current submodule
            </span>
          ) : null}
          <span className="rounded-full border border-primary/30 px-2.5 py-1 text-xs text-primary">
            vol0 defaults
          </span>
        </div>
      </div>

      <div className="rounded-lg bg-[#171717] p-3 font-mono text-[11px] leading-relaxed">
        <div>
          <span className="text-neutral-500">TX msg_type: </span>
          <span className="text-cyan-300">{wireInfo.tx}</span>
        </div>
        <div>
          <span className="text-neutral-500">TX payload: </span>
          <span className="text-cyan-300 break-all">{wireInfo.txPayload || '-'}</span>
        </div>
        <div>
          <span className="text-neutral-500">RX msg_type: </span>
          <span className="text-emerald-400">{wireInfo.rx}</span>
        </div>
        <div>
          <span className="text-neutral-500">RX payload: </span>
          <span className="text-emerald-400 break-all">{wireInfo.rxPayload || '-'}</span>
        </div>
        <div>
          <span className="text-neutral-500">Decoded: </span>
          <span className="text-emerald-400">{wireInfo.decoded}</span>
        </div>
      </div>
    </div>
  );
}

function findMethodConfig(methodName: string, methods: UnifiedMethodConfig[]) {
  return methods.find(method => method.method === methodName);
}

function formatBytes(value: number) {
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

function Pro2WallpaperUploader({
  disabled,
  onUpload,
}: {
  disabled: boolean;
  onUpload: (params: Record<string, unknown>) => Promise<Record<string, unknown>>;
}) {
  const [prepared, setPrepared] = useState<PreparedPro2Wallpaper | null>(null);
  const [fileName, setFileName] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    setStatus('正在解码并裁剪图片…');
    try {
      const next = await preparePro2Wallpaper(file);
      setPrepared(next);
      setFileName(file.name.replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9_-]/g, '-'));
      setStatus('图片已转换为 604 × 1024 RGBA，等待上传。');
    } catch (nextError) {
      setPrepared(null);
      setStatus('');
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!prepared) return;
    setUploading(true);
    setError('');
    setStatus('正在编码 LVGL bin、上传文件并应用壁纸…');
    try {
      const result = await onUpload({
        width: prepared.width,
        height: prepared.height,
        rgba: prepared.rgba,
        ...(fileName ? { fileName } : {}),
      });
      setStatus(`上传完成：${JSON.stringify(result.data ?? result)}`);
    } catch (nextError) {
      setStatus('');
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setUploading(false);
    }
  }, [fileName, onUpload, prepared]);

  return (
    <Card className="rounded-xl border border-border/60 bg-card shadow-sm">
      <CardContent className="p-4 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Pro2 Wallpaper Upload</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            支持 PNG、JPEG/JPG、WebP。图片会按 cover 方式居中裁剪，再转换为 LVGL v9
            RGB565/RGB565A8。
          </p>
        </div>

        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={disabled || uploading}
          onChange={handleFileChange}
          className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:text-primary-foreground"
        />

        {prepared ? (
          <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
            <img
              src={prepared.previewUrl}
              alt="Pro2 wallpaper preview"
              className="mx-auto max-h-[360px] rounded-xl border border-border object-contain"
            />
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-3">
                <span className="text-muted-foreground">原始尺寸</span>
                <span>
                  {prepared.originalWidth} × {prepared.originalHeight}
                </span>
                <span className="text-muted-foreground">输入类型</span>
                <span>{prepared.mimeType}</span>
                <span className="text-muted-foreground">目标尺寸</span>
                <span>604 × 1024</span>
                <span className="text-muted-foreground">编码格式</span>
                <span>{prepared.hasTransparency ? 'RGB565A8' : 'RGB565'}</span>
                <span className="text-muted-foreground">预计大小</span>
                <span>{formatBytes(prepared.estimatedBinSize)}</span>
              </div>
              <label className="block space-y-1">
                <span className="text-muted-foreground">设备文件名（可选）</span>
                <input
                  value={fileName}
                  onChange={event => setFileName(event.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3"
                  placeholder="wallpaper-name"
                />
              </label>
              <Button disabled={disabled || uploading} onClick={handleUpload}>
                {uploading ? 'Uploading…' : 'Upload and Apply'}
              </Button>
            </div>
          </div>
        ) : null}

        {status ? <div className="rounded-md bg-muted p-3 text-sm break-all">{status}</div> : null}
        {error ? (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function Pro2DebugPage() {
  const { currentDevice } = useDeviceStore();
  const { executeMethod } = useHardwareMethodExecution();
  const [selectedMethodName, setSelectedMethodName] = useState(DEFAULT_SELECTED_METHOD);

  const pro2Methods = useMemo(() => {
    const allMethods = [...device.api, ...firmware.api];
    const orderedNames = PRO2_METHOD_GROUPS.flatMap(group => group.methods);
    return orderedNames
      .map(methodName => findMethodConfig(methodName, allMethods))
      .filter((method): method is UnifiedMethodConfig => Boolean(method));
  }, []);

  const selectedMethod = useMemo(() => {
    return (
      findMethodConfig(selectedMethodName, pro2Methods) ??
      findMethodConfig(DEFAULT_SELECTED_METHOD, pro2Methods) ??
      pro2Methods[0]
    );
  }, [pro2Methods, selectedMethodName]);
  const selectedWireInfo = selectedMethod ? PRO2_METHOD_WIRE_INFO[selectedMethod.method] : null;
  const sdkDebugEnabled = isSdkDebugEnabled();

  const handleMethodExecution = useCallback(
    async (params: Record<string, unknown>): Promise<Record<string, unknown>> => {
      if (!selectedMethod) {
        throw new Error('Method configuration not found');
      }
      const executionParams = { ...params };
      logHardware(
        'Pro2 demo protocol trace',
        buildWireLogData(selectedMethod, selectedWireInfo, executionParams)
      );
      const result = await executeMethod(executionParams, selectedMethod);
      logHardware(
        'Pro2 decoded response',
        buildWireLogData(selectedMethod, selectedWireInfo, undefined, result)
      );
      return result;
    },
    [executeMethod, selectedMethod, selectedWireInfo]
  );

  return (
    <PageLayout fixedHeight>
      <div className="px-4 py-3 space-y-3 min-h-full">
        <div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">OneKey Pro 2 Debug</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Protocol V2 commands via hd-common-connect-sdk / hd-core.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={sdkDebugEnabled ? 'secondary' : 'outline'}>
                SDK debug: {sdkDebugEnabled ? 'enabled' : 'off'}
              </Badge>
              <Badge variant={currentDevice ? 'default' : 'outline'}>
                {currentDevice ? currentDevice.connectId : 'No device'}
              </Badge>
            </div>
          </div>
        </div>

        {!currentDevice && (
          <div>
            <DeviceNotConnectedState showFullPage={false} pro2Only />
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Card className="rounded-xl border border-border/60 bg-card shadow-sm">
            <CardContent className="p-3 space-y-3">
              <h2 className="text-base font-semibold text-foreground">Protobuf Messages</h2>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-4 gap-y-2">
                {PRO2_METHOD_GROUPS.map(group => {
                  const Icon = group.icon;
                  const availableMethods = group.methods
                    .map(methodName => findMethodConfig(methodName, pro2Methods))
                    .filter((method): method is UnifiedMethodConfig => Boolean(method));

                  return (
                    <div key={group.id} className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                        <Icon className="w-3 h-3" />
                        <span>{group.title}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {availableMethods.map(method => (
                          <Button
                            key={method.method}
                            size="sm"
                            variant="outline"
                            className={`h-7 rounded-md px-2.5 text-[11px] ${
                              selectedMethod?.method === method.method
                                ? 'border-primary/40 bg-primary/10 text-primary'
                                : 'bg-background text-foreground hover:bg-muted'
                            }`}
                            onClick={() => setSelectedMethodName(method.method)}
                          >
                            {PRO2_METHOD_LABELS[method.method] ?? method.method}
                          </Button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedMethod ? (
                <ProtocolDebugPanel method={selectedMethod} wireInfo={selectedWireInfo} />
              ) : null}
            </CardContent>
          </Card>

          {selectedMethod?.method === 'deviceUploadWallpaper' ? (
            <Pro2WallpaperUploader disabled={!currentDevice} onUpload={handleMethodExecution} />
          ) : selectedMethod ? (
            <MethodExecutor
              key={selectedMethod.method}
              methodConfig={selectedMethod}
              executionHandler={handleMethodExecution}
              devicePanelTitle={null}
              layout="debug-first"
              type={
                firmware.api.some(method => method.method === selectedMethod.method)
                  ? 'firmware'
                  : 'standard'
              }
            />
          ) : (
            <Card className="rounded-xl border border-border/60 bg-card shadow-sm">
              <CardContent className="py-6 text-sm text-muted-foreground">
                Protocol V2 method configuration not found.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
