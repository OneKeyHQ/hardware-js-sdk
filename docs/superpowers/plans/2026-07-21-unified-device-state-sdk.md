# Unified Device State SDK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 Pro/V1 与 Pro2/V2 共用同一个设备设置入口和同一份 Features 缓存，并保证设置成功后 SDK 缓存、兼容事件与查询投影一致。

**Architecture:** 保留现有公开 `Features` 类型作为第一阶段唯一事实源，新增“字段级合并 + 设置参数归一化”内部模块。Protocol V1/V2 只负责把协议响应转换为 Features patch；`DeviceSettings` 成为协议无关高层 API，`DeviceSettingsSet/Get` 保留为 V2 原始接口但也同步同一缓存。`DeviceProfile` 和 `KnownDevice` 只从更新后的 Features 取公共字段，不再独立决定 label。

**Tech Stack:** TypeScript、EventEmitter、Jest、Yarn Workspaces、hd-core Protocol V1/V2 adapters

---

### Task 1: 建立 Features 字段级合并入口

**Files:**
- Create: `packages/core/src/device/DeviceFeaturesState.ts`
- Create: `packages/core/__tests__/device-features-state.test.ts`
- Modify: `packages/core/src/device/Device.ts`

- [ ] **Step 1: 编写字段级合并失败测试**

测试必须覆盖：`undefined` 不覆盖旧值、`null` 明确清空、相同 patch 不产生新对象、变更 patch 返回新对象。

- [ ] **Step 2: 运行测试并确认因模块不存在而失败**

Run: `yarn workspace @onekeyfe/hd-core test --runInBand device-features-state.test.ts`

Expected: FAIL，提示 `DeviceFeaturesState` 无法解析。

- [ ] **Step 3: 实现 `mergeDeviceFeaturesPatch`**

实现一个纯函数，仅合并定义过的字段；不得深度合并 `raw`，`raw` 由调用方显式构造。

- [ ] **Step 4: 在 Device 增加统一 patch 方法**

新增：

```ts
updateFeaturesPatch(
  patch: Partial<Features>,
  source: DeviceFeaturesUpdateSource
): Features | undefined
```

行为：更新 `this.features`、保持 session 字段、仅在实际变化时发送 `DEVICE.FEATURES`、返回最新 Features。禁止设置 `featuresNeedsReload=true` 或发起额外设备请求。

- [ ] **Step 5: 运行单测和 Device 相关回归**

