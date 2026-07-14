# Protocol V2 Wallet Session SDK Implementation Plan

> 本计划记录 2026-07-13 的历史实现过程，其中 `UnLockDevice(10030/10031)` 和
> unlock 后调用 `DeviceStatusGet` 的步骤已经失效。当前实现以
> `2026-07-14-protocol-v2-passphrase-session-alignment.md` 为准，请勿继续执行本计划的
> Task 5/6。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变 Protocol V1 行为的前提下，为 Pro2 接入共享钱包 Session Store、`DeviceStatusGet/DeviceSessionGet` API、状态刷新和恢复的 `UnLockDevice(10030/10031)` 流程。

**Architecture:** V1/V2 共用 `DeviceWalletSessionStore` 保存 `deviceKey + passphraseState -> sessionId`，Protocol V2 使用 `ProtocolV2WalletSessionHelper` 编排 DeviceStatus 与 DeviceSession。Raw API 保持低副作用，高层 `deviceUnlock/getPassphraseState` 负责 Features、缓存和安全校验；Transport Link Session 不参与该 Store。

**Tech Stack:** TypeScript、Jest、protobufjs、Yarn 1、Rollup、Protocol V2 protobuf JSON。

---

## 文件结构

- Create: `packages/core/src/device/DeviceWalletSessionStore.ts` — V1/V2 共用的内存 Session Store。
- Create: `packages/core/__tests__/device-wallet-session-store.test.ts` — Store 的隔离、迁移、清理测试。
- Create: `packages/core/src/api/ClearSessionCache.ts` — 不连接设备的 routed CoreApi 清理方法。
- Create: `packages/core/src/types/api/sessionCache.ts` — 清理 API 的公共类型。
- Create: `packages/core/src/api/protocol-v2/DeviceStatusGet.ts` — 原始 DeviceStatus API。
- Create: `packages/core/src/api/protocol-v2/DeviceSessionGet.ts` — 原始 DeviceSession API。
- Create: `packages/core/src/protocols/protocol-v2/walletSession.ts` — Pro2 Session 与状态刷新编排。
- Modify: `packages/core/src/device/Device.ts` — 使用 Store、迁移稳定 deviceId、V2 unlock 后刷新 DeviceStatus。
- Modify: `packages/core/src/utils/deviceFeaturesUtils.ts` — V2 getPassphraseState 委托给 helper。
- Modify: `packages/core/src/api/GetPassphraseState.ts` — 保持统一标准 payload。
- Modify: `packages/core/src/api/index.ts` — 注册新方法。
- Modify: `packages/core/src/inject.ts` — 暴露 routed CoreApi。
- Modify: `packages/core/src/types/api/index.ts` — CoreApi 类型。
- Modify: `packages/core/src/types/api/protocolV2.ts` — Raw API 签名与类型导出。
- Modify: `packages/core/src/protocols/protocol-v2/index.ts` — helper 导出。
- Modify: `packages/core/__tests__/protocol-v2.test.ts` — V1/V2 分流、raw API、状态刷新和 unlock 测试。
- Modify: `packages/hd-transport/scripts/protobuf-build.sh` — 仅在临时聚合 proto 中恢复 10030/10031。
- Modify: `packages/hd-transport/__tests__/messages.test.js` — 协议 ID 与生成一致性测试。
- Regenerate: `packages/hd-transport/messages-protocol-v2.json`。
- Regenerate: `packages/core/src/data/messages/messages-protocol-v2.json`。
- Regenerate: `packages/hd-transport/src/types/messages.ts`。

### Task 1: 抽出 DeviceWalletSessionStore，保持 V1 行为

**Files:**

- Create: `packages/core/src/device/DeviceWalletSessionStore.ts`
- Create: `packages/core/__tests__/device-wallet-session-store.test.ts`
- Modify: `packages/core/src/device/Device.ts`

- [ ] **Step 1: 先写 Store 失败测试**

