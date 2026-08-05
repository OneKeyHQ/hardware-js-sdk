import { useCallback, useState } from 'react';
import { CheckCircle2, KeyRound, Loader2, RefreshCw, ShieldAlert, Wallet } from 'lucide-react';
import { OpenWalletSessionMode } from '@onekeyfe/hd-core';

import { DeviceNotConnectedState } from '../components/common/DeviceNotConnectedState';
import { PageLayout } from '../components/common/PageLayout';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { useDeviceStore } from '../store/deviceStore';
import { SDKUtils } from '../utils/hardwareInstance';

import type { OpenWalletSessionPayload } from '@onekeyfe/hd-core';

type HiddenWallet = Extract<OpenWalletSessionPayload, { walletType: 'hidden' }>;
type WalletSlot = 'A' | 'B';
type OperationStatus = {
  kind: 'success' | 'error';
  message: string;
};

const TEST_PATH = "m/44'/60'/0'/0/0";

function getErrorMessage(response: unknown): string {
  if (!response || typeof response !== 'object') return 'SDK 返回了未知错误';
  const payload = (response as { payload?: unknown }).payload;
  if (!payload || typeof payload !== 'object') return 'SDK 返回了未知错误';
  const error = payload as { error?: unknown; message?: unknown; code?: unknown };
  const message =
    typeof error.error === 'string'
      ? error.error
      : typeof error.message === 'string'
      ? error.message
      : 'SDK 调用失败';
  return error.code == null ? message : `${String(error.code)}: ${message}`;
}

function requireWalletSession(response: unknown): OpenWalletSessionPayload {
  if (response && typeof response === 'object' && (response as { success?: unknown }).success) {
    return (response as { payload: OpenWalletSessionPayload }).payload;
  }
  throw new Error(getErrorMessage(response));
}

function requireAddress(response: unknown): string {
  if (response && typeof response === 'object' && (response as { success?: unknown }).success) {
    const address = (response as { payload?: { address?: unknown } }).payload?.address;
    if (typeof address === 'string' && address) return address;
  }
  throw new Error(getErrorMessage(response));
}

