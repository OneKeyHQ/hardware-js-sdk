# Unified Device State SDK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 hardware-js-sdk 的设备运行时状态完整迁移到唯一 `DeviceState`，并以无状态投影保留旧 `Features`、`DeviceProfile` API 兼容性。

**Architecture:** `DeviceStateStore` 是唯一缓存与合并入口，Protocol V1/V2 Mapper 只负责协议数据转换，Projector 只负责旧 API 投影。`getDeviceState()` 和 `DEVICE.STATE` 共享同一完整快照；默认读取不发送 `DeviceStatusGet`，boot/rom 模式禁止发送该命令。

**Tech Stack:** TypeScript、Jest、EventEmitter、OneKey Protocol V1/V2、Yarn/Lerna

---

## 文件结构

- Create: `packages/core/src/device/DeviceStateStore.ts` — 唯一状态合并、revision、派生字段。
- Create: `packages/core/src/device/DeviceStateMapper.ts` — V1/V2 协议响应到统一 patch。
- Create: `packages/core/src/device/DeviceStateProjector.ts` — `Features`、`DeviceProfile` 兼容投影。
- Create: `packages/core/src/types/api/getDeviceState.ts` — 新查询 API 类型。
- Create: `packages/core/src/api/GetDeviceState.ts` — 新 API 方法。
- Create: `packages/core/__tests__/device-state-store.test.ts` — Store 单元测试。
- Create: `packages/core/__tests__/device-state-mapper.test.ts` — Mapper 单元测试。
- Create: `packages/core/__tests__/device-state-projector.test.ts` — 兼容投影测试。
- Create: `packages/core/__tests__/get-device-state.test.ts` — 查询与状态命令策略测试。
- Modify: `packages/core/src/types/device.ts` — 定义 `DeviceState`，让 `KnownDevice` 暴露 `state`。
- Modify: `packages/core/src/events/device.ts` — 定义 `DEVICE.STATE` payload。
- Modify: `packages/core/src/events/device.ts` — 在现有 `DEVICE` 常量中添加 `STATE`。
- Modify: `packages/core/src/device/Device.ts` — 用 Store 替换 `features` 状态缓存。
- Modify: `packages/core/src/api/GetFeatures.ts` — 改为新状态投影。
- Modify: `packages/core/src/api/GetDeviceInfo.ts` — 改为新状态投影。
- Modify: `packages/core/src/api/device/DeviceSettings.ts` — 设置成功后提交状态 patch。
- Modify: `packages/core/src/api/protocol-v2/DeviceSettingsGet.ts` — 设置读取提交状态 patch。
- Modify: `packages/core/src/api/protocol-v2/DeviceSettingsSet.ts` — 设置成功提交状态 patch。
- Modify: `packages/core/src/core/index.ts` — 转发 `DEVICE.STATE` 并兼容投影旧事件。
- Modify: `packages/core/src/inject.ts` — 暴露 `getDeviceState`。
- Modify: `packages/core/src/types/api/index.ts` — 导出新 API。
- Delete: `packages/core/src/device/DeviceFeaturesState.ts` — 旧扁平状态合并器。
- Delete: `packages/core/src/device/DeviceSettingsState.ts` — 旧 Features 设置 patch 生成器。

### Task 1: 定义统一状态类型与事件契约

**Files:**
- Modify: `packages/core/src/types/device.ts`
- Create: `packages/core/src/types/api/getDeviceState.ts`
- Modify: `packages/core/src/types/api/index.ts`
- Modify: `packages/core/src/events/device.ts`
- Test: `packages/core/__tests__/device-state-contract.test.ts`

- [ ] **Step 1: 写失败的类型/事件测试**

