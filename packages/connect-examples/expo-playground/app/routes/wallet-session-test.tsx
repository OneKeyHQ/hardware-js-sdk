import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  KeyRound,
  Loader2,
  Play,
  RotateCcw,
  ShieldAlert,
  SkipForward,
  Usb,
  XCircle,
} from 'lucide-react';
import { UI_REQUEST } from '@onekeyfe/hd-core';

import { DeviceNotConnectedState } from '../components/common/DeviceNotConnectedState';
import { PageLayout } from '../components/common/PageLayout';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Progress } from '../components/ui/Progress';
import {
  WALLET_SESSION_CASES,
  assertAttachPinUnlocked,
  buildWrongDeviceId,
  summarizeWalletSession,
  type WalletSessionCaseDefinition,
} from '../features/wallet-session-test/walletSessionCases';
import {
  createWalletSessionTraceProxy,
  type WalletSessionApiTrace,
} from '../features/wallet-session-test/walletSessionTrace';
import { hydrateConnectedDeviceInfo, searchDevices } from '../services/hardwareService';
import { applyDeviceStateToDevice } from '../services/deviceStateAdapter';
import { useDeviceStore } from '../store/deviceStore';
import { useTransportPersistence } from '../store/persistenceStore';
import type { DeviceInfo } from '../types/hardware';
import { SDKUtils } from '../utils/hardwareInstance';

import type {
  CoreApi,
  DeviceState,
  OpenWalletSessionParams,
  OpenWalletSessionPayload,
  UiEvent,
} from '@onekeyfe/hd-core';

type CaseStatus = 'idle' | 'running' | 'passed' | 'failed' | 'skipped';

type CaseResult = {
  status: CaseStatus;
  message?: string;
  details?: Record<string, unknown>;
  calls?: WalletSessionApiTrace[];
  durationMs?: number;
};

type WalletReference = {
  deviceId: string;
  passphraseState: string;
  address?: string;
};

type RuntimeContext = {
  baselineDeviceId?: string;
  baselineProtocol?: 'V1' | 'V2';
  standardAddress?: string;
  hiddenA?: WalletReference;
  hiddenB?: WalletReference;
  attachWallet?: WalletReference;
  preReset?: {
    deviceId: string;
    standardAddress: string;
    hidden?: WalletReference;
  };
};

type SafeCaseOutput = {
  message: string;
  details?: Record<string, unknown>;
  skipped?: boolean;
};

const EVM_TEST_PATH = "m/44'/60'/0'/0/0";
const RUNTIME_CHECKPOINT_KEY = 'onekey.wallet-session-test.runtime-checkpoint';

const CATEGORY_LABELS: Record<WalletSessionCaseDefinition['category'], string> = {
  environment: '环境与协议',
  standard: '标准钱包',
  hidden: '隐藏钱包与隔离',
  cache: 'Session 缓存范围',
  'attach-pin': 'Attach-to-PIN',
  identity: '设备身份、重连与重置',
};

function getFailureInfo(response: unknown): { code: string; error: string } {
  if (!response || typeof response !== 'object') return { code: '', error: '未知错误' };
  const payload = (response as { payload?: unknown }).payload;
  if (!payload || typeof payload !== 'object') {
    return { code: '', error: typeof payload === 'string' ? payload : '未知错误' };
  }
  const data = payload as { code?: unknown; error?: unknown; message?: unknown };
  return {
    code: data.code == null ? '' : String(data.code),
    error:
      typeof data.error === 'string'
        ? data.error
        : typeof data.message === 'string'
        ? data.message
        : '未知错误',
  };
}

function requireSuccess<T>(response: unknown, operation: string): T {
  if (response && typeof response === 'object' && (response as { success?: unknown }).success) {
    return (response as { payload: T }).payload;
  }
  const failure = getFailureInfo(response);
  throw new Error(`${operation} 失败：${failure.code || failure.error}`);
}

function requireDeviceId(state: DeviceState): string {
  if (!state.identity.deviceId) throw new Error('设备状态没有返回 deviceId');
  return state.identity.deviceId;
}

function requireAddress(response: unknown): string {
  const payload = requireSuccess<{ address?: unknown }>(response, 'evmGetAddress');
  if (typeof payload.address !== 'string' || !payload.address) {
    throw new Error('evmGetAddress 没有返回地址');
  }
  return payload.address;
}

function durationText(durationMs?: number): string {
  if (durationMs === undefined) return '';
  return durationMs < 1000 ? `${durationMs} ms` : `${(durationMs / 1000).toFixed(1)} s`;
}

