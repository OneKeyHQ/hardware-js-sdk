# Unified Device State App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 app-monorepo 的 OneKey 设备状态完整迁移到 SDK `DeviceState`，统一数据库、后台服务、状态容器和页面刷新链路。

**Architecture:** App 监听 `DEVICE.STATE` 完整快照，同时更新数据库和内存事件；长期数据库只保存去除 `session/raw` 的 `deviceState`。旧 `features` 数据只在数据库升级时转换，不运行时双写；UI 通过 section selector 消费统一状态。

**Tech Stack:** TypeScript、React Native/React、Jotai、Realm/LocalDb、Jest、Yarn workspaces

---

## 发布与本地验证依赖

App 的 `package.json` 最终必须升级到包含 `DeviceState` 的正式 SDK 版本。本地实施期间先构建 SDK worktree，再把构建产物链接到 App worktree 的安装目录用于 TypeScript/Jest 验证；不得提交绝对路径、临时 symlink 或手工复制产物。

## 文件结构

- Modify: `packages/shared/types/device.ts` — App 设备状态类型别名。
- Modify: `packages/shared/src/utils/deviceUtils.ts` — section 化 selector。
- Modify: `packages/shared/src/eventBus/appEventBusNames.ts` — 状态更新事件名。
- Modify: `packages/shared/src/eventBus/appEventBus.ts` — 状态事件 payload。
- Modify: `packages/kit-bg/src/dbs/local/types.ts` — `deviceState` 持久化字段。
- Modify: `packages/kit-bg/src/dbs/local/realm/schemas/RealmSchemaDevice.ts` — Realm schema。
- Modify: `packages/kit-bg/src/dbs/local/LocalDbBase.ts` — 序列化、迁移和更新接口。
- Modify: `packages/kit-bg/src/services/ServiceHardware/ServiceHardware.ts` — 新事件、查询和内存刷新链路。
- Modify: `packages/kit-bg/src/services/ServiceHardware/DeviceSettingsManager.ts` — 统一 settings/identity 消费。
- Modify: `packages/kit/src/states/jotai/contexts/deviceDetails/actions.ts` — 统一 state selector。
- Modify: `packages/kit/src/states/jotai/contexts/deviceDetails/pro2DeviceManagement.ts` — 去掉 Pro2 专属 features 视图。
- Modify: `packages/kit/src/views/DeviceManagement/pages/DeviceDetailsModal/dialog/DialogDeviceAbout.tsx` — 新状态查询。
- Modify: `packages/kit-bg/src/services/ServiceFirmwareUpdate/ServiceFirmwareUpdate.ts` — 使用 identity/status/versions。
- Modify: all OneKey business call sites returned by focused `rg` searches; third-party adapter raw Features paths remain isolated.

### Task 1: 建立 App 的 DeviceState 类型和 selector

**Files:**
- Modify: `packages/shared/types/device.ts`
- Modify: `packages/shared/src/utils/deviceUtils.ts`
- Test: `packages/shared/src/utils/deviceUtils.test.ts`

- [ ] **Step 1: 写失败 selector 测试**

```ts
test('uses label-first display name from DeviceState', () => {
  const state = createDeviceState({
    identity: { label: 'Renamed', bleName: 'Pro2 1234', displayName: 'Renamed' },
  });
  expect(deviceUtils.getDeviceDisplayName({ state })).toBe('Renamed');
  expect(deviceUtils.getDeviceFirmwareVersion({ state })).toBe(state.versions.firmware);
});
```

- [ ] **Step 2: 运行并确认失败**

Run: `yarn jest packages/shared/src/utils/deviceUtils.test.ts --runInBand`  
Expected: FAIL，新 selector 参数不存在。

- [ ] **Step 3: 替换主类型并添加 selector**

```ts
export type IOneKeyDeviceState = DeviceState;
export type IOneKeyPersistedDeviceState = Omit<DeviceState, 'session' | 'raw'>;
```

新增基于 `identity/status/settings/versions` 的小型 selector；旧 Features helper 只允许服务第三方适配器或数据库迁移器。

- [ ] **Step 4: 运行测试**

