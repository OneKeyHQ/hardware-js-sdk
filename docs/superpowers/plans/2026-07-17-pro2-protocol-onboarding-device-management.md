# Pro2 Protocol、Onboarding 与设备管理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 同步 firmware-pro2 最新协议，将 SDK 的 DeviceInfo 与 DeviceStatus 完全拆分，并让 app-monorepo 的 Pro2 onboarding 和设备管理全面使用 Protocol V2 接口。

**Architecture:** SDK 保留原始 `deviceInfoGet/deviceStatusGet/deviceSettingsGet` 接口，在 Device 与 DeviceProfile 层组合静态信息和动态状态。app-monorepo 在后台 ServiceHardware 建立 Pro2 管理快照与生命周期缓存，UI 只消费归一化模型；设备设置继续由 DeviceSettingsManager 负责写入并在操作后回读真实状态。

**Tech Stack:** TypeScript、protobufjs、Jest、React/React Native、Jotai、Yarn Workspaces、Git submodule

---

### Task 1: 更新 firmware-pro2 与 Protocol V2 schema

**Files:**
- Modify: `submodules/firmware-pro2`
- Modify: `packages/hd-transport/scripts/protobuf-build.sh`
- Modify: `packages/hd-transport/messages-protocol-v2.json`
- Modify: `packages/core/src/data/messages/messages-protocol-v2.json`
- Modify: `packages/hd-transport/src/types/messages.ts`
- Test: `packages/hd-transport/__tests__/messages.test.js`

- [ ] **Step 1: 更新 schema 测试，要求新 onboarding 类型存在且旧 stage 不存在**

```js
expect(v2Messages.nested.DevOnboardingStep).toBeDefined();
expect(v2Messages.nested.DevOnboardingPhase).toBeDefined();
expect(v2Messages.nested.DevOnboardingSetupStatus).toBeDefined();
expect(v2Messages.nested.DevOnboardingStatus.fields).toMatchObject({
  step: expect.any(Object),
  phase: expect.any(Object),
  setup: expect.any(Object),
  pin_set: expect.any(Object),
  wallet_initialized: expect.any(Object),
});
expect(v2Messages.nested.DevOnboardingStage).toBeUndefined();
```

- [ ] **Step 2: 运行 schema 测试并确认失败**

Run: `yarn workspace @onekeyfe/hd-transport test messages.test.js --runInBand`

Expected: FAIL，当前 schema 仍包含 `DevOnboardingStage`。

- [ ] **Step 3: 将子模块指针更新到 origin/dev 最新提交**

```bash
git -C submodules/firmware-pro2 checkout --detach origin/dev
```

- [ ] **Step 4: 恢复 protobuf-build.sh 的 Protocol V2 生成段**

生成段必须合并：

```bash
SRC_PRO2_LEGACY="$REPO_ROOT/submodules/firmware-pro2/sys/protobuf/onekey_protocol/legacy"
SRC_PRO2_LATEST="$REPO_ROOT/submodules/firmware-pro2/sys/protobuf/onekey_protocol/latest"
```

并输出 `packages/hd-transport/messages-protocol-v2.json`、复制到 core、最后执行
`node ./protobuf-types.js typescript`。

- [ ] **Step 5: 重新生成 protobuf JSON 与 TypeScript 类型**

Run: `yarn update-protobuf`

Expected: transport/core Protocol V2 JSON 一致，类型包含新 onboarding enums。

- [ ] **Step 6: 运行 transport 测试**

Run: `yarn workspace @onekeyfe/hd-transport test --runInBand`

Expected: PASS。

### Task 2: 将 SDK 的 DeviceInfo 与 DeviceStatus 拆分

**Files:**
- Modify: `packages/core/src/types/device.ts`
- Modify: `packages/core/src/protocols/protocol-v2/features.ts`
- Modify: `packages/core/src/deviceProfile/buildDeviceFeatures.ts`
- Modify: `packages/core/src/deviceProfile/buildDeviceProfile.ts`
- Modify: `packages/core/src/device/Device.ts`
- Modify: `packages/core/src/api/GetDeviceInfo.ts`
- Modify: `packages/core/src/api/protocol-v2/DeviceInfoGet.ts`
- Modify: `packages/core/src/api/protocol-v2/DeviceStatusGet.ts`
- Test: `packages/core/__tests__/protocol-v2.test.ts`
- Test: `packages/core/__tests__/protocol-v2-bootloader-mode.test.ts`

- [ ] **Step 1: 写入无嵌套 status 的 Features 构建失败测试**

```ts
const features = buildProtocolV2FeaturesPayload({
  deviceInfo: buildDeviceInfoWithoutStatus(),
  deviceStatus: {
    device_id: 'PRO2_DEVICE',
    unlocked: true,
    init_states: true,
    passphrase_enabled: true,
  },
});
expect(features.deviceId).toBe('PRO2_DEVICE');
expect(features.unlocked).toBe(true);
expect(features.raw?.protocolV2DeviceInfo?.status).toBeUndefined();
expect(features.raw?.protocolV2DeviceStatus?.device_id).toBe('PRO2_DEVICE');
```