覆盖以下行为：

```ts
import { DeviceWalletSessionStore } from '../src/device/DeviceWalletSessionStore';

describe('DeviceWalletSessionStore', () => {
  test('requires passphraseState for wallet session lookup', () => {
    const store = new DeviceWalletSessionStore();
    store.set('device-1', 'hidden-a', 'session-a');
    expect(store.get('device-1', undefined)).toBeUndefined();
    expect(store.get('device-1', 'hidden-a')).toBe('session-a');
  });

  test('isolates wallets and devices', () => {
    const store = new DeviceWalletSessionStore();
    store.set('device-1', 'hidden-a', 'session-a');
    store.set('device-1', 'hidden-b', 'session-b');
    store.set('device-2', 'hidden-a', 'session-c');
    expect(store.get('device-1', 'hidden-a')).toBe('session-a');
    expect(store.get('device-1', 'hidden-b')).toBe('session-b');
    expect(store.get('device-2', 'hidden-a')).toBe('session-c');
  });

  test('keeps pending sessions unreadable until wallet binding', () => {
    const store = new DeviceWalletSessionStore();
    store.setPending('device-1', 'pending-session');
    expect(store.get('device-1', undefined)).toBeUndefined();
    expect(store.getPending('device-1')).toBe('pending-session');
  });

  test('migrates descriptor keys to stable device ids', () => {
    const store = new DeviceWalletSessionStore();
    store.set('ble-path', 'hidden-a', 'session-a');
    store.setPending('ble-path', 'pending-session');
    store.migrateDeviceKey('ble-path', 'stable-device-id');
    expect(store.get('ble-path', 'hidden-a')).toBeUndefined();
    expect(store.get('stable-device-id', 'hidden-a')).toBe('session-a');
    expect(store.getPending('stable-device-id')).toBe('pending-session');
  });

  test('clears one wallet, one device, or all sessions', () => {
    const store = new DeviceWalletSessionStore();
    store.set('device-1', 'hidden-a', 'session-a');
    store.set('device-1', 'hidden-b', 'session-b');
    store.set('device-2', 'hidden-a', 'session-c');
    store.delete('device-1', 'hidden-a');
    expect(store.get('device-1', 'hidden-a')).toBeUndefined();
    store.deleteDevice('device-1');
    expect(store.get('device-1', 'hidden-b')).toBeUndefined();
    store.clear();
    expect(store.get('device-2', 'hidden-a')).toBeUndefined();
  });
});
```

- [ ] **Step 2: 运行测试并确认因文件/实现缺失而失败**

Run: `yarn --cwd packages/core test device-wallet-session-store.test.ts --runInBand`

Expected: FAIL，原因是 `DeviceWalletSessionStore` 尚不存在。

- [ ] **Step 3: 实现最小 Store**

实现以下公开内部接口：