Run: `yarn jest packages/shared/src/utils/deviceUtils.test.ts --runInBand`  
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/shared/types/device.ts packages/shared/src/utils/deviceUtils.ts packages/shared/src/utils/deviceUtils.test.ts
git commit -m "refactor(shared): model OneKey hardware with device state"
```

### Task 2: 数据库一次性迁移到 deviceState

**Files:**
- Modify: `packages/kit-bg/src/dbs/local/types.ts`
- Modify: `packages/kit-bg/src/dbs/local/realm/schemas/RealmSchemaDevice.ts`
- Modify: `packages/kit-bg/src/dbs/local/LocalDbBase.ts`
- Test: `packages/kit-bg/src/dbs/local/LocalDbBase.deviceState.test.ts`

- [ ] **Step 1: 写失败数据库迁移测试**

```ts
test('converts legacy features once and persists only deviceState updates', async () => {
  const device = buildDbDevice({ features: JSON.stringify(legacyFeatures) });
  const parsed = localDb.parseDevice(device);
  expect(parsed.deviceStateInfo?.identity.label).toBe(legacyFeatures.label);
  await localDb.updateDeviceState({ deviceState: renamedState });
  expect(updateRecord).toHaveBeenCalledWith(
    expect.objectContaining({ deviceState: expect.any(String) })
  );
  expect(updateRecord.mock.calls.at(-1)?.[0]).not.toHaveProperty('features');
});
```

- [ ] **Step 2: 运行并确认失败**

Run: `yarn jest packages/kit-bg/src/dbs/local/LocalDbBase.deviceState.test.ts --runInBand`  
Expected: FAIL，schema/方法不存在。

- [ ] **Step 3: 修改 schema 和 DB 类型**

增加：

```ts
deviceState: string;
deviceStateInfo?: IOneKeyPersistedDeviceState;
```

保留旧 `features` schema 字段仅为读取历史记录，禁止新业务写入。

- [ ] **Step 4: 实现迁移与更新方法**

```ts
updateDeviceState({ deviceState }: { deviceState: DeviceState }): Promise<void>
```

序列化前移除 `session/raw`；历史 `features` 只在 `deviceState` 为空时通过纯转换器迁移，并立即写回 `deviceState`。

- [ ] **Step 5: 运行数据库测试**

Run: `yarn jest packages/kit-bg/src/dbs/local/LocalDbBase.deviceState.test.ts --runInBand`  
Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add packages/kit-bg/src/dbs/local
git commit -m "refactor(db): persist canonical hardware device state"
```

### Task 3: ServiceHardware 监听 DEVICE.STATE 并同步 DB/内存

**Files:**
- Modify: `packages/shared/src/eventBus/appEventBusNames.ts`
- Modify: `packages/shared/src/eventBus/appEventBus.ts`
- Modify: `packages/kit-bg/src/services/ServiceHardware/ServiceHardware.ts`
- Test: `packages/kit-bg/src/services/ServiceHardware/ServiceHardware.pro2DeviceManagement.test.ts`

- [ ] **Step 1: 写失败事件测试**

```ts
test('persists and broadcasts SDK device state snapshots', async () => {
  sdkStateHandler({ connectId: 'pro2', state, revision: 2, source: 'apply-settings' });
  await flushPromises();
  expect(localDb.updateDeviceState).toHaveBeenCalledWith({ deviceState: state });
  expect(appEventBus.emit).toHaveBeenCalledWith(
    EAppEventBusNames.HardwareDeviceStateUpdate,
    expect.objectContaining({ state, revision: 2 })
  );
});
```

- [ ] **Step 2: 运行并确认失败**

Run: `yarn jest packages/kit-bg/src/services/ServiceHardware/ServiceHardware.pro2DeviceManagement.test.ts --runInBand`  
Expected: FAIL，仍监听 `DEVICE.FEATURES`。

- [ ] **Step 3: 接入新事件和 revision 保护**

监听 `DEVICE.STATE`，按 connectId/deviceId/serialNo 定位设备；维护 SDK 会话内最后 revision；先更新内存事件，再异步持久化。删除 OneKey 的 `DEVICE.FEATURES` 主同步路径，第三方 adapter 兼容路径保持隔离。

- [ ] **Step 4: 运行事件测试**

