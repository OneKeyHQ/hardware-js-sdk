# Live Device State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 OneKey 设备状态收敛为默认实时的 `getDeviceState()`，并修复 Device ID、设备重置、锁屏和事件合并边界。

**Architecture:** SDK 的公开 `getDeviceState()` 在 normal 模式每次刷新 status，并用可选 scope 追加 settings 或 firmware 信息；loader 模式自动跳过 status。App 只调用这一套 API，按 `changedKeys` 合并事件，并在同一物理设备出现不同钱包身份时隔离旧记录。

**Tech Stack:** TypeScript、Jest、Yarn workspaces、React/Jotai、IndexedDB、OneKey Protocol V1/V2。

---

## 文件结构

SDK：

- `packages/core/src/types/api/getDeviceState.ts`：唯一公共状态读取参数。
- `packages/core/src/api/GetDeviceState.ts`：scope 校验、loader 守卫和只读策略。
- `packages/core/src/device/Device.ts`：协议级 section 刷新与状态 Store。
- `packages/core/src/core/index.ts`：业务方法执行前的 live deviceId 门禁。
- `packages/core/src/inject.ts`、`packages/core/src/types/api/index.ts`、`packages/core/src/api/index.ts`：删除公开 `refreshDeviceState`。
- `packages/core/__tests__/get-device-state.test.ts`、`refresh-device-state.test.ts`、`public-device-state-api.test.ts`、`protocol-v2.test.ts`：公共契约、boot、锁屏与身份回归。
- `packages/connect-examples/**`：示例迁移到单 API。

App：

- `packages/kit-bg/src/services/ServiceHardware/ServiceHardware.ts`：删除 refresh wrapper，统一 OneKey snapshot。
- `packages/kit-bg/src/services/ServiceAccount/deviceStateForHwWalletCreate.ts`：钱包创建必须拿到 live identity。
- `packages/kit-bg/src/dbs/local/LocalDbBase.ts`：增量持久化与 reset 隔离。
- `packages/kit/src/states/jotai/contexts/deviceDetails/deviceStateManagement.ts`：事件匹配和增量 reducer。
- `packages/kit/src/states/jotai/contexts/deviceDetails/actions.ts`：设备详情使用 settings scope。
- 对应 Jest 测试：状态读取、钱包创建、DB reset、UI 事件合并和旧机型回归。

### Task 1: SDK 单一公开读取 API

**Files:**
- Modify: `packages/core/src/types/api/getDeviceState.ts`
- Modify: `packages/core/src/api/GetDeviceState.ts`
- Modify: `packages/core/src/inject.ts`
- Modify: `packages/core/src/types/api/index.ts`
- Modify: `packages/core/src/api/index.ts`
- Delete: `packages/core/src/types/api/refreshDeviceState.ts`
- Delete: `packages/core/src/api/RefreshDeviceState.ts`
- Test: `packages/core/__tests__/public-device-state-api.test.ts`
- Test: `packages/core/__tests__/refresh-device-state.test.ts`

- [ ] **Step 1: 写失败的公共 API 测试**

```ts
test('exposes getDeviceState scopes without a refreshDeviceState API', async () => {
  const call = jest.fn().mockResolvedValue({ success: true, payload: {} });
  const api = createCoreApi(call as CoreApi['call']) as CoreApi;

  expect(api).not.toHaveProperty('refreshDeviceState');
  await api.getDeviceState('device-1');
  await api.getDeviceState('device-1', { scope: 'settings' });

  expect(call).toHaveBeenNthCalledWith(1, {
    connectId: 'device-1',
    method: 'getDeviceState',
  });
  expect(call).toHaveBeenNthCalledWith(2, {
    connectId: 'device-1',
    method: 'getDeviceState',
    scope: 'settings',
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `yarn workspace @onekeyfe/hd-core test --runInBand packages/core/__tests__/public-device-state-api.test.ts`

Expected: FAIL，因为 `refreshDeviceState` 仍公开，且 `getDeviceState` 丢弃 scope。

- [ ] **Step 3: 定义唯一公共参数并实现调度**

```ts
export type DeviceStateScope = 'runtime' | 'settings' | 'firmware';