- [ ] **Step 2: 运行 core 定向测试并确认失败**

Run: `yarn workspace @onekeyfe/hd-core test protocol-v2.test.ts --runInBand`

- [ ] **Step 3: 修改 Features builder 签名与 raw 类型**

```ts
buildProtocolV2FeaturesPayload({
  deviceInfo,
  deviceStatus,
  previous,
}: {
  deviceInfo?: ProtocolV2DeviceInfo;
  deviceStatus?: DeviceStatus;
  previous?: Features;
}): Features
```

`Features.raw` 增加 `protocolV2DeviceStatus?: DeviceStatus`。

- [ ] **Step 4: 修改 Device 初始化与刷新**

正常初始化依次请求 `DeviceInfoGet` 和 `DeviceStatusGet`；普通 run 前刷新只请求
`DeviceStatusGet`。`updateProtocolV2Status()` 合并独立 status raw，不再构造
`{ ...deviceInfo, status }`。

- [ ] **Step 5: 修改 DeviceProfile builder**

```ts
buildProfileFromProtocolV2({
  deviceInfo,
  deviceStatus,
  sources,
  scope,
  includeRaw,
});
```

`deviceId/status` 来自 `deviceStatus`，版本和身份来自 `deviceInfo`。

- [ ] **Step 6: 更新模式判断**

正常模式以成功取得 DeviceStatus 为依据；状态不可用时才使用固件字段结构判断
Romloader/Bootloader。

- [ ] **Step 7: 运行 core 测试**

Run: `yarn workspace @onekeyfe/hd-core test protocol-v2.test.ts protocol-v2-bootloader-mode.test.ts --runInBand`

Expected: PASS。

### Task 3: 对齐新 Pro2 onboarding SDK 和 App 映射

**Files:**
- Modify: `../app-monorepo/packages/kit-bg/src/services/ServiceHardware/ServiceHardware.pro2Onboarding.test.ts`
- Modify: `../app-monorepo/packages/kit/src/views/Onboardingv2/pages/pro2OnboardingStatus.ts`
- Modify: `../app-monorepo/packages/kit/src/views/Onboardingv2/pages/pro2OnboardingStatus.test.ts`
- Modify: `../app-monorepo/packages/kit/src/views/Onboardingv2/pages/deviceSetupPro2.tsx`
- Modify: `../app-monorepo/packages/kit/src/views/Onboardingv2/pages/DeviceSetup.tsx`

- [ ] **Step 1: 用新 step/phase/setup 编写映射测试**

```ts
expect(mapPro2OnboardingStatus({
  step: DevOnboardingStep.DEV_ONBOARDING_STEP_SETUP,
  phase: DevOnboardingPhase.DEV_ONBOARDING_PHASE_SEEDCARD_RESTORE,
  setup: {
    kind: DevOnboardingSetupKind.DEV_ONBOARDING_SETUP_KIND_RESTORE,
    method: DevOnboardingSetupMethod.DEV_ONBOARDING_SETUP_METHOD_SEEDCARD,
  },
  pin_set: true,
  wallet_initialized: false,
})).toMatchObject({
  step: EPro2OnboardingStep.Setup,
  setup: { kind: 'restore', method: 'seedCard' },
});
```

- [ ] **Step 2: 增加严格完成条件测试**

`DONE + pin_set=true + wallet_initialized=true` 才返回 ready；任何字段为 false/缺失均不 ready。

- [ ] **Step 3: 运行 App onboarding 测试并确认失败**

Run: `yarn jest packages/kit/src/views/Onboardingv2/pages/pro2OnboardingStatus.test.ts --runInBand`

- [ ] **Step 4: 替换旧 DevOnboardingStage mapper**

实现数字/字符串双形态枚举标准化，删除 `status_code/detail_code`。

- [ ] **Step 5: 更新 stepper 内容与 DeviceSetup 完成判断**

使用新 `phase/setup` 渲染内容，保留页面激活期间 1200ms 查询和 in-flight 去重。

- [ ] **Step 6: 运行 onboarding 测试**

Expected: PASS。

### Task 4: 建立 Pro2 设备管理读取快照

**Files:**
- Modify: `../app-monorepo/packages/kit-bg/src/services/ServiceHardware/ServiceHardware.ts`
- Create: `../app-monorepo/packages/kit-bg/src/services/ServiceHardware/ServiceHardware.pro2DeviceManagement.test.ts`
- Modify: `../app-monorepo/packages/kit-bg/src/services/ServiceHardware/DeviceSettingsManager.ts`
- Modify: `../app-monorepo/packages/kit-bg/src/services/ServiceHardware/DeviceSettingsManager.pro2.test.ts`

- [ ] **Step 1: 编写生命周期快照测试**

