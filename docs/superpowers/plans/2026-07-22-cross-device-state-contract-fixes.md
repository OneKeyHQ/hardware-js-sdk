# Cross-device DeviceState Contract Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 Classic1S、Touch、Pro、Pro2 在统一 DeviceState 中的字段语义、刷新来源和 App 消费差异，让协议差异完全留在 SDK 内部。

**Architecture:** SDK 继续以 `DeviceStateStore` 为唯一状态源。Protocol V1 的 `firmware` scope 在 SDK 内聚合 `GetFeatures + OnekeyGetFeatures`；Protocol V2 的 loader mode 由显式上下文与稳定拓扑判断维护，版本读取不再覆盖 runtime 状态。App 的 OneKey 设备详情统一优先消费 `deviceStateInfo`，旧 `featuresInfo` 只作为历史数据库 fallback。

**Tech Stack:** TypeScript、Jest、EventEmitter、Jotai、Yarn workspaces。

---

### Task 1: 修复 Pro2 mode、verification 与 raw 合并

**Files:**

- Modify: `packages/core/__tests__/device-state-mapper.test.ts`
- Modify: `packages/core/__tests__/device-state-store.test.ts`
- Modify: `packages/core/__tests__/get-device-state.test.ts`
- Modify: `packages/core/src/protocols/protocol-v2/features.ts`
- Modify: `packages/core/src/device/DeviceStateMapper.ts`
- Modify: `packages/core/src/device/DeviceStateStore.ts`
- Modify: `packages/core/src/device/Device.ts`

- [x] **Step 1: 写失败测试**

  覆盖正常固件同时返回 application 与 SE 时不得判为 bootloader、版本刷新不得覆盖已确认的 `notInitialized`、SE application/bootloader 校验字段全部进入 `verification`、DeviceInfo 与 DeviceStatus raw 能共存。

- [x] **Step 2: 验证 RED**

  Run: `yarn workspace @onekeyfe/hd-core test --runInBand packages/core/__tests__/device-state-mapper.test.ts packages/core/__tests__/device-state-store.test.ts packages/core/__tests__/get-device-state.test.ts`

  Expected: 上述新断言因当前 SE mode heuristic、缺失 SE verification 和 raw 整体替换而失败。

- [x] **Step 3: 最小实现**

  将 bootloader fallback 收敛为“缺少 application/application_data”的 loader 形态；`mapProtocolV2DeviceInfoToState` 只在明确 loader 时覆盖已有 mode，初次普通 DeviceInfo 由 `Device.getDeviceState` 初始化为 normal；补齐全部 SE verification；`raw` 按来源键合并。

- [x] **Step 4: 验证 GREEN**

  重跑 Step 2 命令，Expected: PASS。

### Task 2: 修复 V1 字段归一化与 firmware scope

**Files:**

- Modify: `packages/core/__tests__/device-state-mapper.test.ts`
- Modify: `packages/core/__tests__/get-device-state.test.ts`
- Modify: `packages/core/__tests__/refresh-device-state.test.ts`
- Modify: `packages/core/__tests__/deviceFeaturesUtils.test.ts`
- Modify: `packages/core/src/deviceProfile/buildDeviceFeatures.ts`
- Modify: `packages/core/src/device/DeviceStateMapper.ts`
- Modify: `packages/core/src/device/Device.ts`
- Modify: `packages/core/src/api/RefreshDeviceState.ts`
- Modify: `packages/core/src/utils/deviceFeaturesUtils.ts`

- [x] **Step 1: 写失败测试**

  使用 table-driven fixture 覆盖 Classic1S、Touch、Pro：`identity.label` 只保存真实 label；`displayName` 才回退 BLE/产品名；旧 Bitcoin-only capability 正确映射；`attach_to_pin_user/unlocked_attach_pin` 正确归一化；`firmware` scope 同时读取并合并 `OnekeyGetFeatures`；V1 bootloader refresh 不受 V2 runtime guard 影响；Pro2 不支持软件 PIN。