```ts
export class DeviceWalletSessionStore {
  private readonly walletSessions = new Map<string, string>();
  private readonly pendingSessions = new Map<string, string>();

  private walletKey(deviceKey: string, passphraseState: string) {
    return `${deviceKey}@${passphraseState}`;
  }

  get(deviceKey: string, passphraseState?: string) {
    if (!deviceKey || !passphraseState) return undefined;
    return this.walletSessions.get(this.walletKey(deviceKey, passphraseState));
  }

  set(deviceKey: string, passphraseState: string | undefined, sessionId: string | undefined) {
    if (!deviceKey || !passphraseState || !sessionId) return;
    this.walletSessions.set(this.walletKey(deviceKey, passphraseState), sessionId);
  }

  setPending(deviceKey: string, sessionId: string | undefined) {
    if (!deviceKey || !sessionId) return;
    this.pendingSessions.set(deviceKey, sessionId);
  }

  getPending(deviceKey: string) {
    return this.pendingSessions.get(deviceKey);
  }

  delete(deviceKey: string, passphraseState?: string) {
    if (passphraseState) this.walletSessions.delete(this.walletKey(deviceKey, passphraseState));
    this.pendingSessions.delete(deviceKey);
  }

  deleteDevice(deviceKey: string) {
    this.pendingSessions.delete(deviceKey);
    for (const key of this.walletSessions.keys()) {
      if (key.startsWith(`${deviceKey}@`)) this.walletSessions.delete(key);
    }
  }

  migrateDeviceKey(from: string, to: string) {
    if (!from || !to || from === to) return;
    const pending = this.pendingSessions.get(from);
    if (pending) this.pendingSessions.set(to, pending);
    this.pendingSessions.delete(from);
    for (const [key, value] of this.walletSessions.entries()) {
      if (!key.startsWith(`${from}@`)) continue;
      this.walletSessions.set(`${to}${key.slice(from.length)}`, value);
      this.walletSessions.delete(key);
    }
  }

  clear() {
    this.walletSessions.clear();
    this.pendingSessions.clear();
  }
}

export const deviceWalletSessionStore = new DeviceWalletSessionStore();
```

将 `Device.ts` 的 `getInternalState/updateInternalState/setInternalState/clearInternalState/preloadSessionCache` 改为委托 Store；删除打印整个缓存或 sessionId 的日志。Features 更新前后比较缓存 device key，并在获得稳定 `features.deviceId` 时调用 `migrateDeviceKey`。

- [ ] **Step 4: 运行 Store 与现有 Protocol V2 测试**

Run: `yarn --cwd packages/core test device-wallet-session-store.test.ts protocol-v2.test.ts --runInBand`

Expected: PASS，现有 V1/V2 Session 测试不回归。

- [ ] **Step 5: 仅提交本任务文件**

```bash
git commit --only \
  packages/core/src/device/DeviceWalletSessionStore.ts \
  packages/core/src/device/Device.ts \
  packages/core/__tests__/device-wallet-session-store.test.ts \
  -m "refactor(core): share wallet session store"
```

### Task 2: 增加 routed clearSessionCache CoreApi

**Files:**

- Create: `packages/core/src/api/ClearSessionCache.ts`
- Create: `packages/core/src/types/api/sessionCache.ts`
- Modify: `packages/core/src/api/index.ts`
- Modify: `packages/core/src/inject.ts`
- Modify: `packages/core/src/types/api/index.ts`
- Test: `packages/core/__tests__/device-wallet-session-store.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
import ClearSessionCache from '../src/api/ClearSessionCache';
import { deviceWalletSessionStore } from '../src/device/DeviceWalletSessionStore';

test('clears session cache without using a device', async () => {
  deviceWalletSessionStore.set('device-1', 'hidden-a', 'session-a');
  const method = new ClearSessionCache({
    payload: { method: 'clearSessionCache', deviceId: 'device-1', passphraseState: 'hidden-a' },
  });
  method.init();
  expect(method.useDevice).toBe(false);
  await expect(method.run()).resolves.toEqual({ cleared: true });
  expect(deviceWalletSessionStore.get('device-1', 'hidden-a')).toBeUndefined();
});
```

- [ ] **Step 2: 运行并确认失败**

Run: `yarn --cwd packages/core test device-wallet-session-store.test.ts --runInBand`

Expected: FAIL，原因是 `ClearSessionCache` 尚不存在。

- [ ] **Step 3: 实现 routed API**

```ts
export type ClearSessionCacheParams = {
  deviceId?: string;
  passphraseState?: string;
};

export default class ClearSessionCache extends BaseMethod<ClearSessionCacheParams> {
  init() {
    this.useDevice = false;
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
    this.params = {
      deviceId: this.payload.deviceId,
      passphraseState: this.payload.passphraseState,
    };
  }

  async run() {
    const { deviceId, passphraseState } = this.params;
    if (!deviceId) deviceWalletSessionStore.clear();
    else if (!passphraseState) deviceWalletSessionStore.deleteDevice(deviceId);
    else deviceWalletSessionStore.delete(deviceId, passphraseState);
    return { cleared: true as const };
  }
}
```