```ts
import { DEVICE } from '../src/events';
import type { DeviceState, DeviceStateEvent } from '../src/types';

test('exports the unified device state event contract', () => {
  expect(DEVICE.STATE).toBe('state');
  const state = {} as DeviceState;
  const event: DeviceStateEvent = {
    connectId: 'usb-1',
    state,
    revision: 1,
    source: 'initialize',
    changedKeys: ['identity.label'],
  };
  expect(event.state).toBe(state);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `yarn workspace @onekeyfe/hd-core test device-state-contract.test.ts --runInBand`  
Expected: FAIL，提示 `DEVICE.STATE`、`DeviceState` 或 `DeviceStateEvent` 不存在。

- [ ] **Step 3: 添加完整状态和查询类型**

按设计规范定义 `DeviceState`、`DeviceStatePatch`、`DeviceStateSection`、`DeviceStateUpdateSource`、`DeviceStateEvent` 和：

```ts
export type GetDeviceStateParams = {
  refresh?: DeviceStateSection[];
  includeRaw?: boolean;
};

export declare function getDeviceState(
  connectId?: string,
  params?: CommonParams & GetDeviceStateParams
): Response<DeviceState>;
```

同时添加：

```ts
STATE: 'state',
```

- [ ] **Step 4: 运行测试并确认通过**

Run: `yarn workspace @onekeyfe/hd-core test device-state-contract.test.ts --runInBand`  
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/core/src/types packages/core/src/events/device.ts packages/core/__tests__/device-state-contract.test.ts
git commit -m "feat(core): define unified device state contract"
```

### Task 2: 实现唯一 DeviceStateStore

**Files:**
- Create: `packages/core/src/device/DeviceStateStore.ts`
- Test: `packages/core/__tests__/device-state-store.test.ts`

- [ ] **Step 1: 写失败测试，固定 patch、null 和派生名称语义**

```ts
test('merges patches, ignores undefined and recomputes displayName', () => {
  const store = new DeviceStateStore(createEmptyDeviceState());
  store.update({ identity: { bleName: 'Pro2 1234', label: null } }, 'initialize');
  const result = store.update(
    { identity: { label: 'My Wallet', bleName: undefined } },
    'apply-settings'
  );
  expect(result.state.identity).toMatchObject({
    label: 'My Wallet',
    bleName: 'Pro2 1234',
    displayName: 'My Wallet',
  });
  expect(result.revision).toBe(2);
  expect(result.changedKeys).toContain('identity.label');
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `yarn workspace @onekeyfe/hd-core test device-state-store.test.ts --runInBand`  
Expected: FAIL，模块不存在。

- [ ] **Step 3: 实现 Store**

核心接口固定为：

```ts
export class DeviceStateStore {
  constructor(initial?: DeviceState);
  getState(): DeviceState | undefined;
  replace(state: DeviceState, source: DeviceStateUpdateSource): DeviceStateUpdateResult;
  update(patch: DeviceStatePatch, source: DeviceStateUpdateSource): DeviceStateUpdateResult;
  clearSession(source: DeviceStateUpdateSource): DeviceStateUpdateResult | undefined;
}
```

合并规则：`undefined` 不修改、`null` 覆盖；仅真实变化增加 revision；每次合并重新计算 `identity.displayName`。

- [ ] **Step 4: 运行 Store 测试**

Run: `yarn workspace @onekeyfe/hd-core test device-state-store.test.ts --runInBand`  
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/core/src/device/DeviceStateStore.ts packages/core/__tests__/device-state-store.test.ts
git commit -m "feat(core): add canonical device state store"
```

### Task 3: 实现 Protocol V1/V2 Mapper

**Files:**
- Create: `packages/core/src/device/DeviceStateMapper.ts`
- Modify: `packages/core/src/protocols/protocol-v2/features.ts`
- Test: `packages/core/__tests__/device-state-mapper.test.ts`

- [ ] **Step 1: 写失败测试**

测试至少覆盖：V1 label/version/status、V2 identity/settings/version、V2 status 单独 patch、boot 模式不伪造 unlocked。

```ts
test('maps Protocol V2 DeviceInfo without requiring status targets', () => {
  const patch = mapProtocolV2DeviceInfoToState(deviceInfoFixture);
  expect(patch.identity?.serialNo).toBe('SERIAL-1');
  expect(patch.status?.unlocked).toBeUndefined();
  expect(patch.settings?.brightness).toBe(80);
});
```