export type GetDeviceStateParams = CommonParams & {
  scope?: DeviceStateScope;
};

export declare function getDeviceState(
  connectId?: string,
  params?: GetDeviceStateParams
): Response<DeviceState>;
```

`GetDeviceState.init()` 校验 scope，设置 `unlockPolicy = 'none'`，并将 scope 保存到 params。`run()` 将 scope 映射为内部 sections：runtime=`status`，settings=`status+settings`，firmware=`status+identity+versions+verification`；V2 loader 自动剔除 status/settings，settings scope 返回 mode-not-supported。

- [ ] **Step 4: 从 inject、CoreApi 和公开 registry 删除 refreshDeviceState**

删除类型 import、CoreApi 属性、inject shortcut 和 `api/index.ts` export；内部 section API继续留在 `Device`，不产生第二个公共入口。

- [ ] **Step 5: 运行定向测试确认通过**

Run: `yarn workspace @onekeyfe/hd-core test --runInBand packages/core/__tests__/public-device-state-api.test.ts packages/core/__tests__/refresh-device-state.test.ts packages/core/__tests__/get-device-state.test.ts`

Expected: 相关 suites 全部 PASS。

- [ ] **Step 6: 提交 SDK API 变更**

```bash
git add packages/core/src/types/api/getDeviceState.ts packages/core/src/api/GetDeviceState.ts packages/core/src/inject.ts packages/core/src/types/api/index.ts packages/core/src/api/index.ts packages/core/src/types/api/refreshDeviceState.ts packages/core/src/api/RefreshDeviceState.ts packages/core/__tests__/public-device-state-api.test.ts packages/core/__tests__/refresh-device-state.test.ts packages/core/__tests__/get-device-state.test.ts
git commit -m "refactor(core): make device state reads live by default"
```

### Task 2: SDK 锁屏读取与实时身份门禁

**Files:**
- Modify: `packages/core/src/api/protocol-v2/DeviceInfoGet.ts`
- Modify: `packages/core/src/api/protocol-v2/DeviceStatusGet.ts`
- Modify: `packages/core/src/core/index.ts`
- Modify: `packages/core/src/device/Device.ts`
- Test: `packages/core/__tests__/protocol-v2.test.ts`
- Test: `packages/core/__tests__/get-device-state.test.ts`

- [ ] **Step 1: 写失败的锁屏与身份测试**

```ts
test('reads live V2 status before checking an expected device id', async () => {
  const device = createV2DeviceWithCachedId('OLD');
  device.commands.typedCall.mockResolvedValueOnce({
    message: { device_id: 'NEW', unlocked: false, init_states: true },
  });

  await expect(runCheckedMethod(device, 'OLD')).rejects.toMatchObject({
    errorCode: HardwareErrorCode.DeviceCheckDeviceIdError,
  });
  expect(device.commands.typedCall).toHaveBeenCalledWith(
    'DeviceStatusGet',
    'DeviceStatus',
    {},
  );
  expect(device.unlockDevice).not.toHaveBeenCalled();
});
```

再增加已知 `unlocked=false` 时 `GetDeviceState`、`DeviceInfoGet`、`DeviceStatusGet`、`DeviceSettingsGet` 均不调用 unlock 的测试。

- [ ] **Step 2: 运行测试确认失败**

Run: `yarn workspace @onekeyfe/hd-core test --runInBand packages/core/__tests__/protocol-v2.test.ts packages/core/__tests__/get-device-state.test.ts`

Expected: FAIL，当前身份比较使用缓存，部分只读方法仍继承自动解锁策略。

- [ ] **Step 3: 实现只读策略**

在所有只读入口的 `init()` 设置：

```ts
this.unlockPolicy = 'none';
this.useDevicePassphraseState = false;
this.skipForceUpdateCheck = true;
```

不得修改设置写入、签名和显式 unlock 方法的策略。

- [ ] **Step 4: 实现 live identity preflight**

在 core 调度层进入 `checkDeviceId` 比较前：

```ts
if (method.deviceId && method.checkDeviceId && device.isProtocolV2()) {
  await device.getDeviceState({ refreshSections: ['status'] });
}
if (method.deviceId && method.checkDeviceId && !device.checkDeviceId(method.deviceId)) {
  throw ERRORS.TypedError(HardwareErrorCode.DeviceCheckDeviceIdError);
}
```

该逻辑位于 mode 守卫之后，确保 loader 方法不会误发 status。

- [ ] **Step 5: 运行测试确认通过并提交**

Run: `yarn workspace @onekeyfe/hd-core test --runInBand packages/core/__tests__/protocol-v2.test.ts packages/core/__tests__/get-device-state.test.ts`

Expected: PASS；locked read 的断言显示 unlock 调用次数为 0。

```bash
git add packages/core/src/api/protocol-v2/DeviceInfoGet.ts packages/core/src/api/protocol-v2/DeviceStatusGet.ts packages/core/src/core/index.ts packages/core/src/device/Device.ts packages/core/__tests__/protocol-v2.test.ts packages/core/__tests__/get-device-state.test.ts
git commit -m "fix(core): verify live device identity without unlocking"
```

### Task 3: SDK 示例迁移

**Files:**
- Modify: `packages/connect-examples/expo-playground/app/data/methods/device.ts`
- Modify: `packages/connect-examples/expo-playground/app/routes/pro2-debug.tsx`
- Modify: `packages/connect-examples/expo-playground/app/services/hardwareService.ts`
- Modify: `packages/connect-examples/expo-example/src/data/basic.ts`
- Modify: `packages/connect-examples/expo-example/src/data/pro2.ts`
- Modify: `packages/connect-examples/expo-example/src/views/FirmwareScreen/index.tsx`
- Modify: `packages/connect-examples/react-native-demo/ble/src/BleDemoScreen.tsx`
- Test: 对应现有 Jest 文件。

- [ ] **Step 1: 修改示例测试，要求只展示一个 getDeviceState 方法及 scopes**

测试应断言不存在 `refreshDeviceState`，并存在 runtime、settings、firmware 三个可执行 preset。

- [ ] **Step 2: 运行示例测试确认失败**

Run: `yarn workspace onekey-hardware-playground test --runInBand`

Expected: FAIL，因为旧方法和调用仍存在。

- [ ] **Step 3: 将调用迁移为 getDeviceState scope**

```ts
await sdk.getDeviceState(connectId);
await sdk.getDeviceState(connectId, { scope: 'settings' });
await sdk.getDeviceState(connectId, { scope: 'firmware' });
```

Pro2 原生 debug 方法继续通过内部 dispatcher，仅用于开发页面，不重新加入 CoreApi。

- [ ] **Step 4: 运行示例测试并提交**

Run: `yarn workspace onekey-hardware-playground test --runInBand`

Expected: PASS。

```bash
git add packages/connect-examples
git commit -m "refactor(examples): use scoped device state reads"
```

### Task 4: App 单 API 与设备详情实时状态

**Files:**
- Modify: `packages/kit-bg/src/services/ServiceHardware/ServiceHardware.ts`
- Modify: `packages/kit-bg/src/services/ServiceHardware/DeviceSettingsManager.ts`
- Modify: `packages/kit-bg/src/services/ServiceAccount/deviceStateForHwWalletCreate.ts`
- Modify: `packages/kit-bg/src/services/ServiceAccount/ServiceAccount.ts`
- Modify: `packages/kit/src/states/jotai/contexts/deviceDetails/actions.ts`
- Modify: `packages/kit/src/views/DeviceManagement/pages/DeviceDetailsModal/dialog/DialogDeviceAbout.tsx`
- Modify: `packages/kit/src/views/Onboarding/pages/ConnectHardwareWallet/passphraseStateUtils.ts`
- Test: `packages/kit-bg/src/services/ServiceHardware/ServiceHardware.pro2DeviceManagement.test.ts`
- Test: `packages/kit-bg/src/services/ServiceAccount/deviceStateForHwWalletCreate.test.ts`

- [ ] **Step 1: 写失败的 App 服务测试**

测试要求：钱包创建调用默认 live `getDeviceState` 并拒绝 normal OneKey state 的空 deviceId；设备详情调用 `{ scope: 'settings' }`；固件/About 调用 `{ scope: 'firmware' }`；不存在 App `refreshDeviceState` wrapper。

- [ ] **Step 2: 运行测试确认失败**

Run: `yarn jest --runInBand packages/kit-bg/src/services/ServiceHardware/ServiceHardware.pro2DeviceManagement.test.ts packages/kit-bg/src/services/ServiceAccount/deviceStateForHwWalletCreate.test.ts`

Expected: FAIL，因为当前 service 仍暴露 refresh wrapper，详情只刷新 settings，创建流程接受缓存状态。

- [ ] **Step 3: 迁移 ServiceHardware**

让 `getDeviceState` 原样转发 scope；删除 `_refreshDeviceState*` 和公开 wrapper。将 Pro2 snapshot 改为通用 OneKey snapshot，并用一次 `{ scope: 'settings' }` 获取 live runtime + settings。

- [ ] **Step 4: 加强钱包创建状态解析**

```ts
const state = await getDeviceState(connectId);
if (state.status.mode === 'normal' && !state.identity.deviceId) {
  throw new OneKeyLocalError('Unable to resolve live hardware device identity');
}
return state;
```

已有 basic state 不能短路 live 读取。

- [ ] **Step 5: 迁移调用点并运行测试**

Run: `yarn jest --runInBand packages/kit-bg/src/services/ServiceHardware/ServiceHardware.pro2DeviceManagement.test.ts packages/kit-bg/src/services/ServiceAccount/deviceStateForHwWalletCreate.test.ts packages/kit-bg/src/services/ServiceHardware/DeviceSettingsManager.pro2.test.ts`

Expected: PASS。

- [ ] **Step 6: 提交 App API 迁移**

```bash
git add packages/kit-bg/src/services/ServiceHardware packages/kit-bg/src/services/ServiceAccount packages/kit/src/states/jotai/contexts/deviceDetails/actions.ts packages/kit/src/views/DeviceManagement packages/kit/src/views/Onboarding
git commit -m "refactor(hardware): use live scoped device state reads"
```

### Task 5: App 增量事件与设备重置隔离

**Files:**
- Modify: `packages/kit-bg/src/dbs/local/LocalDbBase.ts`
- Modify: `packages/kit-bg/src/services/ServiceHardware/ServiceHardware.ts`
- Modify: `packages/kit/src/states/jotai/contexts/deviceDetails/deviceStateManagement.ts`
- Modify: `packages/kit/src/states/jotai/contexts/deviceDetails/actions.ts`
- Test: `packages/kit/src/states/jotai/contexts/deviceDetails/deviceStateManagement.test.ts`
- Test: `packages/kit-bg/src/services/ServiceHardware/ServiceHardware.pro2DeviceManagement.test.ts`
- Test: 新增 `packages/kit-bg/src/dbs/local/LocalDbBase.deviceState.test.ts` 或加入现有 DB 测试文件。

- [ ] **Step 1: 写失败的 reducer 和 reset 测试**

```ts
it('preserves trusted runtime fields when a basic event changes only bleName', () => {
  const merged = reduceDeviceStateEvent({
    base: hydratedState,
    event: basicEventWithNullRuntime,
  });
  expect(merged.identity.deviceId).toBe('DEVICE_ID');
  expect(merged.status.unlocked).toBe(false);
  expect(merged.identity.bleName).toBe('Pro2 New');
});