在 API registry、`createCoreApi` 和 `CoreApi` 类型中增加 `clearSessionCache(params?)`，不接收 `connectId`。

- [ ] **Step 4: 运行测试与 core build**

Run: `yarn --cwd packages/core test device-wallet-session-store.test.ts --runInBand && yarn --cwd packages/core build`

Expected: PASS / exit 0。

- [ ] **Step 5: 提交**

```bash
git commit --only \
  packages/core/src/api/ClearSessionCache.ts \
  packages/core/src/types/api/sessionCache.ts \
  packages/core/src/api/index.ts \
  packages/core/src/inject.ts \
  packages/core/src/types/api/index.ts \
  packages/core/__tests__/device-wallet-session-store.test.ts \
  -m "feat(core): add routed session cache clearing"
```

### Task 3: 增加 DeviceStatusGet / DeviceSessionGet Raw API

**Files:**

- Create: `packages/core/src/api/protocol-v2/DeviceStatusGet.ts`
- Create: `packages/core/src/api/protocol-v2/DeviceSessionGet.ts`
- Modify: `packages/core/src/api/index.ts`
- Modify: `packages/core/src/inject.ts`
- Modify: `packages/core/src/types/api/index.ts`
- Modify: `packages/core/src/types/api/protocolV2.ts`
- Test: `packages/core/__tests__/protocol-v2.test.ts`

- [ ] **Step 1: 写 raw API 失败测试**

```ts
test('deviceStatusGet returns raw DeviceStatus without updating features', async () => {
  const typedCall = jest.fn().mockResolvedValue({
    type: 'DeviceStatus',
    message: { device_id: 'device-1', unlocked: true },
  });
  const updateProtocolV2Features = jest.fn();
  const method = new DeviceStatusGet({ payload: { method: 'deviceStatusGet' } });
  method.init();
  method.device = stubDevice({
    originalDescriptor: { protocolType: 'V2' },
    commands: { typedCall },
    updateProtocolV2Features,
  }) as any;
  await expect(method.run()).resolves.toEqual({ device_id: 'device-1', unlocked: true });
  expect(typedCall).toHaveBeenCalledWith('DeviceStatusGet', 'DeviceStatus', {});
  expect(updateProtocolV2Features).not.toHaveBeenCalled();
});

test('deviceSessionGet maps sessionId and does not mutate cache', async () => {
  const typedCall = jest.fn().mockResolvedValue({
    type: 'DeviceSession',
    message: { session_id: 'new-session', btc_test_address: 'state-a' },
  });
  const updateInternalState = jest.fn();
  const method = new DeviceSessionGet({
    payload: { method: 'deviceSessionGet', sessionId: 'cached-session' },
  });
  method.init();
  method.device = stubDevice({
    originalDescriptor: { protocolType: 'V2' },
    commands: { typedCall },
    updateInternalState,
  }) as any;
  await expect(method.run()).resolves.toEqual({
    session_id: 'new-session',
    btc_test_address: 'state-a',
  });
  expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', {
    session_id: 'cached-session',
  });
  expect(updateInternalState).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: 运行并确认失败**

Run: `yarn --cwd packages/core test protocol-v2.test.ts --runInBand`

Expected: FAIL，两个 API 类尚不存在。

- [ ] **Step 3: 实现最小 raw API 并注册类型**

`DeviceStatusGet.run()` 调用：

```ts
const { message } = await this.device.commands.typedCall('DeviceStatusGet', 'DeviceStatus', {});
return message;
```

`DeviceSessionGet.run()` 调用：

```ts
const payload = this.params.sessionId ? { session_id: this.params.sessionId } : {};
const { message } = await this.device.commands.typedCall(
  'DeviceSessionGet',
  'DeviceSession',
  payload
);
return message;
```

两个方法都设置 `requireProtocolV2 = true`、`useDevicePassphraseState = false`、`skipForceUpdateCheck = true`，且不更新 Features/Store。

- [ ] **Step 4: 运行测试与类型构建**

Run: `yarn --cwd packages/core test protocol-v2.test.ts --runInBand && yarn --cwd packages/core build`

Expected: PASS / exit 0。

- [ ] **Step 5: 提交**

```bash
git commit --only \
  packages/core/src/api/protocol-v2/DeviceStatusGet.ts \
  packages/core/src/api/protocol-v2/DeviceSessionGet.ts \
  packages/core/src/api/index.ts \
  packages/core/src/inject.ts \
  packages/core/src/types/api/index.ts \
  packages/core/src/types/api/protocolV2.ts \
  packages/core/__tests__/protocol-v2.test.ts \
  -m "feat(core): expose Protocol V2 status and session APIs"