Run: `yarn jest packages/kit-bg/src/services/ServiceHardware/ServiceHardware.pro2DeviceManagement.test.ts --runInBand`  
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/shared/src/eventBus packages/kit-bg/src/services/ServiceHardware
git commit -m "refactor(hardware): synchronize SDK device state snapshots"
```

### Task 4: 迁移 ServiceHardware 查询 API

**Files:**
- Modify: `packages/kit-bg/src/services/ServiceHardware/ServiceHardware.ts`
- Modify: callers returned by `rg -n "serviceHardware\.(getFeatures|getDeviceInfo)|hardwareSDK\?\.(getFeatures|getDeviceInfo)" packages apps`
- Test: `packages/kit-bg/src/services/ServiceHardware/ServiceHardware.pro2DeviceManagement.test.ts`

- [ ] **Step 1: 写失败查询测试**

```ts
test('hydrates OneKey devices through getDeviceState without implicit status refresh', async () => {
  await service.getDeviceState({ connectId: 'pro2' });
  expect(hardwareSDK.getDeviceState).toHaveBeenCalledWith('pro2', undefined);
  expect(hardwareSDK.getFeatures).not.toHaveBeenCalled();
  expect(hardwareSDK).not.toHaveProperty('getDeviceInfo');
});
```

- [ ] **Step 2: 运行并确认失败**

Run: `yarn jest packages/kit-bg/src/services/ServiceHardware/ServiceHardware.pro2DeviceManagement.test.ts --runInBand`  
Expected: FAIL，新服务方法不存在。

- [ ] **Step 3: 实现统一查询**

增加 `_getDeviceStateLowLevel`、timeout、mutex、短缓存和公开 `getDeviceState/getDeviceStateWithoutCache`。连接、详情、解锁后读取、固件检测等 OneKey 路径改用新 API；只有明确需要动态状态时传 `refresh: ['status']`。

- [ ] **Step 4: 搜索确认主业务不再调用旧查询**

Run: `rg -n "serviceHardware\.(getFeatures|getDeviceInfo)|hardwareSDK\?\.(getFeatures|getDeviceInfo)" packages/kit-bg packages/kit apps/cli`  
Expected: OneKey 主业务无命中；第三方适配器和数据库迁移器中的旧 `Features` 读取可保留，`getDeviceInfo` 不保留包装。

- [ ] **Step 5: 运行相关测试**

Run: `yarn jest packages/kit-bg/src/services/ServiceHardware/ServiceHardware.pro2DeviceManagement.test.ts packages/kit-bg/src/services/ServiceHardware/ServiceHardware.preInitializeDeviceForSign.test.ts --runInBand`  
Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add packages/kit-bg packages/kit apps/cli
git commit -m "refactor(hardware): query canonical device state"
```

### Task 5: 迁移设置、设备详情和名称刷新

**Files:**
- Modify: `packages/kit-bg/src/services/ServiceHardware/DeviceSettingsManager.ts`
- Modify: `packages/kit/src/states/jotai/contexts/deviceDetails/actions.ts`
- Modify: `packages/kit/src/states/jotai/contexts/deviceDetails/pro2DeviceManagement.ts`
- Modify: `packages/kit/src/views/DeviceManagement/pages/DeviceDetailsModal/dialog/DialogDeviceAbout.tsx`
- Test: `packages/kit-bg/src/services/ServiceHardware/DeviceSettingsManager.pro2.test.ts`
- Test: `packages/kit/src/states/jotai/contexts/deviceDetails/pro2DeviceManagement.test.ts`

- [ ] **Step 1: 写失败改名刷新测试**

```ts
test('uses the DEVICE.STATE label immediately after rename', () => {
  const view = selectDeviceDetails({
    state: createDeviceState({ identity: { label: 'Pro2 6136 xxx', displayName: 'Pro2 6136 xxx' } }),
  });
  expect(view.deviceName).toBe('Pro2 6136 xxx');
});
```

- [ ] **Step 2: 运行并确认失败**

Run: `yarn jest packages/kit/src/states/jotai/contexts/deviceDetails/pro2DeviceManagement.test.ts --runInBand`  
Expected: FAIL，selector 仍读取 `features`。

- [ ] **Step 3: 迁移设置和详情 selector**

所有 Pro/Pro2 共用：

```ts
const { identity, status, settings, versions } = deviceState;
```

设置命令成功后不再手工 patch DB；等待 SDK `DEVICE.STATE`。当前对话框订阅 `HardwareDeviceStateUpdate` 或相应 atom 更新，展示 `identity.displayName`。

- [ ] **Step 4: 运行设置与详情测试**