- [ ] **Step 2: 运行并确认失败**

Run: `yarn workspace @onekeyfe/hd-core test device-state-mapper.test.ts --runInBand`  
Expected: FAIL，Mapper 导出不存在。

- [ ] **Step 3: 实现纯 Mapper**

导出：

```ts
mapProtocolV1FeaturesToState(features, onekeyFeatures?): DeviceStatePatch
mapProtocolV2DeviceInfoToState(info): DeviceStatePatch
mapProtocolV2DeviceStatusToState(status): DeviceStatePatch
mapApplySettingsToState(settings): DeviceStatePatch
mapDeviceSettingsToState(settings): DeviceStatePatch
```

Mapper 不读取 Device、不发送命令、不发送事件。

- [ ] **Step 4: 运行 Mapper 测试**

Run: `yarn workspace @onekeyfe/hd-core test device-state-mapper.test.ts --runInBand`  
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/core/src/device/DeviceStateMapper.ts packages/core/src/protocols/protocol-v2/features.ts packages/core/__tests__/device-state-mapper.test.ts
git commit -m "feat(core): normalize protocol data into device state"
```

### Task 4: 实现旧 API 无状态 Projector

**Files:**
- Create: `packages/core/src/device/DeviceStateProjector.ts`
- Test: `packages/core/__tests__/device-state-projector.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
test('projects legacy Features and DeviceProfile from one snapshot', () => {
  const state = createDeviceStateFixture();
  const features = projectFeatures(state);
  const profile = projectDeviceProfile(state, { includeRaw: false });
  expect(features.label).toBe(state.identity.label);
  expect(features.unlocked).toBe(state.status.unlocked);
  expect(profile.status.unlocked).toBe(state.status.unlocked);
  expect(profile.versions.firmware).toBe(state.versions.firmware);
});
```

- [ ] **Step 2: 运行并确认失败**

Run: `yarn workspace @onekeyfe/hd-core test device-state-projector.test.ts --runInBand`  
Expected: FAIL，Projector 不存在。

- [ ] **Step 3: 实现纯 Projector**

```ts
projectFeatures(state: DeviceState): Features
projectDeviceProfile(state: DeviceState, params?: GetDeviceInfoParams): DeviceProfile
```

旧 snake_case 原始字段只从 `state.raw` 合并；标准字段始终以统一 section 为准。

- [ ] **Step 4: 运行投影测试**

Run: `yarn workspace @onekeyfe/hd-core test device-state-projector.test.ts --runInBand`  
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/core/src/device/DeviceStateProjector.ts packages/core/__tests__/device-state-projector.test.ts
git commit -m "feat(core): project legacy device views from state"
```

### Task 5: 将 Device 内部缓存和事件迁移到 DeviceState

**Files:**
- Modify: `packages/core/src/device/Device.ts`
- Modify: `packages/core/src/core/index.ts`
- Modify: `packages/core/src/events/device.ts`
- Test: `packages/core/__tests__/device-state-events.test.ts`

- [ ] **Step 1: 写失败事件测试**

```ts
test('emits a full STATE snapshot and a projected legacy FEATURES event', () => {
  const onState = jest.fn();
  const onFeatures = jest.fn();
  device.on(DEVICE.STATE, onState);
  device.on(DEVICE.FEATURES, onFeatures);
  device.updateState({ identity: { label: 'Renamed' } }, 'apply-settings');
  expect(onState).toHaveBeenCalledWith(
    device,
    expect.objectContaining({ state: expect.objectContaining({ revision: 1 }) })
  );
  expect(onFeatures.mock.calls[0][1].label).toBe('Renamed');
});
```

- [ ] **Step 2: 运行并确认失败**

Run: `yarn workspace @onekeyfe/hd-core test device-state-events.test.ts --runInBand`  
Expected: FAIL，`updateState` 不存在。

- [ ] **Step 3: 改造 Device**

用：