测试要求：总是读取 `deviceStatusGet`；静态缓存缺失时读取 `deviceInfoGet`；仅
`status.unlocked === true` 时读取 `deviceSettingsGet`。

- [ ] **Step 2: 运行测试并确认失败**

Run: `yarn jest packages/kit-bg/src/services/ServiceHardware/ServiceHardware.pro2DeviceManagement.test.ts --runInBand`

- [ ] **Step 3: 增加 Pro2 snapshot 类型和读取接口**

```ts
type IPro2DeviceManagementSnapshot = {
  info?: ProtocolV2DeviceInfo;
  status: DeviceStatus;
  settings?: DeviceSettings;
};
```

同 connectId 合并并发 Promise，静态 info 缓存按连接保存。

- [ ] **Step 4: 增加缓存失效入口**

固件更新完成、设备重启、擦除和 connectId/deviceId 变化时删除静态 info 缓存。

- [ ] **Step 5: 补齐 DeviceSettingsManager 读取类型与写入字段**

使用生成的 `DeviceSettings` 类型替换局部手写子集。设置成功后调用 snapshot 刷新 status/settings，
不长期使用乐观更新值。

- [ ] **Step 6: 运行后台服务测试**

Run: `yarn jest packages/kit-bg/src/services/ServiceHardware/ServiceHardware.pro2DeviceManagement.test.ts packages/kit-bg/src/services/ServiceHardware/DeviceSettingsManager.pro2.test.ts --runInBand`

Expected: PASS。

### Task 5: 将设备详情 UI 接入 Pro2 snapshot

**Files:**
- Modify: `../app-monorepo/packages/kit/src/states/jotai/contexts/deviceDetails/*`
- Modify: `../app-monorepo/packages/kit/src/views/DeviceManagement/pages/DeviceDetailsModal/index.tsx`
- Modify: `../app-monorepo/packages/kit/src/views/DeviceManagement/pages/DeviceDetailsModal/DeviceBasicInfo.tsx`
- Modify: `../app-monorepo/packages/kit/src/views/DeviceManagement/pages/DeviceDetailsModal/DeviceSectionGeneral.tsx`
- Modify: `../app-monorepo/packages/kit/src/views/DeviceManagement/pages/DeviceDetailsModal/DeviceSectionAdvance.tsx`
- Modify: `../app-monorepo/packages/kit/src/views/DeviceManagement/pages/DeviceDetailsModal/dialog/DialogDeviceAbout.tsx`
- Test: `../app-monorepo/packages/kit/src/views/DeviceManagement/pages/DeviceDetailsModal/utils.test.ts`

- [ ] **Step 1: 增加 Pro2 管理模型归一化测试**

验证 About 版本来自 DeviceInfo、锁定/Passphrase 来自 DeviceStatus、语言/自动锁定等来自
DeviceSettings。

- [ ] **Step 2: 页面进入和重新聚焦时刷新 snapshot**

复用现有 `refresh(walletId)` 生命周期，不增加定时轮询；设置动作和固件完成事件触发再次刷新。

- [ ] **Step 3: 替换 Pro2 featuresInfo 读取**

Pro2 分支不再从缓存 Features 猜测 About、安全和设置字段。非 Pro2 分支保持不变。

- [ ] **Step 4: 处理锁定状态**

设备锁定时不自动请求 DeviceSettingsGet，不弹 PIN；设置项显示锁定/不可用状态，用户主动操作时
由 SDK 解锁重试。

- [ ] **Step 5: 运行设备管理测试和类型检查**

Run: `yarn jest packages/kit/src/views/DeviceManagement/pages/DeviceDetailsModal/utils.test.ts --runInBand`

Run: `yarn typecheck`

Expected: PASS。

### Task 6: 跨仓构建和真实设备验证

**Files:**
- Verify only

- [ ] **Step 1: SDK 全量相关测试**

Run: `yarn workspace @onekeyfe/hd-transport test --runInBand`

Run: `yarn workspace @onekeyfe/hd-core test --runInBand`

- [ ] **Step 2: SDK 构建**

Run: `yarn workspace @onekeyfe/hd-transport build`

Run: `yarn workspace @onekeyfe/hd-core build`

- [ ] **Step 3: App 定向测试与 Desktop 启动验证**

运行 onboarding、ServiceHardware、DeviceSettingsManager 和 DeviceDetails 定向测试，再启动 desktop
开发环境确认页面可以完成 Pro2 onboarding 和设备详情刷新。

- [ ] **Step 4: Node USB 真实设备检查**

使用本地 CLI/SDK 验证：

1. `DeviceInfoGet` 响应不依赖嵌套 status。
2. `DeviceStatusGet` 可独立更新锁定状态。
3. 新 onboarding status 能正确解码。
4. 解锁后 `DeviceSettingsGet` 返回设备设置。

- [ ] **Step 5: 检查最终 diff**

确认没有覆盖任务开始前的用户本地修改，只包含子模块、协议、SDK、App onboarding 和设备管理范围。