function shortAddress(address?: string): string {
  if (!address) return '尚未验证';
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

function requireConnectId(device: { connectId: string | null } | null): string {
  if (!device?.connectId) throw new Error('当前设备缺少 connectId，请重新连接');
  return device.connectId;
}

export default function WalletSessionTestPage() {
  const { currentDevice } = useDeviceStore();
  const [wallets, setWallets] = useState<Partial<Record<WalletSlot, HiddenWallet>>>({});
  const [addresses, setAddresses] = useState<Partial<Record<WalletSlot, string>>>({});
  const [activeWallet, setActiveWallet] = useState<'standard' | WalletSlot>();
  const [running, setRunning] = useState<string>();
  const [status, setStatus] = useState<OperationStatus>();

  const run = useCallback(async (name: string, operation: () => Promise<string>) => {
    setRunning(name);
    setStatus(undefined);
    try {
      const message = await operation();
      setStatus({ kind: 'success', message });
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : '操作失败',
      });
    } finally {
      setRunning(undefined);
    }
  }, []);

  const readAddress = useCallback(
    async (deviceId: string, passphraseState?: string) => {
      if (!currentDevice) throw new Error('请先连接设备');
      const sdk = await SDKUtils.getInstance();
      return requireAddress(
        await sdk.evmGetAddress(requireConnectId(currentDevice), deviceId, {
          path: TEST_PATH,
          showOnOneKey: false,
          ...(passphraseState
            ? { passphraseState }
            : { useEmptyPassphrase: true }),
        })
      );
    },
    [currentDevice]
  );

  const openStandardWallet = () =>
    run('standard', async () => {
      if (!currentDevice) throw new Error('请先连接设备');
      const sdk = await SDKUtils.getInstance();
      const session = requireWalletSession(
        await sdk.openWalletSession(requireConnectId(currentDevice), {
          mode: OpenWalletSessionMode.Standard,
        })
      );
      if (session.walletType !== 'standard') throw new Error('设备没有进入标准钱包');
      setActiveWallet('standard');
      return `已打开标准钱包（${session.protocol}）`;
    });

  const selectHiddenWallet = (slot: WalletSlot) =>
    run(`select-${slot}`, async () => {
      if (!currentDevice) throw new Error('请先连接设备');
      const sdk = await SDKUtils.getInstance();
      const session = requireWalletSession(
        await sdk.openWalletSession(requireConnectId(currentDevice), {
          mode: OpenWalletSessionMode.SelectHidden,
        })
      );
      if (session.walletType !== 'hidden') throw new Error('设备没有返回隐藏钱包');

      const address = await readAddress(session.deviceId, session.passphraseState);
      const otherSlot = slot === 'A' ? 'B' : 'A';
      if (addresses[otherSlot] === address) {
        throw new Error(`钱包 ${slot} 与钱包 ${otherSlot} 地址相同，请选择不同的 Passphrase`);
      }

      setWallets(previous => ({ ...previous, [slot]: session }));
      setAddresses(previous => ({ ...previous, [slot]: address }));
      setActiveWallet(slot);
      return `已记录钱包 ${slot}，地址 ${shortAddress(address)}`;
    });

  const switchWallet = (slot: WalletSlot) =>
    run(`switch-${slot}`, async () => {
      if (!currentDevice) throw new Error('请先连接设备');
      const wallet = wallets[slot];
      if (!wallet) throw new Error(`请先记录钱包 ${slot}`);

      const sdk = await SDKUtils.getInstance();
      const session = requireWalletSession(
        await sdk.openWalletSession(requireConnectId(currentDevice), {
          mode: OpenWalletSessionMode.ResumeHidden,
          deviceId: wallet.deviceId,
          passphraseState: wallet.passphraseState,
        })
      );
      if (session.walletType !== 'hidden') throw new Error(`钱包 ${slot} 恢复结果异常`);

      const address = await readAddress(session.deviceId, session.passphraseState);
      const expectedAddress = addresses[slot];
      if (expectedAddress && address !== expectedAddress) {
        throw new Error(`钱包 ${slot} 切换后地址不一致`);
      }

      setWallets(previous => ({ ...previous, [slot]: session }));
      setAddresses(previous => ({ ...previous, [slot]: address }));
      setActiveWallet(slot);
      return `已切换到钱包 ${slot}，地址验证通过`;
    });

  if (!currentDevice) {
    return (
      <PageLayout>
        <DeviceNotConnectedState showFullPage />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              <h1 className="text-2xl font-semibold">Wallet Session 切换测试</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              使用最新 SDK 的 openWalletSession 接口记录两个隐藏钱包，并通过固定公开路径验证切换结果。
            </p>
          </div>
          <Badge variant="outline">WebUSB · Pro2 · Protocol V2</Badge>
        </div>

        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>敏感信息只保存在当前页面内存</AlertTitle>
          <AlertDescription>
            页面不会展示或记录 Passphrase 和 passphraseState；刷新页面后钱包引用会被清空。
          </AlertDescription>
        </Alert>

        {status && (
          <Alert variant={status.kind === 'error' ? 'destructive' : 'default'}>
            {status.kind === 'success' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <ShieldAlert className="h-4 w-4" />
            )}
            <AlertTitle>{status.kind === 'success' ? '操作成功' : '操作失败'}</AlertTitle>
            <AlertDescription>{status.message}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4" /> 标准钱包
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">
              {activeWallet === 'standard' ? '当前已打开' : '用于返回主钱包上下文'}
            </span>
            <Button onClick={openStandardWallet} disabled={Boolean(running)}>
              {running === 'standard' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              打开标准钱包
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {(['A', 'B'] as const).map(slot => {
            const wallet = wallets[slot];
            const isActive = activeWallet === slot;
            return (
              <Card key={slot} className={isActive ? 'border-primary' : undefined}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>隐藏钱包 {slot}</span>
                    <Badge variant={isActive ? 'default' : 'outline'}>
                      {isActive ? '当前钱包' : wallet ? '已记录' : '未记录'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    验证地址：<span className="font-mono">{shortAddress(addresses[slot])}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => selectHiddenWallet(slot)}
                      disabled={Boolean(running)}
                    >
                      {running === `select-${slot}` && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      选择并记录
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => switchWallet(slot)}
                      disabled={Boolean(running) || !wallet}
                    >
                      {running === `switch-${slot}` ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      切换到 {slot}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </PageLayout>
  );
}