function statusBadge(status: CaseStatus) {
  if (status === 'running') {
    return (
      <Badge variant="outline" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" /> 执行中
      </Badge>
    );
  }
  if (status === 'passed') {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="h-3 w-3" /> 通过
      </Badge>
    );
  }
  if (status === 'failed') {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" /> 失败
      </Badge>
    );
  }
  if (status === 'skipped') {
    return (
      <Badge variant="secondary" className="gap-1">
        <SkipForward className="h-3 w-3" /> 已跳过
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <Circle className="h-3 w-3" /> 未执行
    </Badge>
  );
}

export default function WalletSessionTestPage() {
  const {
    currentDevice,
    setConnectedDevices,
    setCurrentDevice,
    setDeviceFeatures,
    setIsConnecting,
  } = useDeviceStore();
  const { preferredType: transportType } = useTransportPersistence();
  const [results, setResults] = useState<Record<string, CaseResult>>({});
  const [runningCaseId, setRunningCaseId] = useState<string | null>(null);
  const [contextVersion, setContextVersion] = useState(0);
  const [destructiveAcknowledged, setDestructiveAcknowledged] = useState(false);
  const contextRef = useRef<RuntimeContext>({});
  const passphrasePromptCountRef = useRef(0);

  const updateContext = useCallback((patch: Partial<RuntimeContext>) => {
    contextRef.current = { ...contextRef.current, ...patch };
    setContextVersion(value => value + 1);
  }, []);

  useEffect(() => {
    let active = true;
    let sdk: CoreApi | undefined;
    const handleUiEvent = (event: UiEvent) => {
      if (event.type === UI_REQUEST.REQUEST_PASSPHRASE) {
        passphrasePromptCountRef.current += 1;
      }
    };

    SDKUtils.getInstance().then(instance => {
      if (!active) return;
      sdk = instance;
      sdk.on('UI_EVENT', handleUiEvent);
    });

    return () => {
      active = false;
      sdk?.off('UI_EVENT', handleUiEvent);
    };
  }, []);

  const refreshDeviceState = useCallback(
    async (sdk: CoreApi, device: DeviceInfo): Promise<DeviceState> => {
      const response = await sdk.getDeviceState(device.connectId, { scope: 'runtime' });
      const state = requireSuccess<DeviceState>(response, 'getDeviceState');
      setCurrentDevice(applyDeviceStateToDevice(device, state));
      return state;
    },
    [setCurrentDevice]
  );

  const reconnectDevice = useCallback(async (): Promise<DeviceInfo> => {
    setIsConnecting(true);
    try {
      const response = await searchDevices();
      const devices = requireSuccess<DeviceInfo[]>(response, 'searchDevices');
      if (!devices.length) throw new Error('没有找到已授权的 WebUSB 设备');
      const previousSerial = currentDevice?.serialNo || currentDevice?.uuid;
      const selected =
        devices.find(device => (device.serialNo || device.uuid) === previousSerial) ?? devices[0];
      const hydrated = await hydrateConnectedDeviceInfo(selected);
      setConnectedDevices([hydrated, ...devices.filter(device => device !== selected)]);
      setCurrentDevice(hydrated);
      setDeviceFeatures(hydrated.features);
      return hydrated;
    } finally {
      setIsConnecting(false);
    }
  }, [currentDevice, setConnectedDevices, setCurrentDevice, setDeviceFeatures, setIsConnecting]);

  const openWallet = useCallback(
    async (
      sdk: CoreApi,
      device: DeviceInfo,
      params: OpenWalletSessionParams
    ): Promise<OpenWalletSessionPayload> => {
      const response = await sdk.openWalletSession(device.connectId, params);
      return requireSuccess<OpenWalletSessionPayload>(response, 'openWalletSession');
    },
    []
  );

  const getAddress = useCallback(
    async (
      sdk: CoreApi,
      device: DeviceInfo,
      deviceId: string,
      wallet: { standard: true } | { passphraseState: string }
    ) => {
      const response = await sdk.evmGetAddress(device.connectId, deviceId, {
        path: EVM_TEST_PATH,
        showOnOneKey: false,
        ...('standard' in wallet ? { useEmptyPassphrase: true } : wallet),
      });
      return requireAddress(response);
    },
    []
  );

  const assertExpectedFailure = useCallback(
    (response: unknown, expectedCodes: string[], promptCountBefore?: number): SafeCaseOutput => {
      if (response && typeof response === 'object' && (response as { success?: unknown }).success) {
        throw new Error(`预期失败，但 SDK 调用成功：${expectedCodes.join(' / ')}`);
      }
      const failure = getFailureInfo(response);
      if (!expectedCodes.some(code => failure.code.includes(code))) {
        throw new Error(
          `预期错误 ${expectedCodes.join(' / ')}，实际为 ${failure.code || failure.error}`
        );
      }
      if (
        promptCountBefore !== undefined &&
        passphrasePromptCountRef.current !== promptCountBefore
      ) {
        throw new Error('失败路径意外触发了 Passphrase 钱包选择');
      }
      return {
        message: `按预期拒绝：${failure.code}`,
        details: { passphrasePrompted: false },
      };
    },
    []
  );

  const executeCase = useCallback(
    async (
      definition: WalletSessionCaseDefinition,
      calls: WalletSessionApiTrace[]
    ): Promise<SafeCaseOutput> => {
      if (transportType !== 'webusb') {
        throw new Error('本模块只验证浏览器 WebUSB，请先在首页切换到 WebUSB');
      }
      if (!currentDevice) throw new Error('请先连接 WebUSB 设备');

      const sdk = createWalletSessionTraceProxy(await SDKUtils.getInstance(), trace => {
        calls.push(trace);
      });
      const context = contextRef.current;
      const baselineDeviceId = context.baselineDeviceId;

      switch (definition.id) {
        case 'webusb-baseline': {
          const state = await refreshDeviceState(sdk, currentDevice);
          const deviceId = requireDeviceId(state);
          if (state.protocol !== 'V1' && state.protocol !== 'V2') {
            throw new Error(`不支持的协议状态：${state.protocol}`);
          }
          const checkpointText = window.sessionStorage.getItem(RUNTIME_CHECKPOINT_KEY);
          const checkpoint = checkpointText
            ? (JSON.parse(checkpointText) as { deviceId?: unknown })
            : undefined;
          updateContext({ baselineDeviceId: deviceId, baselineProtocol: state.protocol });
          return {
            message: '已建立实时 WebUSB 设备基线',
            details: {
              protocol: state.protocol,
              deviceId,
              initialized: state.status.initialized,
              unlocked: state.status.unlocked,
              passphraseProtection: state.status.passphraseProtection,
              attachToPinEnabled: state.status.attachToPinEnabled,
              runtimeCheckpointMatches:
                typeof checkpoint?.deviceId === 'string'
                  ? checkpoint.deviceId === deviceId
                  : 'not-set',
            },
          };
        }
        case 'standard-open': {
          if (!baselineDeviceId) throw new Error('缺少设备身份基线');
          const wallet = await openWallet(sdk, currentDevice, { mode: 'standard' });
          if (
            wallet.walletType !== 'standard' ||
            wallet.passphraseState !== null ||
            wallet.deviceId !== baselineDeviceId
          ) {
            throw new Error('标准钱包返回值与实时设备身份不一致');
          }
          return {
            message: '标准钱包契约正确',
            details: summarizeWalletSession(wallet),
          };
        }
        case 'standard-address': {
          if (!baselineDeviceId) throw new Error('缺少设备身份基线');
          const first = await getAddress(sdk, currentDevice, baselineDeviceId, { standard: true });
          const second = await getAddress(sdk, currentDevice, baselineDeviceId, { standard: true });
          if (first !== second) throw new Error('标准钱包同一路径返回了不同地址');
          updateContext({ standardAddress: first });
          return {
            message: '标准钱包地址稳定',
            details: { address: first, repeatedAddressMatches: true },
          };
        }
        case 'hidden-a-select':
        case 'hidden-b-select': {
          if (!baselineDeviceId) throw new Error('缺少设备身份基线');
          const wallet = await openWallet(sdk, currentDevice, {
            mode: 'select-hidden',
          });
          if (wallet.walletType !== 'hidden' || !wallet.passphraseState) {
            throw new Error('设备没有返回完整的隐藏钱包标识');
          }
          if (wallet.deviceId !== baselineDeviceId)
            throw new Error('隐藏钱包 deviceId 与基线不一致');
          const key = definition.id === 'hidden-a-select' ? 'hiddenA' : 'hiddenB';
          const other = key === 'hiddenA' ? context.hiddenB : context.hiddenA;
          if (other?.passphraseState === wallet.passphraseState) {
            throw new Error('钱包 A 与钱包 B 返回了相同 passphraseState，请输入不同 Passphrase');
          }
          updateContext({
            [key]: {
              deviceId: wallet.deviceId,
              passphraseState: wallet.passphraseState,
            },
          });
          return {
            message: `已选择隐藏钱包 ${key === 'hiddenA' ? 'A' : 'B'}`,
            details: summarizeWalletSession(wallet),
          };
        }
        case 'hidden-a-address':
        case 'hidden-b-address': {
          const key = definition.id === 'hidden-a-address' ? 'hiddenA' : 'hiddenB';
          const wallet = context[key];
          if (!wallet) throw new Error(`缺少隐藏钱包 ${key === 'hiddenA' ? 'A' : 'B'}`);
          const first = await getAddress(sdk, currentDevice, wallet.deviceId, {
            passphraseState: wallet.passphraseState,
          });
          const second = await getAddress(sdk, currentDevice, wallet.deviceId, {
            passphraseState: wallet.passphraseState,
          });
          if (first !== second) throw new Error('隐藏钱包同一路径返回了不同地址');
          if (context.standardAddress && first === context.standardAddress) {
            throw new Error('隐藏钱包地址错误地落入标准钱包');
          }
          const other = key === 'hiddenA' ? context.hiddenB : context.hiddenA;
          if (other?.address && first === other.address) throw new Error('钱包 A/B 返回了相同地址');
          updateContext({ [key]: { ...wallet, address: first } });
          return {
            message: `隐藏钱包 ${key === 'hiddenA' ? 'A' : 'B'} 地址稳定且隔离`,
            details: { address: first, repeatedAddressMatches: true },
          };
        }
        case 'hidden-a-resume': {
          const wallet = context.hiddenA;
          if (!wallet?.address) throw new Error('缺少钱包 A 地址基线');
          const prompts = passphrasePromptCountRef.current;
          const resumed = await openWallet(sdk, currentDevice, {
            mode: 'resume-hidden',
            deviceId: wallet.deviceId,
            passphraseState: wallet.passphraseState,
          });
          const address = await getAddress(sdk, currentDevice, wallet.deviceId, {
            passphraseState: wallet.passphraseState,
          });
          if (address !== wallet.address) throw new Error('恢复钱包 A 后地址发生变化');
          if (passphrasePromptCountRef.current !== prompts)
            throw new Error('恢复钱包 A 时重新选择了钱包');
          return {
            message: '钱包 A 已从 SDK Session Store 恢复',
            details: summarizeWalletSession(resumed),
          };
        }
        case 'wallet-isolation': {
          const walletA = context.hiddenA;
          const walletB = context.hiddenB;
          if (!walletA?.address || !walletB?.address) throw new Error('缺少 A/B 钱包地址基线');
          const prompts = passphrasePromptCountRef.current;
          await openWallet(sdk, currentDevice, {
            mode: 'resume-hidden',
            deviceId: walletA.deviceId,
            passphraseState: walletA.passphraseState,
          });
          const addressA = await getAddress(sdk, currentDevice, walletA.deviceId, {
            passphraseState: walletA.passphraseState,
          });
          await openWallet(sdk, currentDevice, {
            mode: 'resume-hidden',
            deviceId: walletB.deviceId,
            passphraseState: walletB.passphraseState,
          });
          const addressB = await getAddress(sdk, currentDevice, walletB.deviceId, {
            passphraseState: walletB.passphraseState,
          });
          if (
            addressA !== walletA.address ||
            addressB !== walletB.address ||
            addressA === addressB
          ) {
            throw new Error('钱包 A/B 路由或地址隔离失败');
          }
          if (passphrasePromptCountRef.current !== prompts)
            throw new Error('A/B 恢复过程中重新选择了钱包');
          return {
            message: '钱包 A/B 双向恢复与地址隔离正确',
            details: { walletAStable: true, walletBStable: true, passphrasePrompted: false },
          };
        }
        case 'wrong-device-id': {
          const wallet = context.hiddenA;
          if (!wallet) throw new Error('缺少钱包 A');
          const response = await sdk.evmGetAddress(
            currentDevice.connectId,
            buildWrongDeviceId(wallet.deviceId),
            {
              path: EVM_TEST_PATH,
              showOnOneKey: false,
              passphraseState: wallet.passphraseState,
            }
          );
          return assertExpectedFailure(response, ['DeviceCheckDeviceIdError']);
        }
        case 'wallet-cache-clear': {
          const wallet = context.hiddenA;
          if (!wallet) throw new Error('缺少钱包 A');
          requireSuccess(
            await sdk.clearSessionCache({
              deviceId: wallet.deviceId,
              passphraseState: wallet.passphraseState,
            }),
            'clearSessionCache(wallet)'
          );
          return { message: '只清理了钱包 A 的 SDK Session 缓存' };
        }
        case 'wallet-cache-invalid': {
          const wallet = context.hiddenA;
          if (!wallet) throw new Error('缺少钱包 A');
          const prompts = passphrasePromptCountRef.current;
          const response = await sdk.openWalletSession(currentDevice.connectId, {
            mode: 'resume-hidden',
            deviceId: wallet.deviceId,
            passphraseState: wallet.passphraseState,
          });
          return assertExpectedFailure(response, ['WalletSessionInvalid'], prompts);
        }
        case 'hidden-a-reselect-after-clear': {
          const previous = context.hiddenA;
          if (!previous?.address) throw new Error('缺少钱包 A 地址基线');
          const wallet = await openWallet(sdk, currentDevice, {
            mode: 'select-hidden',
          });
          if (wallet.walletType !== 'hidden' || !wallet.passphraseState) {
            throw new Error('设备没有返回完整的隐藏钱包标识');
          }
          if (wallet.passphraseState !== previous.passphraseState) {
            throw new Error('重新选择后不是原钱包 A；请确认输入了相同测试 Passphrase');
          }
          if (wallet.resumed) {
            throw new Error('清缓存并重新选择后不应标记为恢复旧 Session');
          }
          const address = await getAddress(sdk, currentDevice, wallet.deviceId, {
            passphraseState: wallet.passphraseState,
          });
          if (address !== previous.address) throw new Error('重新选择钱包 A 后地址发生变化');
          updateContext({
            hiddenA: {
              ...previous,
              deviceId: wallet.deviceId,
            },
          });
          return {
            message: '钱包 A 身份稳定，Session 已重新建立',
            details: summarizeWalletSession(wallet),
          };
        }
        case 'other-wallet-survives': {
          const wallet = context.hiddenB;
          if (!wallet?.address) throw new Error('缺少钱包 B 地址基线');
          const prompts = passphrasePromptCountRef.current;
          const resumed = await openWallet(sdk, currentDevice, {
            mode: 'resume-hidden',
            deviceId: wallet.deviceId,
            passphraseState: wallet.passphraseState,
          });
          const address = await getAddress(sdk, currentDevice, wallet.deviceId, {
            passphraseState: wallet.passphraseState,
          });
          if (address !== wallet.address) throw new Error('钱包 B 地址发生变化');
          if (passphrasePromptCountRef.current !== prompts)
            throw new Error('钱包 B 恢复时重新选择了钱包');
          return {
            message: '钱包 B 未受钱包 A 缓存清理影响',
            details: summarizeWalletSession(resumed),
          };
        }
        case 'invalid-cache-params': {
          const wallet = context.hiddenB ?? context.hiddenA;
          if (!wallet) throw new Error('缺少隐藏钱包标识');
          const response = await sdk.clearSessionCache({
            passphraseState: wallet.passphraseState,
          } as never);
          return assertExpectedFailure(response, ['CallMethodInvalidParameter']);
        }
        case 'device-cache-clear': {
          if (!baselineDeviceId) throw new Error('缺少设备身份基线');
          requireSuccess(
            await sdk.clearSessionCache({ deviceId: baselineDeviceId }),
            'clearSessionCache(device)'
          );
          return { message: '已清理当前设备的全部 SDK Session 缓存' };
        }
        case 'device-cache-invalid': {
          const wallet = context.hiddenB;
          if (!wallet) throw new Error('缺少钱包 B');
          const prompts = passphrasePromptCountRef.current;
          const response = await sdk.openWalletSession(currentDevice.connectId, {
            mode: 'resume-hidden',
            deviceId: wallet.deviceId,
            passphraseState: wallet.passphraseState,
          });
          return assertExpectedFailure(response, ['WalletSessionInvalid'], prompts);
        }
        case 'all-cache-clear': {
          requireSuccess(await sdk.clearSessionCache({}), 'clearSessionCache(all)');
          return { message: '已清理 Core 内全部钱包 Session 缓存，未向设备发命令' };
        }
        case 'attach-pin-preflight': {
          const state = await refreshDeviceState(sdk, currentDevice);
          if (state.status.attachToPinEnabled !== true) {
            return {
              message: '设备尚未建立 Attach-to-PIN 绑定，请在设备设置中完成后重试',
              details: { attachToPinEnabled: state.status.attachToPinEnabled },
              skipped: true,
            };
          }
          return {
            message: '设备已报告 Attach-to-PIN 绑定',
            details: { attachToPinEnabled: true },
          };
        }
        case 'attach-pin-select': {
          const prompts = passphrasePromptCountRef.current;
          const wallet = await openWallet(sdk, currentDevice, {
            mode: 'select-hidden',
          });
          if (passphrasePromptCountRef.current !== prompts + 1) {
            throw new Error('Attach PIN 流程应通过一次统一钱包选择弹窗触发');
          }
          if (wallet.walletType !== 'hidden' || !wallet.passphraseState) {
            throw new Error('Attach PIN 没有返回隐藏钱包标识');
          }
          const state = await refreshDeviceState(sdk, currentDevice);
          assertAttachPinUnlocked(state);
          updateContext({
            attachWallet: {
              deviceId: wallet.deviceId,
              passphraseState: wallet.passphraseState,
            },
          });
          return {
            message: 'Attach PIN 钱包选择完成',
            details: summarizeWalletSession(wallet),
          };
        }
        case 'attach-pin-state': {
          const wallet = context.attachWallet;
          if (!wallet) return { message: '没有 Attach PIN 钱包上下文', skipped: true };
          const state = await refreshDeviceState(sdk, currentDevice);
          assertAttachPinUnlocked(state);
          if (requireDeviceId(state) !== wallet.deviceId)
            throw new Error('Attach PIN 后 deviceId 发生变化');
          const address = await getAddress(sdk, currentDevice, wallet.deviceId, {
            passphraseState: wallet.passphraseState,
          });
          updateContext({ attachWallet: { ...wallet, address } });
          return {
            message: 'Attach PIN 状态与隐藏钱包地址一致',
            details: { unlockedAttachPin: true, address },
          };
        }
        case 'reconnect-same-device': {
          if (!baselineDeviceId) throw new Error('缺少设备身份基线');
          const device = await reconnectDevice();
          const state = await refreshDeviceState(sdk, device);
          if (requireDeviceId(state) !== baselineDeviceId) {
            throw new Error('普通重连后 deviceId 发生变化；请确认没有执行 wipe/重新初始化');
          }
          return {
            message: 'WebUSB 普通重连保持相同设备初始化身份',
            details: { deviceIdMatches: true, connectIdUsedAsWalletIdentity: false },
          };
        }
        case 'runtime-restart-checkpoint': {
          if (!baselineDeviceId) throw new Error('缺少设备身份基线');
          window.sessionStorage.setItem(
            RUNTIME_CHECKPOINT_KEY,
            JSON.stringify({ deviceId: baselineDeviceId })
          );
          return {
            message: '检查点已保存。刷新页面后重新连接并执行“WebUSB 连接与身份基线”',
            details: { persistedSessionId: false, persistedPassphraseState: false },
          };
        }
        case 'capture-pre-reset': {
          if (!destructiveAcknowledged) throw new Error('请先确认测试设备已备份并理解 wipe 不可逆');
          if (!baselineDeviceId || !context.standardAddress) {
            throw new Error('缺少设备身份或标准地址基线');
          }
          updateContext({
            preReset: {
              deviceId: baselineDeviceId,
              standardAddress: context.standardAddress,
              hidden: context.hiddenA,
            },
          });
          return {
            message: '已在内存中记录重置前基线；页面没有调用 deviceWipe',
            details: { deviceWipeCalled: false, mnemonicCollected: false },
          };
        }
        case 'verify-post-reset': {
          const preReset = context.preReset;
          if (!preReset) throw new Error('缺少重置前检查点');
          if (!destructiveAcknowledged) throw new Error('请先确认这是专用测试设备且恢复已完成');
          const device = await reconnectDevice();
          const state = await refreshDeviceState(sdk, device);
          const nextDeviceId = requireDeviceId(state);
          if (nextDeviceId === preReset.deviceId)
            throw new Error('重置/重新初始化后 deviceId 没有变化');
          const standard = await openWallet(sdk, device, { mode: 'standard' });
          if (standard.deviceId !== nextDeviceId) throw new Error('标准钱包返回了旧 deviceId');
          const address = await getAddress(sdk, device, nextDeviceId, { standard: true });
          if (address !== preReset.standardAddress) {
            throw new Error('恢复后的标准钱包地址与重置前不同；请确认恢复的是同一测试钱包');
          }
          let oldIdentityRejected: boolean | 'not-tested' = 'not-tested';
          if (preReset.hidden) {
            const response = await sdk.evmGetAddress(device.connectId, preReset.deviceId, {
              path: EVM_TEST_PATH,
              showOnOneKey: false,
              passphraseState: preReset.hidden.passphraseState,
            });
            oldIdentityRejected = !response.success;
            if (!oldIdentityRejected) throw new Error('旧 deviceId 仍可用于重置后的设备');
          }
          updateContext({ baselineDeviceId: nextDeviceId, standardAddress: address });
          return {
            message: '重置后的新 deviceId 与恢复钱包地址语义正确',
            details: {
              deviceIdChanged: true,
              restoredAddressMatches: true,
              oldIdentityRejected,
              sessionIdPersistedByPage: false,
            },
          };
        }
        default:
          throw new Error(`尚未实现用例：${definition.id}`);
      }
    },
    [
      assertExpectedFailure,
      currentDevice,
      destructiveAcknowledged,
      getAddress,
      openWallet,
      reconnectDevice,
      refreshDeviceState,
      transportType,
      updateContext,
    ]
  );

  const runCase = useCallback(
    async (definition: WalletSessionCaseDefinition) => {
      const startedAt = performance.now();
      const calls: WalletSessionApiTrace[] = [];
      setRunningCaseId(definition.id);
      setResults(previous => ({ ...previous, [definition.id]: { status: 'running' } }));
      try {
        const output = await executeCase(definition, calls);
        setResults(previous => ({
          ...previous,
          [definition.id]: {
            status: output.skipped ? 'skipped' : 'passed',
            message: output.message,
            details: output.details,
            calls,
            durationMs: Math.round(performance.now() - startedAt),
          },
        }));
      } catch (error) {
        setResults(previous => ({
          ...previous,
          [definition.id]: {
            status: 'failed',
            message: error instanceof Error ? error.message : '未知错误',
            calls,
            durationMs: Math.round(performance.now() - startedAt),
          },
        }));
      } finally {
        setRunningCaseId(null);
      }
    },
    [executeCase]
  );

  const completedIds = useMemo(
    () =>
      new Set(
        Object.entries(results)
          .filter(([, result]) => result.status === 'passed' || result.status === 'skipped')
          .map(([id]) => id)
      ),
    [results]
  );
  const completedCount = Object.values(results).filter(result =>
    ['passed', 'failed', 'skipped'].includes(result.status)
  ).length;
  const passedCount = Object.values(results).filter(result => result.status === 'passed').length;
  const failedCount = Object.values(results).filter(result => result.status === 'failed').length;
  const progress = (completedCount / WALLET_SESSION_CASES.length) * 100;
  const groupedCases = useMemo(
    () =>
      Object.entries(CATEGORY_LABELS).map(([category, label]) => ({
        category: category as WalletSessionCaseDefinition['category'],
        label,
        cases: WALLET_SESSION_CASES.filter(item => item.category === category),
      })),
    []
  );

  const resetLocalRun = () => {
    contextRef.current = {};
    setContextVersion(value => value + 1);
    setResults({});
    setDestructiveAcknowledged(false);
  };

  return (
    <PageLayout fixedHeight>
      <div className="h-full overflow-y-auto p-4 sm:p-6" data-context-version={contextVersion}>
        <div className="mx-auto max-w-7xl space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <KeyRound className="h-7 w-7 text-primary" />
                <h1 className="text-2xl font-bold">钱包状态 / Session WebUSB 验证</h1>
              </div>
              <p className="max-w-3xl text-sm text-muted-foreground">
                使用真实浏览器 WebUSB 和真实硬件验证标准钱包、隐藏钱包、Attach PIN、
                deviceId、passphraseState、缓存隔离及设备重置边界。每个用例 都展示实际 SDK
                方法、位置参数和接口响应。
              </p>
            </div>
            <Button variant="outline" onClick={resetLocalRun} disabled={Boolean(runningCaseId)}>
              <RotateCcw className="mr-2 h-4 w-4" /> 清空本页结果
            </Button>
          </div>

          <Alert variant={transportType === 'webusb' ? 'default' : 'warning'}>
            <Usb className="h-4 w-4" />
            <AlertTitle>目标传输：WebUSB</AlertTitle>
            <AlertDescription>
              当前传输为 <strong>{transportType}</strong>。本页不会走 React Native BLE、JSBridge 或
              Emulator；非 WebUSB 时所有用例都会阻止执行。
            </AlertDescription>
          </Alert>

          <Alert variant="warning">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>安全边界</AlertTitle>
            <AlertDescription className="space-y-1">
              <p>
                deviceId、passphraseState、地址和普通响应字段会原样显示；页面不会显示助记词、
                Passphrase、PIN、私钥或 SDK 内部 Session。
              </p>
              <p>
                可在专用测试设备上使用你自己的公开测试向量，但恢复必须在 OneKey App/设备端完成，
                不能把助记词输入本页面、终端或日志。
              </p>
            </AlertDescription>
          </Alert>

          <DeviceNotConnectedState className="shadow-none" />

          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">总计 {WALLET_SESSION_CASES.length}</Badge>
                  <Badge variant="success">通过 {passedCount}</Badge>
                  <Badge variant={failedCount ? 'destructive' : 'secondary'}>
                    失败 {failedCount}
                  </Badge>
                  <Badge variant="secondary">完成 {completedCount}</Badge>
                </div>
                <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </CardContent>
          </Card>

          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>设备 wipe / 恢复用例需要单独确认</AlertTitle>
            <AlertDescription>
              <label className="mt-2 flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={destructiveAcknowledged}
                  onChange={event => setDestructiveAcknowledged(event.target.checked)}
                />
                <span>
                  我确认这是专用测试设备，恢复资料已可靠备份，并理解 wipe 会不可逆删除设备数据。
                  本页仍不会执行 wipe，只会记录和验证检查点。
                </span>
              </label>
            </AlertDescription>
          </Alert>

          {groupedCases.map(group => (
            <section key={group.category} className="space-y-3">
              <h2 className="text-lg font-semibold">{group.label}</h2>
              <div className="grid gap-3 lg:grid-cols-2">
                {group.cases.map(definition => {
                  const result = results[definition.id] ?? { status: 'idle' as const };
                  const missingPrerequisites = definition.prerequisites.filter(
                    prerequisite => !completedIds.has(prerequisite)
                  );
                  const protocolUnsupported = Boolean(
                    contextRef.current.baselineProtocol &&
                      !definition.protocols.includes(contextRef.current.baselineProtocol)
                  );
                  const disabled =
                    Boolean(runningCaseId) ||
                    !currentDevice ||
                    transportType !== 'webusb' ||
                    missingPrerequisites.length > 0 ||
                    (definition.destructive && !destructiveAcknowledged);

                  return (
                    <Card key={definition.id} className="flex flex-col">
                      <CardHeader className="space-y-2 pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <CardTitle className="text-base">{definition.title}</CardTitle>
                          {statusBadge(result.status)}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {definition.protocols.map(protocol => (
                            <Badge key={protocol} variant="outline">
                              {protocol}
                            </Badge>
                          ))}
                          <Badge variant="secondary">{definition.execution}</Badge>
                          {definition.sdkMethod && (
                            <Badge variant="outline">SDK: {definition.sdkMethod}</Badge>
                          )}
                          {definition.destructive && (
                            <Badge variant="destructive">外部高风险步骤</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="flex flex-1 flex-col gap-3 pt-0">
                        <p className="text-sm text-muted-foreground">{definition.description}</p>
                        <div className="grid gap-3 text-xs sm:grid-cols-2">
                          <div>
                            <div className="mb-1 font-semibold">步骤</div>
                            <ol className="list-decimal space-y-1 pl-4 text-muted-foreground">
                              {definition.steps.map(step => (
                                <li key={step}>{step}</li>
                              ))}
                            </ol>
                          </div>
                          <div>
                            <div className="mb-1 font-semibold">预期</div>
                            <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                              {definition.expected.map(expected => (
                                <li key={expected}>{expected}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        {missingPrerequisites.length > 0 && (
                          <p className="text-xs text-orange-600">
                            先完成：{missingPrerequisites.join(', ')}
                          </p>
                        )}
                        {protocolUnsupported && (
                          <p className="text-xs text-muted-foreground">
                            当前协议不属于该用例范围，执行时会安全跳过。
                          </p>
                        )}
                        {result.message && (
                          <div
                            className={`rounded-md border p-2 text-xs ${
                              result.status === 'failed'
                                ? 'border-red-300 bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-200'
                                : 'border-border bg-muted/40'
                            }`}
                          >
                            <div>{result.message}</div>
                            {result.details && (
                              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(result.details, null, 2)}
                              </pre>
                            )}
                            {result.durationMs !== undefined && (
                              <div className="mt-1 text-muted-foreground">
                                {durationText(result.durationMs)}
                              </div>
                            )}
                          </div>
                        )}
                        {result.calls && result.calls.length > 0 && (
                          <div className="space-y-2 border-t border-border pt-3 text-xs">
                            <div className="flex items-center justify-between gap-3 font-semibold">
                              <span>实际 SDK 调用</span>
                              <Badge variant="outline">{result.calls.length} 次</Badge>
                            </div>
                            {result.calls.map((call, index) => (
                              <div
                                key={`${call.startedAt}-${call.method}-${index}`}
                                className="overflow-hidden rounded-md border border-border bg-muted/20"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
                                  <span className="font-semibold text-foreground">
                                    {index + 1}. {call.method}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {durationText(call.durationMs)} · {call.startedAt}
                                  </span>
                                </div>
                                <div className="grid gap-px bg-border lg:grid-cols-2">
                                  <div className="min-w-0 bg-background p-3">
                                    <div className="mb-2 font-semibold text-muted-foreground">
                                      调用参数（位置参数）
                                    </div>
                                    <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all text-foreground">
                                      {JSON.stringify(call.arguments, null, 2)}
                                    </pre>
                                  </div>
                                  <div className="min-w-0 bg-background p-3">
                                    <div className="mb-2 font-semibold text-muted-foreground">
                                      {call.error === undefined ? '原始响应' : '原始异常'}
                                    </div>
                                    <pre
                                      className={`max-h-80 overflow-auto whitespace-pre-wrap break-all ${
                                        call.error === undefined
                                          ? 'text-foreground'
                                          : 'text-destructive'
                                      }`}
                                    >
                                      {JSON.stringify(
                                        call.error === undefined ? call.response : call.error,
                                        null,
                                        2
                                      )}
                                    </pre>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <Button
                          className="mt-auto"
                          variant={definition.destructive ? 'outline' : 'default'}
                          disabled={disabled}
                          onClick={() => runCase(definition)}
                        >
                          {runningCaseId === definition.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="mr-2 h-4 w-4" />
                          )}
                          {definition.execution === 'manual-checkpoint'
                            ? '记录 / 验证检查点'
                            : '执行用例'}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </PageLayout>
  );
}