```ts
private readonly stateStore = new DeviceStateStore();
get state() { return this.stateStore.getState(); }
updateState(patch, source) { /* store.update + STATE + legacy projection */ }
```

替换 `features`、`featuresNeedsReload`、`updateFeaturesPatch` 和所有直接 `DEVICE.FEATURES` 发送路径。`toMessageObject()` 同时暴露 `state`，旧 `features` 从 Projector 生成；`displayName` 使用 label 优先。

- [ ] **Step 4: 运行事件与既有设备测试**

Run: `yarn workspace @onekeyfe/hd-core test device-state-events.test.ts device-features-state.test.ts --runInBand`  
Expected: 新测试 PASS；旧测试迁移为状态测试后 PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/core/src/device/Device.ts packages/core/src/core/index.ts packages/core/src/events/device.ts packages/core/__tests__
git commit -m "refactor(core): make device state the only runtime cache"
```

### Task 6: 新增 getDeviceState 并固定状态读取策略

**Files:**
- Create: `packages/core/src/api/GetDeviceState.ts`
- Modify: `packages/core/src/inject.ts`
- Modify: `packages/core/src/types/api/index.ts`
- Modify: `packages/core/src/api/index.ts`
- Modify: `packages/core/src/device/Device.ts`
- Test: `packages/core/__tests__/get-device-state.test.ts`
- Test: `packages/core/__tests__/protocol-v2.test.ts`

- [ ] **Step 1: 写失败测试：默认不读取状态**

```ts
test('does not call DeviceStatusGet during default Protocol V2 state hydration', async () => {
  await callMethod({ method: 'getDeviceState', connectId: 'pro2' });
  expect(typedCall).toHaveBeenCalledWith(
    'DeviceInfoGet',
    'DeviceInfo',
    expect.not.objectContaining({ targets: expect.objectContaining({ status: true }) }),
    expect.anything()
  );
  expect(typedCall).not.toHaveBeenCalledWith('DeviceStatusGet', expect.anything(), expect.anything());
});
```

- [ ] **Step 2: 写失败测试：boot 模式禁止状态命令**

显式 `refresh: ['status']` 时，bootloader/romloader 仍断言 `DeviceStatusGet` 未调用。

- [ ] **Step 3: 运行并确认失败**

Run: `yarn workspace @onekeyfe/hd-core test get-device-state.test.ts --runInBand`  
Expected: FAIL，新方法不存在。

- [ ] **Step 4: 实现查询与刷新策略**

默认复用缓存；无缓存时 V1 初始化、V2 调用不带 status target 的 `DeviceInfoGet`。仅 `refresh` 包含 `status` 且 mode 为 normal 时调用 `DeviceStatusGet`。

- [ ] **Step 5: 运行测试**

Run: `yarn workspace @onekeyfe/hd-core test get-device-state.test.ts protocol-v2.test.ts --runInBand`  
Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add packages/core/src/api/GetDeviceState.ts packages/core/src/api/index.ts packages/core/src/inject.ts packages/core/src/types/api/index.ts packages/core/src/device/Device.ts packages/core/__tests__
git commit -m "feat(core): add explicit device state queries"
```

### Task 7: 把设置、解锁和会话变化接入统一状态

**Files:**
- Modify: `packages/core/src/api/device/DeviceSettings.ts`
- Modify: `packages/core/src/api/protocol-v2/DeviceSettingsGet.ts`
- Modify: `packages/core/src/api/protocol-v2/DeviceSettingsSet.ts`
- Modify: `packages/core/src/device/Device.ts`
- Modify: other call sites returned by `rg -n "updateFeaturesPatch|_updateFeatures|featuresNeedsReload" packages/core/src`
- Test: `packages/core/__tests__/device-settings.test.ts`
- Test: `packages/core/__tests__/device-settings-state.test.ts`

- [ ] **Step 1: 把既有设置测试改成期望 `updateState`**

```ts
expect(updateState).toHaveBeenCalledWith(
  { identity: { label: 'Renamed' } },
  'apply-settings'
);
```