```

### Task 4: 实现 ProtocolV2WalletSessionHelper

**Files:**

- Create: `packages/core/src/protocols/protocol-v2/walletSession.ts`
- Modify: `packages/core/src/protocols/protocol-v2/index.ts`
- Modify: `packages/core/src/device/Device.ts`
- Modify: `packages/core/src/utils/deviceFeaturesUtils.ts`
- Test: `packages/core/__tests__/protocol-v2.test.ts`

- [ ] **Step 1: 写 helper 失败测试**

增加以下行为测试（复用 `protocol-v2.test.ts` 已有 `descriptor/normalizeProtocolV2Features` 辅助函数）：

```ts
test('reuses cached session id for the selected Pro2 wallet', async () => {
  const device = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
  device.passphraseState = 'state-a';
  preloadSessionCache('stable-device-id', 'state-a', 'session-a');
  const typedCall = jest.fn().mockResolvedValue({
    type: 'DeviceSession',
    message: { session_id: 'session-b', btc_test_address: 'state-a' },
  });
  (device as any).features = {
    ...normalizeProtocolV2Features({ ...descriptor, protocolType: 'V2' } as any, {
      status: { device_id: 'stable-device-id', unlocked: true, passphrase_enabled: true },
    }),
  };
  (device as any).commands = { typedCall };

  await getProtocolV2WalletSession(device);

  expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', {
    session_id: 'session-a',
  });
});

test('does not reuse another wallet session when passphraseState is missing', async () => {
  const device = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
  preloadSessionCache('stable-device-id', 'state-a', 'session-a');
  const typedCall = jest.fn().mockResolvedValue({
    type: 'DeviceSession',
    message: { session_id: 'main-session' },
  });
  (device as any).features = normalizeProtocolV2Features(
    { ...descriptor, protocolType: 'V2' } as any,
    { status: { device_id: 'stable-device-id', unlocked: true } }
  );
  (device as any).commands = { typedCall };

  await getProtocolV2WalletSession(device);

  expect(typedCall).toHaveBeenCalledWith('DeviceSessionGet', 'DeviceSession', {});
});

test('clears the selected cache entry when firmware rejects an invalid session', async () => {
  const device = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
  device.passphraseState = 'state-a';
  preloadSessionCache('stable-device-id', 'state-a', 'session-a');
  (device as any).features = normalizeProtocolV2Features(
    { ...descriptor, protocolType: 'V2' } as any,
    { status: { device_id: 'stable-device-id', unlocked: true, passphrase_enabled: true } }
  );
  (device as any).commands = {
    typedCall: jest.fn().mockRejectedValue(new Error('Failure_InvalidSession,no error message')),
  };

  await expect(getProtocolV2WalletSession(device)).rejects.toThrow('Failure_InvalidSession');
  expect(device.getInternalState()).toBeUndefined();
});