it('rejects a new wallet identity on the same physical serial number', () => {
  expect(matchDeviceStateEvent(oldDevice, resetEvent)).toEqual({
    kind: 'identity-mismatch',
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `yarn jest --runInBand packages/kit/src/states/jotai/contexts/deviceDetails/deviceStateManagement.test.ts packages/kit-bg/src/services/ServiceHardware/ServiceHardware.pro2DeviceManagement.test.ts`

Expected: FAIL，当前 UI 整份替换，DB 优先按 serialNo 接收不同 deviceId。

- [ ] **Step 3: 实现共享增量合并规则**

实现纯函数，按 `changedKeys` 复制对应 section/field，忽略 `raw/session`，最后按 `label || bleName || fallback` 重算 displayName。UI snapshot reducer和 DB 持久化使用相同语义。

- [ ] **Step 4: 实现 reset 隔离**

当 stored/event deviceId 均非空且不相等时：

- DB 不写入旧 deviceState。
- UI 不更新旧钱包 snapshot。
- ServiceHardware 发出设备身份变化结果，接入现有 deprecated/reset 提示更新流程。
- 空 event deviceId 只允许 basic 字段增量更新，不清空已确认身份。

- [ ] **Step 5: 运行 App 回归并提交**

Run: `yarn jest --runInBand packages/kit/src/states/jotai/contexts/deviceDetails/deviceStateManagement.test.ts packages/kit-bg/src/services/ServiceHardware/ServiceHardware.pro2DeviceManagement.test.ts packages/kit-bg/src/services/ServiceAccount/deviceStateForHwWalletCreate.test.ts`

Expected: PASS。

```bash
git add packages/kit-bg/src/dbs/local/LocalDbBase.ts packages/kit-bg/src/services/ServiceHardware/ServiceHardware.ts packages/kit/src/states/jotai/contexts/deviceDetails
git commit -m "fix(hardware): isolate reset identities in device state events"
```

### Task 6: 跨协议、类型与实机验证

**Files:**
- Modify only if a verification failure reveals an in-scope defect.

- [ ] **Step 1: 搜索删除后的 API 残留**

Run: `rg -n "refreshDeviceState" packages --glob '*.{ts,tsx}'`

Expected: SDK/App 公开业务代码无残留；只有历史设计文档或明确内部说明可以保留。

- [ ] **Step 2: SDK 定向与全量 core 测试**

Run: `yarn workspace @onekeyfe/hd-core test --runInBand`

Expected: 所有 core suites PASS。

- [ ] **Step 3: SDK 类型检查和构建**

Run: `yarn workspace @onekeyfe/hd-core build`

Expected: exit 0。

- [ ] **Step 4: App 定向测试和类型检查**

Run: `yarn jest --runInBand packages/kit-bg/src/services/ServiceHardware/ServiceHardware.pro2DeviceManagement.test.ts packages/kit-bg/src/services/ServiceAccount/deviceStateForHwWalletCreate.test.ts packages/kit/src/states/jotai/contexts/deviceDetails/deviceStateManagement.test.ts`

Run: `yarn typecheck`

Expected: tests PASS；typecheck exit 0，或准确记录与本次无关的基线错误。

- [ ] **Step 5: 实机 CLI 验证**

依次验证 normal、locked 和 boot/rom：

```bash
onekey-hw search
onekey-hw get-device-state
onekey-hw get-device-state --scope settings
onekey-hw get-device-state --scope firmware
```

Expected：normal 返回非空 deviceId；locked 读取不弹 PIN；loader 日志中没有 `DeviceStatusGet`。

- [ ] **Step 6: 检查两个仓库 diff 和提交状态**

Run: `git status --short && git diff --check`

Expected: 无格式错误；只包含计划内变更和实施前已存在的明确未提交文件。