Run: `yarn workspace @onekeyfe/hd-core test --runInBand device-features-state.test.ts protocol-v2.test.ts`

Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add packages/core/src/device/DeviceFeaturesState.ts packages/core/src/device/Device.ts packages/core/__tests__/device-features-state.test.ts
git commit -m "refactor(core): centralize device features patches"
```

### Task 2: 统一 V1/V2 设置字段归一化

**Files:**
- Create: `packages/core/src/device/DeviceSettingsState.ts`
- Create: `packages/core/__tests__/device-settings-state.test.ts`
- Modify: `packages/core/src/types/device.ts`
- Modify: `packages/core/src/types/api/deviceSettings.ts`

- [ ] **Step 1: 编写设置映射失败测试**

覆盖以下公共字段：label、language、autoLockDelayMs、autoShutdownDelayMs、hapticFeedback、experimentalFeatures、brightness、bluetoothEnabled、animationEnabled、tapToWake、deviceNameDisplayEnabled、fidoEnabled、usbLockEnabled、randomKeypad。

- [ ] **Step 2: 运行测试并确认失败**

Run: `yarn workspace @onekeyfe/hd-core test --runInBand device-settings-state.test.ts`

Expected: FAIL，映射函数尚不存在。

- [ ] **Step 3: 扩展归一化 Features 设置字段**

在 `NormalizedFeatures` 中增加当前尚未表达的公共设置字段，统一使用 camelCase；字段类型允许 `null` 表示已知无值。

- [ ] **Step 4: 扩展高层 `DeviceSettingsParams`**

新增 Pro2 可表达、同时不破坏 V1 调用的可选 camelCase 参数。原参数保持兼容。

- [ ] **Step 5: 实现双向协议映射**

提供：

```ts
normalizeApplySettingsToFeaturesPatch(params: ApplySettings): Partial<Features>
normalizeDeviceSettingsToFeaturesPatch(settings: DeviceSettings): Partial<Features>
mapCommonSettingsToProtocolV2(params: DeviceSettingsParams): DeviceSettings
```

未提供的字段不得进入 patch 或协议 payload。

- [ ] **Step 6: 运行映射测试**

Run: `yarn workspace @onekeyfe/hd-core test --runInBand device-settings-state.test.ts`

Expected: PASS。

- [ ] **Step 7: 提交**

```bash
git add packages/core/src/device/DeviceSettingsState.ts packages/core/src/types/device.ts packages/core/src/types/api/deviceSettings.ts packages/core/__tests__/device-settings-state.test.ts
git commit -m "feat(core): normalize device settings across protocols"
```

### Task 3: 让 `deviceSettings` 成为协议无关入口

**Files:**
- Modify: `packages/core/src/api/device/DeviceSettings.ts`
- Modify: `packages/core/src/api/protocol-v2/DeviceSettingsSet.ts`
- Modify: `packages/core/src/api/protocol-v2/DeviceSettingsGet.ts`
- Modify: `packages/core/__tests__/protocol-v2.test.ts`
- Create: `packages/core/__tests__/device-settings.test.ts`

- [ ] **Step 1: 编写高层路由失败测试**

断言同一个 `DeviceSettings` 方法：V1 发送 `ApplySettings`；V2 发送 `DeviceSettingsSet`；两者成功后 `device.features.label` 都立即更新并发送一次 Features 事件。

- [ ] **Step 2: 运行测试并确认 V2 路由失败**

Run: `yarn workspace @onekeyfe/hd-core test --runInBand device-settings.test.ts`

Expected: FAIL，V2 当前仍发送 `ApplySettings` 或不更新 Features。

- [ ] **Step 3: 实现协议分发**

`DeviceSettings.run()` 根据 `device.isProtocolV2()` 选择协议命令；V2 payload 使用 Task 2 的映射函数。成功后通过 `updateFeaturesPatch()` 提交 confirmed patch，返回原有 `Success`，不改变现有调用方返回结构。

- [ ] **Step 4: 原始 V2 Set/Get 同步缓存**

`DeviceSettingsSet` 成功后提交传入设置；`DeviceSettingsGet` 成功后提交设备真实设置。两者不得调用 `DeviceInfoGet` 或 `DeviceStatusGet`。

- [ ] **Step 5: 添加无额外读取断言**

断言改名和其他直接设置只出现一次写命令，不出现 `DeviceStatusGet`、`DeviceInfoGet` 或二次 `DeviceSettingsGet`。

- [ ] **Step 6: 运行回归测试**

Run: `yarn workspace @onekeyfe/hd-core test --runInBand device-settings.test.ts protocol-v2.test.ts`

Expected: PASS。

- [ ] **Step 7: 提交**

```bash
git add packages/core/src/api/device/DeviceSettings.ts packages/core/src/api/protocol-v2/DeviceSettingsSet.ts packages/core/src/api/protocol-v2/DeviceSettingsGet.ts packages/core/__tests__/device-settings.test.ts packages/core/__tests__/protocol-v2.test.ts
git commit -m "feat(core): route device settings by protocol"
```

### Task 4: 消除 Profile 与设备展示字段的 label 分叉

**Files:**
- Modify: `packages/core/src/api/GetDeviceInfo.ts`
- Modify: `packages/core/src/deviceProfile/buildDeviceProfile.ts`
- Modify: `packages/core/src/types/device.ts`
- Modify: `packages/core/src/device/Device.ts`
- Modify: `packages/core/__tests__/protocol-v2.test.ts`

- [ ] **Step 1: 编写缓存 label 投影失败测试**

先设置 Pro2 label，再调用 `getDeviceInfo`，断言 `DeviceProfile.label` 与 `device.features.label` 一致；同时断言 `KnownDevice.name` 仍保持 `bleName || label`，新增 `displayName` 使用 `label || bleName`。

- [ ] **Step 2: 运行测试并确认 Profile.label 仍为 null**

Run: `yarn workspace @onekeyfe/hd-core test --runInBand protocol-v2.test.ts -t "cached label"`

Expected: FAIL。

- [ ] **Step 3: 让 V2 Profile 使用更新后的 Features 公共字段**

`GetDeviceInfo` 先更新 Device Features，再构建 Profile；V2 builder 接收 Features，并从中读取 label、bleName 和已知状态。原始 verify/version 数据仍来自 DeviceInfo。

- [ ] **Step 4: 增加 `displayName` 而不修改 `name` 语义**

`KnownDevice.name` 保持 BLE 发现名称优先；`displayName` 专门用于用户可见名称，label 优先。

- [ ] **Step 5: 运行测试**

Run: `yarn workspace @onekeyfe/hd-core test --runInBand protocol-v2.test.ts`

Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add packages/core/src/api/GetDeviceInfo.ts packages/core/src/deviceProfile/buildDeviceProfile.ts packages/core/src/types/device.ts packages/core/src/device/Device.ts packages/core/__tests__/protocol-v2.test.ts
git commit -m "refactor(core): project device profile from cached features"
```

### Task 5: 验证公共兼容性与文档

**Files:**
- Modify: `docs/sdk/core-runtime.md`
- Modify: `docs/sdk/events.md`
- Modify: `packages/connect-examples/developer-portal/content/en/hardware-sdk/basic-api/get-device-info.mdx`
- Modify: `packages/connect-examples/developer-portal/content/zh/hardware-sdk/basic-api/get-device-info.mdx`

- [ ] **Step 1: 更新文档中的唯一状态源说明**

明确：`Features` 是当前兼容期唯一缓存，Profile/KnownDevice 为投影；直接设置成功后同步缓存；默认不读取 DeviceStatus。

- [ ] **Step 2: 运行 Core 测试、lint 和 build**

Run:

```bash
yarn workspace @onekeyfe/hd-core test --runInBand
yarn workspace @onekeyfe/hd-core lint
yarn workspace @onekeyfe/hd-core build
```

Expected: 全部 PASS。

- [ ] **Step 3: 检查不存在默认状态读取回归**

Run: `rg -n "targets:\s*\{[^}]*status|status:\s*true" packages/core/src`

Expected: 默认 DeviceInfo 请求中没有 `status: true`。

- [ ] **Step 4: 提交**

```bash
git add docs/sdk/core-runtime.md docs/sdk/events.md packages/connect-examples/developer-portal/content/en/hardware-sdk/basic-api/get-device-info.mdx packages/connect-examples/developer-portal/content/zh/hardware-sdk/basic-api/get-device-info.mdx
git commit -m "docs: document unified device features state"
```