test('merges DeviceStatus into existing Protocol V2 features', async () => {
  const device = Device.fromDescriptor({ ...descriptor, protocolType: 'V2' } as any);
  (device as any).features = normalizeProtocolV2Features(
    { ...descriptor, protocolType: 'V2' } as any,
    {
      protocol_version: 2,
      fw: { application: { version: '1.2.3' } },
      se1: { application: { version: '4.5.6' } },
      status: { unlocked: false, passphrase_enabled: false },
    }
  );

  const features = device.updateProtocolV2Status({
    device_id: 'stable-device-id',
    unlocked: true,
    passphrase_enabled: true,
  });

  expect(features).toMatchObject({
    deviceId: 'stable-device-id',
    unlocked: true,
    passphraseProtection: true,
    firmwareVersion: '1.2.3',
    se01Version: '4.5.6',
  });
});
```

- [ ] **Step 2: 运行并确认失败**

Run: `yarn --cwd packages/core test protocol-v2.test.ts --runInBand`

Expected: FAIL，helper 与 `updateProtocolV2Status` 尚不存在。

- [ ] **Step 3: 实现 helper 与状态合并**

helper 提供：

```ts
export async function requestProtocolV2DeviceStatus(device: Device) {
  const { message } = await device.commands.typedCall('DeviceStatusGet', 'DeviceStatus', {});
  return message;
}

export async function refreshProtocolV2DeviceStatus(device: Device) {
  const status = await requestProtocolV2DeviceStatus(device);
  return device.updateProtocolV2Status(status);
}

export async function getProtocolV2WalletSession(
  device: Device,
  options?: { initSession?: boolean }
) {
  if (device.features?.unlocked === false) {
    throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Device is locked');
  }
  if (options?.initSession) device.clearInternalState();
  const cachedSessionId = device.getInternalState();
  try {
    const { message } = await device.commands.typedCall(
      'DeviceSessionGet',
      'DeviceSession',
      cachedSessionId ? { session_id: cachedSessionId } : {}
    );
    device.updateInternalState(
      device.getCurrentPassphraseProtection() ?? false,
      message.btc_test_address,
      device.getCurrentDeviceId(),
      message.session_id,
      options?.initSession ? null : device.features?.sessionId
    );
    return {
      passphraseState: message.btc_test_address,
      newSession: message.session_id,
      unlockedAttachPin: device.features?.unlockedAttachPin ?? undefined,
    };
  } catch (error) {
    if (String((error as Error)?.message).includes('Failure_InvalidSession')) {
      device.clearInternalState();
    }
    throw error;
  }
}
```

`Device.updateProtocolV2Status(status)` 将 `features.raw.protocolV2DeviceInfo` 与新 status 合并后调用 `updateProtocolV2Features`，并在 deviceId 变化时迁移 Store key。`deviceFeaturesUtils.getPassphraseState()` 的 V2 分支只委托 helper，V1 分支保持原样。

- [ ] **Step 4: 运行 Protocol V2 全文件测试**

Run: `yarn --cwd packages/core test protocol-v2.test.ts device-wallet-session-store.test.ts --runInBand`

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git commit --only \
  packages/core/src/protocols/protocol-v2/walletSession.ts \
  packages/core/src/protocols/protocol-v2/index.ts \
  packages/core/src/device/Device.ts \
  packages/core/src/utils/deviceFeaturesUtils.ts \
  packages/core/__tests__/protocol-v2.test.ts \
  -m "feat(core): manage Protocol V2 wallet sessions"
```

### Task 5: Pro2 deviceUnlock 使用 UnLockDevice -> DeviceStatusGet

**Files:**

- Modify: `packages/core/src/device/Device.ts`
- Test: `packages/core/__tests__/protocol-v2.test.ts`

- [ ] **Step 1: 修改 unlock 测试使其先失败**

将现有 V2 unlock 断言调整为：