- [ ] **Step 2: 运行并确认失败**

Run: `yarn workspace @onekeyfe/hd-core test device-settings.test.ts --runInBand`  
Expected: FAIL，生产代码仍调用旧 patch 方法。

- [ ] **Step 3: 迁移所有状态写入点**

设置读取和成功写入调用 Mapper 后 `device.updateState()`；解锁写入 `status.unlocked`；session/passphrase 写入 `session`；重连清理易失 session，不清除已确认身份和设置。

- [ ] **Step 4: 删除旧合并器并确认无引用**

Run: `rg -n "updateFeaturesPatch|DeviceFeaturesState|DeviceSettingsState|featuresNeedsReload" packages/core/src`  
Expected: 无业务代码命中。

- [ ] **Step 5: 运行相关测试**

Run: `yarn workspace @onekeyfe/hd-core test device-settings.test.ts device-state-store.test.ts protocol-v2.test.ts --runInBand`  
Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add packages/core/src packages/core/__tests__
git commit -m "refactor(core): route device mutations through state"
```

### Task 8: 将旧查询 API 改为兼容投影并清理 status target

**Files:**
- Modify: `packages/core/src/api/GetFeatures.ts`
- Modify: `packages/core/src/api/GetDeviceInfo.ts`
- Modify: `packages/core/src/protocols/protocol-v2/features.ts`
- Modify: `packages/connect-examples/expo-example/src/data/basic.ts`
- Modify: `packages/connect-examples/developer-portal/content/en/hardware-sdk/basic-api/get-device-info.mdx`
- Test: `packages/core/__tests__/get-device-state.test.ts`
- Test: `packages/core/__tests__/protocol-v2.test.ts`

- [ ] **Step 1: 写失败兼容测试**

断言 `getFeatures()` 与 `getDeviceInfo()` 返回同一状态投影，并且调用它们不会额外执行 `DeviceStatusGet`。

- [ ] **Step 2: 运行并确认失败**

Run: `yarn workspace @onekeyfe/hd-core test get-device-state.test.ts --runInBand`  
Expected: FAIL，旧方法仍有独立路径。

- [ ] **Step 3: 改造旧 API 并删除 status target 用法**

旧 API 先复用 `Device` 的状态读取，再调用 Projector。删除业务与示例中的 `status: true`；原始协议调试如必须保留字段选择，默认值也必须为 false 且不得进入业务 API。

- [ ] **Step 4: 全仓搜索确认**

Run: `rg -n "targets:\s*\{[^}]*status|status:\s*true" packages/core packages/connect-examples/expo-example/src/data/basic.ts`  
Expected: 无业务构造命中。

- [ ] **Step 5: 运行兼容测试**

Run: `yarn workspace @onekeyfe/hd-core test get-device-state.test.ts protocol-v2.test.ts --runInBand`  
Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add packages/core packages/connect-examples/expo-example packages/connect-examples/developer-portal
git commit -m "refactor(core): serve legacy APIs from device state"
```

### Task 9: SDK 全量验证

**Files:**
- Modify: only files required by verification failures

- [ ] **Step 1: 运行 core 全量测试**

Run: `yarn workspace @onekeyfe/hd-core test --runInBand`  
Expected: 全部 PASS。

- [ ] **Step 2: 运行 lint**

Run: `yarn workspace @onekeyfe/hd-core lint`  
Expected: exit 0。

- [ ] **Step 3: 构建 SDK**

Run: `yarn workspace @onekeyfe/hd-core build`  
Expected: exit 0，只允许已有非阻塞 warning。

- [ ] **Step 4: 检查架构验收条件**

Run: `rg -n "device\.features|featuresNeedsReload|updateFeaturesPatch|targets:\s*\{[^}]*status|status:\s*true" packages/core/src`  
Expected: 无运行时旧状态容器或默认 status target 命中。

- [ ] **Step 5: 提交验证修复**

```bash
git add packages/core packages/connect-examples
git commit -m "test(core): verify unified device state migration"
```