Run: `yarn jest packages/kit-bg/src/services/ServiceHardware/DeviceSettingsManager.pro2.test.ts packages/kit/src/states/jotai/contexts/deviceDetails/pro2DeviceManagement.test.ts --runInBand`  
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/kit-bg/src/services/ServiceHardware/DeviceSettingsManager.ts packages/kit/src/states/jotai/contexts/deviceDetails packages/kit/src/views/DeviceManagement
git commit -m "refactor(device): render settings from device state"
```

### Task 6: 迁移固件更新和 boot 模式流程

**Files:**
- Modify: `packages/kit-bg/src/services/ServiceFirmwareUpdate/ServiceFirmwareUpdate.ts`
- Modify: related firmware types in `packages/shared/types/device.ts`
- Test: existing ServiceFirmwareUpdate tests and a new focused state-policy test

- [ ] **Step 1: 写失败 boot 模式测试**

```ts
test('does not request status refresh while firmware device is in bootloader mode', async () => {
  await service.prepareUpdate({ deviceState: bootloaderState });
  expect(serviceHardware.getDeviceState).not.toHaveBeenCalledWith(
    expect.objectContaining({ params: expect.objectContaining({ refresh: ['status'] }) })
  );
});
```

- [ ] **Step 2: 运行并确认失败**

Run: `yarn jest packages/kit-bg/src/services/ServiceFirmwareUpdate --runInBand`  
Expected: FAIL，流程仍依赖旧 features 查询或测试 API 不匹配。

- [ ] **Step 3: 使用统一 section**

模式读取 `state.status.mode`，设备类型读取 `state.identity.deviceType`，固件版本读取 `state.versions`。删除固件流程中的默认状态刷新与用于等待重启的 `getFeatures` 依赖；等待设备重连使用连接事件和明确 timeout。

- [ ] **Step 4: 运行固件测试**

Run: `yarn jest packages/kit-bg/src/services/ServiceFirmwareUpdate --runInBand`  
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/kit-bg/src/services/ServiceFirmwareUpdate packages/shared/types/device.ts
git commit -m "refactor(firmware): consume unified device state"
```

### Task 7: 删除 App 的 OneKey 旧状态运行时路径

**Files:**
- Modify: all focused matches under `packages/kit-bg`, `packages/kit`, `packages/shared`, `apps/cli`
- Preserve: third-party adapter raw feature models under `ServiceHardware/adapters`

- [ ] **Step 1: 搜索旧模型消费点**

Run: `rg -n "IOneKeyDeviceFeatures|DeviceProfile|featuresInfo|HardwareFeaturesUpdate" packages/kit-bg packages/kit packages/shared apps/cli`  
Expected: 列出剩余迁移点。

- [ ] **Step 2: 逐点替换为 DeviceState section**

OneKey 业务类型改为 `IOneKeyDeviceState`；`featuresInfo` 改为 `deviceStateInfo`；事件改为 `HardwareDeviceStateUpdate`。第三方硬件 `features` 保持在 adapter/vendor profile 边界，禁止扩散回 OneKey 业务。

- [ ] **Step 3: 删除旧 DB 双写和精确 patch**

Run: `rg -n "updateDevice\(\{\s*features|preciseUpdateFields|HardwareFeaturesUpdate" packages/kit-bg/src/services/ServiceHardware packages/kit-bg/src/dbs/local`  
Expected: OneKey 主路径无命中。

- [ ] **Step 4: 运行受影响测试集**

Run: `yarn jest packages/shared/src/utils/deviceUtils.test.ts packages/kit-bg/src/services/ServiceHardware packages/kit/src/states/jotai/contexts/deviceDetails --runInBand`  
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add packages/kit-bg packages/kit packages/shared apps/cli
git commit -m "refactor(hardware): remove legacy OneKey feature state"
```

### Task 8: App 全量验证与 SDK 版本边界

**Files:**
- Modify: `package.json`、lockfile only when the SDK release/version is available
- Modify: only files required by verification failures

- [ ] **Step 1: 运行相关 Jest 测试**

Run: `yarn jest packages/shared/src/utils/deviceUtils.test.ts packages/kit-bg/src/dbs/local/LocalDbBase.deviceState.test.ts packages/kit-bg/src/services/ServiceHardware packages/kit/src/states/jotai/contexts/deviceDetails --runInBand`  
Expected: PASS。

- [ ] **Step 2: 运行完整 TypeScript**

Run: `yarn tsc:only`  
Expected: exit 0。

- [ ] **Step 3: 运行 oxlint 和格式检查**

Run: `yarn oxlint`  
Expected: exit 0。  
Run: `yarn format:check`  
Expected: exit 0。

- [ ] **Step 4: 检查架构验收条件**

Run: `rg -n "IOneKeyDeviceFeatures|DeviceProfile|HardwareFeaturesUpdate|featuresInfo" packages/kit-bg packages/kit packages/shared apps/cli`  
Expected: 仅第三方适配器、数据库迁移器或明确兼容边界命中。

- [ ] **Step 5: 升级 SDK 依赖**

SDK 版本发布后更新 `@onekeyfe/hd-core` 及相关 SDK 包版本和 lockfile。本地绝对路径或 symlink 不得提交。

- [ ] **Step 6: 提交验证修复**

```bash
git add package.json yarn.lock packages apps
git commit -m "test(hardware): verify unified device state migration"
```