```ts
expect(typedCall.mock.calls.map(call => call[0])).toEqual(['UnLockDevice', 'DeviceStatusGet']);
expect(features).toMatchObject({
  unlocked: true,
  passphraseProtection: true,
  unlockedAttachPin: true,
});
```

增加测试：`Failure_UnexpectedMessage` 会转换成 `DeviceNotSupportMethod`，且不会调用 `DeviceSessionGet`；V1 unlock 仍只走原路径。

- [ ] **Step 2: 运行并确认旧实现失败**

Run: `yarn --cwd packages/core test protocol-v2.test.ts --runInBand`

Expected: FAIL，旧实现只相信 `UnLockDeviceResponse`，没有调用 `DeviceStatusGet`。

- [ ] **Step 3: 实现 V2 专属 unlock 分支**

```ts
if (this.isProtocolV2()) {
  try {
    await this.commands.typedCall('UnLockDevice', 'UnLockDeviceResponse');
  } catch (error) {
    if (String((error as Error)?.message).includes('Failure_UnexpectedMessage')) {
      throw createDeviceNotSupportMethodError('deviceUnlock', this.getCurrentFirmwareType());
    }
    throw error;
  }
  return refreshProtocolV2DeviceStatus(this);
}
```

该分支置于 V1 capability/version 判断之前。V1 后续逻辑不修改。

- [ ] **Step 4: 运行测试**

Run: `yarn --cwd packages/core test protocol-v2.test.ts --runInBand`

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git commit --only packages/core/src/device/Device.ts packages/core/__tests__/protocol-v2.test.ts \
  -m "feat(core): refresh Pro2 status after unlock"
```

### Task 6: 临时恢复 Protocol V2 UnLockDevice 10030/10031

**Files:**

- Modify: `packages/hd-transport/__tests__/messages.test.js`
- Modify: `packages/hd-transport/scripts/protobuf-build.sh`
- Regenerate: `packages/hd-transport/messages-protocol-v2.json`
- Regenerate: `packages/core/src/data/messages/messages-protocol-v2.json`
- Regenerate: `packages/hd-transport/src/types/messages.ts`

- [ ] **Step 1: 写协议 ID 失败测试**

```js
test('Protocol V2 temporarily restores unlock ids without restoring legacy passphrase ids', () => {
  expect(v2Messages.nested.MessageType.values).toMatchObject({
    MessageType_UnLockDevice: 10030,
    MessageType_UnLockDeviceResponse: 10031,
  });
  expect(v2Messages.nested.MessageType.values).not.toHaveProperty('MessageType_GetPassphraseState');
  expect(v2Messages.nested.MessageType.values).not.toHaveProperty('MessageType_PassphraseState');
});
```

- [ ] **Step 2: 运行并确认当前 JSON 缺少 10030/10031**

Run: `yarn --cwd packages/hd-transport test messages.test.js --runInBand`

Expected: FAIL，V2 MessageType 尚无 unlock ID。

- [ ] **Step 3: 修改临时 proto 生成脚本**

在生成 `messages-protocol-v2-tmp.proto` 后、required message 检查前：

```js
const restoreTemporaryMessageType = (name, expectedId) => {
  const active = new RegExp(`^\\s*MessageType_${name}\\s*=\\s*(\\d+)\\s*;`, 'gm');
  const activeMatches = Array.from(proto.matchAll(active));
  if (activeMatches.length === 1) {
    if (Number(activeMatches[0][1]) !== expectedId) {
      throw new Error(`Protocol V2 ${name} id changed from ${expectedId}`);
    }
    return;
  }
  if (activeMatches.length > 1) throw new Error(`Duplicate MessageType_${name}`);

  const commented = new RegExp(
    `^(\\s*)//\\s*(MessageType_${name}\\s*=\\s*${expectedId}\\b[^;]*;)`,
    'm'
  );
  if (!commented.test(proto)) {
    throw new Error(`Missing expected commented MessageType_${name} = ${expectedId}`);
  }
  proto = proto.replace(commented, '$1$2');
};