- [x] **Step 2: 验证 RED**

  Run: `yarn workspace @onekeyfe/hd-core test --runInBand packages/core/__tests__/device-state-mapper.test.ts packages/core/__tests__/get-device-state.test.ts packages/core/__tests__/refresh-device-state.test.ts packages/core/__tests__/deviceFeaturesUtils.test.ts`

  Expected: 当前 label fallback、firmware type、Attach PIN、单一 GetFeatures 与 Pro2 PIN 判断导致失败。

- [x] **Step 3: 最小实现**

  V1 builder 保留原始 label，并用 capability fallback 判定 firmware type；映射 V1 Attach PIN 字段；为 `Device.getDeviceState` 增加 V1 verification 聚合路径，将 `OnekeyFeatures` 映射到 versions/verification/raw；normal-mode guard 仅约束 Protocol V2；软件 PIN 排除 Pro2。

- [x] **Step 4: 验证 GREEN**

  重跑 Step 2 命令，Expected: PASS。

### Task 3: App 四类 OneKey 设备统一消费 DeviceState

**Files:**

- Modify: `packages/kit/src/states/jotai/contexts/deviceDetails/actions.ts`
- Replace: `packages/kit/src/states/jotai/contexts/deviceDetails/pro2DeviceManagement.ts` → `deviceStateManagement.ts`
- Replace: `packages/kit/src/states/jotai/contexts/deviceDetails/pro2DeviceManagement.test.ts` → `deviceStateManagement.test.ts`
- Modify: `packages/kit/src/views/DeviceManagement/pages/DeviceDetailsModal/dialog/DialogDeviceAbout.tsx`
- Modify: `packages/kit-bg/src/services/ServiceHardware/ServiceHardware.ts`
- Modify: `packages/kit-bg/src/services/ServiceHardware/ServiceHardware.pro2DeviceManagement.test.ts`

- [x] **Step 1: 写失败测试**

  覆盖 Classic1S、Touch、Pro 和 Pro2 都优先从 DeviceState 构建 static/meta state；旧记录没有 DeviceState 时才回退 features；romloader 投影为兼容 bootloaderMode；About 页面不把协议原始 model 当产品展示名。

- [x] **Step 2: 验证 RED**

  Run: `yarn jest --runInBand packages/kit/src/states/jotai/contexts/deviceDetails/deviceStateManagement.test.ts packages/kit-bg/src/services/ServiceHardware/ServiceHardware.pro2DeviceManagement.test.ts`

  Expected: 当前 Pro2-only selector 和 romloader 投影导致失败。

- [x] **Step 3: 最小实现**

  将 Pro2 selector 提升为 OneKey DeviceState selector；actions 对所有 OneKey 设备优先使用 state；兼容 projector 将 romloader 视为 bootloader-like；About 使用标准产品名而不是 raw model。

- [x] **Step 4: 验证 GREEN**

  重跑 Step 2 命令，Expected: PASS。

### Task 4: 完整回归与文档一致性

**Files:**

- Modify: `docs/sdk/pro2-field-migration.md`
- Modify: `docs/superpowers/specs/2026-07-22-unified-device-state-design.md`

- [x] **Step 1: 更新文档**

  明确 mode 来源、V1 firmware scope 聚合、`label/bleName/displayName` 语义和 raw 合并策略，删除 DeviceInfo 内含 status 的旧描述。

- [x] **Step 2: SDK 验证**

  Run: `yarn workspace @onekeyfe/hd-core test --runInBand`

  Run: `yarn workspace @onekeyfe/hd-core build`

  Run: `git diff --check`

- [x] **Step 3: App 验证**

  Run: `yarn jest --runInBand packages/kit-bg/src/services/ServiceHardware/ServiceHardware.pro2DeviceManagement.test.ts packages/kit-bg/src/services/ServiceHardware/DeviceSettingsManager.pro2.test.ts packages/kit-bg/src/dbs/local/LocalDbBase.deviceState.test.ts packages/kit/src/states/jotai/contexts/deviceDetails/deviceStateManagement.test.ts`

  Run: `git diff --check`

- [x] **Step 4: 检查最终差异**

  确认没有 `targets.status=true`，没有默认 `DeviceStatusGet`，两个 worktree 只包含本次相关变更。
