import { useCallback, useMemo, useState } from 'react';
import { Cpu, FileCode2, FolderOpen, Settings, Zap } from 'lucide-react';
import { HARDWARE_CONNECT_PROTOCOL } from '@onekeyfe/hd-shared';
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
import type { UnifiedMethodConfig } from '../data/types';

const PRO2_METHOD_GROUPS = [
  {
    id: 'device',
    title: 'Device / Factory',
    icon: Cpu,
    methods: [
      'getProtoVersion',
      'ping',
      'deviceGetDeviceInfo',
      'deviceGetOnboardingStatus',
      'deviceReboot',
      'factoryGetDeviceInfo',
      'factoryDeviceInfoSettings',
    ],
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
    methods: ['pathInfo', 'dirList', 'dirMake', 'dirRemove', 'fileRead', 'fileWrite', 'fileDelete'],
  },
  {
    id: 'filesystemRaw',
    title: 'Filesystem Raw Names',
    icon: FileCode2,
    methods: [
      'filesystemFixPermission',
      'filesystemFormat',
      'filesystemDiskControl',
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

const DEFAULT_SELECTED_METHOD = 'dirList';

const PRO2_METHOD_LABELS: Record<string, string> = {
  getProtoVersion: 'Proto Version',
  ping: 'Ping',
  deviceGetDeviceInfo: 'Device Info',
  deviceReboot: 'Reboot',
  deviceGetOnboardingStatus: 'Onboarding',
  factoryGetDeviceInfo: 'Factory Info',
  factoryDeviceInfoSettings: 'Factory Settings',
  deviceFirmwareUpdate: 'FW Update',
  deviceGetFirmwareUpdateStatus: 'FW Status',
  pathInfo: 'Path Info',
  dirList: 'Dir List',
  dirMake: 'Dir Make',
  dirRemove: 'Dir Remove',
  fileRead: 'File Read',
  fileWrite: 'File Write',
  fileDelete: 'File Delete',
  filesystemFixPermission: 'Fix Permission',
  filesystemFormat: 'Format',
  filesystemDiskControl: 'Disk Control',
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
  getProtoVersion: {
    tx: '60200 (GetProtoVersion)',
    txPayload: '28 eb',
    rx: '60201 (ProtoVersion)',
    rxPayload: '29 eb + proto_version',
    decoded: 'ProtoVersion',
  },
  ping: {
    tx: '60206 (Ping)',
    txPayload: '2e eb 0a 12 48 65 6c 6c 6f 20 66 72 6f 6d 20 57 65 62 55 53 42 21',
    rx: '60207 (Success)',
    rxPayload: '2f eb 0a 12 48 65 6c 6c 6f 20 66 72 6f 6d 20 57 65 62 55 53 42 21',
    decoded: 'Success: "Hello from WebUSB!"',
  },
  deviceGetDeviceInfo: {
    tx: '60600 (DeviceGetDeviceInfo)',
    txPayload: PRO2_DYNAMIC_PAYLOAD,
    rx: '60601 (DeviceInfo)',
    rxPayload: PRO2_DYNAMIC_RESPONSE,
    decoded: 'DeviceInfo',
  },
  deviceReboot: {
    tx: '60400 (DeviceReboot)',
    txPayload: PRO2_DYNAMIC_PAYLOAD,
    rx: '60207 (Success)',
    rxPayload: PRO2_DYNAMIC_RESPONSE,
    decoded: 'Success.message',
  },
  deviceGetOnboardingStatus: {
    tx: '60602 (DeviceGetOnboardingStatus)',
    txPayload: 'ba ec',
    rx: '60603 (DeviceOnboardingStatus)',
    rxPayload: 'bb ec + page_index/page_count/page_name',
    decoded: 'DeviceOnboardingStatus',
  },
  factoryGetDeviceInfo: {
    tx: '60001 (FactoryGetDeviceInfo)',
    txPayload: '61 ea',
    rx: '60002 (FactoryDeviceInfo)',
    rxPayload: PRO2_DYNAMIC_RESPONSE,
    decoded: 'FactoryDeviceInfo',
  },
  factoryDeviceInfoSettings: {
    tx: '60000 (FactoryDeviceInfoSettings)',
    txPayload: PRO2_DYNAMIC_PAYLOAD,
    rx: '60207 (Success)',
    rxPayload: PRO2_DYNAMIC_RESPONSE,
    decoded: 'Success.message',
  },
  deviceFirmwareUpdate: {
    tx: '61000 (DeviceFirmwareUpdate)',
    txPayload: PRO2_DYNAMIC_PAYLOAD,
    rx: '61001 (DeviceFirmwareInstallProgress) / 61003 (DeviceFirmwareUpdateStatus) / 60207 (Success)',
    rxPayload: PRO2_DYNAMIC_RESPONSE,
    decoded: 'Progress / DeviceFirmwareUpdateStatus / Success',
  },
  deviceGetFirmwareUpdateStatus: {
    tx: '61002 (DeviceGetFirmwareUpdateStatus)',
    txPayload: '4a ee',
    rx: '61003 (DeviceFirmwareUpdateStatus)',
    rxPayload: PRO2_DYNAMIC_RESPONSE,
    decoded: 'DeviceFirmwareUpdateStatus',
  },
  filesystemFixPermission: {
    tx: '60800 (FilesystemFixPermission)',
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
  return method === 'fileWrite' || method === 'filesystemFileWrite';
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
      const executionParams = {
        ...params,
        connectProtocol: HARDWARE_CONNECT_PROTOCOL.V2,
      };
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
            <DeviceNotConnectedState
              showFullPage={false}
              connectProtocol={HARDWARE_CONNECT_PROTOCOL.V2}
              pro2Only
            />
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

          {selectedMethod ? (
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