restoreTemporaryMessageType('UnLockDevice', 10030);
restoreTemporaryMessageType('UnLockDeviceResponse', 10031);
```

把两个 unlock message 加入 requiredMessages，并继续禁止恢复 10028/10029。

- [ ] **Step 4: 重新生成并运行 transport 测试**

Run: `yarn --cwd packages/hd-transport update-protobuf`

Run: `yarn --cwd packages/hd-transport test messages.test.js --runInBand`

Expected: 生成成功，测试 PASS，core/transport JSON 相同。

- [ ] **Step 5: 提交生成产物与脚本**

```bash
git commit --only \
  packages/hd-transport/scripts/protobuf-build.sh \
  packages/hd-transport/__tests__/messages.test.js \
  packages/hd-transport/messages-protocol-v2.json \
  packages/core/src/data/messages/messages-protocol-v2.json \
  packages/hd-transport/src/types/messages.ts \
  -m "feat(protocol): restore Protocol V2 unlock ids"
```

### Task 7: 全量验证与 SDK 交付检查

**Files:**

- Verify all modified SDK files
- No app-monorepo modifications

- [ ] **Step 1: 运行定向测试**

```bash
yarn --cwd packages/hd-transport test messages.test.js --runInBand
yarn --cwd packages/core test device-wallet-session-store.test.ts protocol-v2.test.ts --runInBand
```

Expected: 全部 PASS，0 failures。

- [ ] **Step 2: 运行包级完整测试**

```bash
yarn --cwd packages/hd-transport test --runInBand
yarn --cwd packages/core test --runInBand
```

Expected: 全部 PASS；如存在与本任务无关的既有失败，记录完整命令与失败用例，不宣称完成。

- [ ] **Step 3: 运行 lint、格式与 build**

```bash
yarn prettier --check \
  packages/core/src/device/DeviceWalletSessionStore.ts \
  packages/core/src/api/ClearSessionCache.ts \
  packages/core/src/api/protocol-v2/DeviceStatusGet.ts \
  packages/core/src/api/protocol-v2/DeviceSessionGet.ts \
  packages/core/src/protocols/protocol-v2/walletSession.ts \
  packages/core/src/device/Device.ts \
  packages/core/src/utils/deviceFeaturesUtils.ts \
  packages/core/__tests__/device-wallet-session-store.test.ts \
  packages/core/__tests__/protocol-v2.test.ts \
  packages/hd-transport/__tests__/messages.test.js
yarn --cwd packages/core lint
yarn --cwd packages/hd-transport lint
yarn --cwd packages/core build
yarn --cwd packages/hd-transport build
```

Expected: 全部 exit 0。

- [ ] **Step 4: 检查协议与安全不变量**

```bash
cmp packages/hd-transport/messages-protocol-v2.json \
  packages/core/src/data/messages/messages-protocol-v2.json
rg -n 'MessageType_(UnLockDevice|UnLockDeviceResponse|GetPassphraseState|PassphraseState)' \
  packages/hd-transport/messages-protocol-v2.json
rg -n 'deviceSessionCache|session cache:' packages/core/src/device packages/core/src/protocols
git diff --check
git status --short --branch
```

Expected:

- 两份 V2 JSON 完全一致；
- 仅出现 unlock 10030/10031，不出现旧 passphrase 10028/10029；
- 不再打印完整 Session cache；
- app-monorepo 无修改；
- 用户原有无关变更仍保留且未被提交。

- [ ] **Step 5: 更新设计 ADR 状态并提交计划/文档（如实现完全符合设计）**

将 ADR-002 从 `Proposed` 改为 `Accepted`，勾选本计划已完成步骤，并使用 `git commit --only` 提交文档，不带入用户变更。

---

用户已选择在当前会话 Inline Execution；执行时使用 `superpowers:executing-plans`，不创建 worktree，不修改 app-monorepo。
