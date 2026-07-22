# Pro2 Locked Device Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 SDK 和 App 在 Pro2 锁定状态下直接读取公开设备设置，并保证 `DeviceSettingsGet` 不触发自动解锁。

**Architecture:** 固件 protobuf 是 Protocol V2 设置字段的唯一事实源，SDK 重新生成传输层协议产物并将只读方法标记为无需解锁；App 的管理快照始终请求设置，由固件通过可选字段控制私有数据可见性。本次直接采用新固件契约，不增加旧固件兼容分支。

**Tech Stack:** TypeScript、Jest、protobufjs、Yarn、Git submodule

---

### Task 1: 固化 SDK 不解锁行为

**Files:**
- Modify: `packages/core/__tests__/protocol-v2.test.ts`
- Modify: `packages/core/src/api/protocol-v2/DeviceSettingsGet.ts`

- [ ] **Step 1: 修改测试，声明 DeviceSettingsGet 不需要解锁**

将设置方法策略测试拆分为只读与写入两类：

```ts
test('does not unlock before reading Protocol V2 device settings', () => {
  const method = new DeviceSettingsGet({
    id: 1,
    payload: { method: 'deviceSettingsGet' },
  });
  method.init();
  expect(method.unlockPolicy).toBe('none');
});

test('marks Protocol V2 settings mutations for unlock-on-locked retry', () => {
  const methods = [
    new DeviceSettingsSet({
      id: 2,
      payload: { method: 'deviceSettingsSet', settings: { brightness: 80 } },
    }),
    new DeviceSettingsPageShow({
      id: 3,
      payload: { method: 'deviceSettingsPageShow', page: 'DevicePassphrase' },
    }),
  ];
  methods.forEach(method => {
    method.init();
    expect(method.unlockPolicy).toBe('retry-on-locked');
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `yarn workspace @onekeyfe/hd-core test protocol-v2.test.ts --runInBand`

Expected: `DeviceSettingsGet.unlockPolicy` 实际为 `retry-on-locked`，新断言失败。

- [ ] **Step 3: 修改最小实现**

在 `DeviceSettingsGet.init()` 中设置：

```ts
this.unlockPolicy = 'none';
```

- [ ] **Step 4: 运行测试并确认通过**

Run: `yarn workspace @onekeyfe/hd-core test protocol-v2.test.ts --runInBand`

Expected: 相关测试全部通过。

### Task 2: 更新固件子模块与 Protocol V2 生成物

**Files:**
- Modify: `submodules/firmware-pro2`
- Modify: `packages/hd-transport/messages-protocol-v2.json`
- Modify: `packages/core/src/data/messages/messages-protocol-v2.json`
- Modify: `packages/hd-transport/src/types/messages.ts`

- [ ] **Step 1: 在保留本地 session protobuf 修改的前提下更新子模块**

Run: `git -C submodules/firmware-pro2 checkout 39a060ccf95510ff3fb519bd3cd8685a07d05667`

Expected: HEAD 移动到远端 `dev` 最新提交；`messages_device_session.proto/.options` 仍保持修改状态。

- [ ] **Step 2: 重新生成协议产物**

Run: `yarn update-protobuf`

Expected: 命令退出码为 0，并更新两份 Protocol V2 JSON 与 TypeScript 消息类型。

- [ ] **Step 3: 校验新字段契约**

Run: `rg -n 'experimental_features|"passphrase_enable"|"fido_enabled"' packages/hd-transport/messages-protocol-v2.json packages/core/src/data/messages/messages-protocol-v2.json packages/hd-transport/src/types/messages.ts`

Expected: `DeviceSettings` 中不存在 `experimental_features`；`passphrase_enable` 与 `fido_enabled` 仍存在并为可选字段，JSON 字段编号分别为 100 和 101。

- [ ] **Step 4: 运行传输层构建和 SDK 测试**

Run: `yarn workspace @onekeyfe/hd-transport build`

Run: `yarn workspace @onekeyfe/hd-core test protocol-v2.test.ts --runInBand`

Expected: 两条命令均退出码为 0。

### Task 3: App 锁定状态始终读取公开设置

**Files:**
- Modify: `../app-monorepo/packages/kit-bg/src/services/ServiceHardware/ServiceHardware.pro2DeviceManagement.test.ts`
- Modify: `../app-monorepo/packages/kit-bg/src/services/ServiceHardware/ServiceHardware.ts`
- Modify: `../app-monorepo/packages/kit/src/states/jotai/contexts/deviceDetails/actions.ts`
- Modify: `../app-monorepo/packages/kit/src/states/jotai/contexts/deviceDetails/pro2DeviceManagement.ts`

- [ ] **Step 1: 修改锁定状态测试预期**

首个快照测试使用 `unlocked: false`，但期望结果包含：

```ts
settings: {
  label: 'OneKey Pro 2',
  language: 'en-US',
},
```

并断言锁定状态也读取一次设置：

```ts
expect(deviceSettingsGet).toHaveBeenCalledTimes(1);
```

第二次解锁快照完成后累计调用次数应为 2。删除 `shouldRefreshDeviceSettingsAfterUpdate` 的独立测试，因为更新后的设置统一刷新，不再存在锁定状态分支。

- [ ] **Step 2: 运行 App 定向测试并确认失败**

Run: `yarn jest packages/kit-bg/src/services/ServiceHardware/ServiceHardware.pro2DeviceManagement.test.ts --runInBand`

Expected: 锁定状态未调用 `deviceSettingsGet`，新断言失败。

- [ ] **Step 3: 删除状态门控并更新注释**

将快照读取改为无条件调用：

```ts
const settings = await convertDeviceResponse(() =>
  hardwareSDK.deviceSettingsGet(compatibleConnectId, {
    connectProtocol: 'V2',
  }),
);
```

快照始终返回 `settings`；同时将 `pro2DeviceManagement.ts` 中“读取设置仍需解锁”的注释改为“公开设置可在锁定状态读取”。删除 `shouldRefreshDeviceSettingsAfterUpdate`，并将 `refreshAfterDeviceSettingUpdate` 改为直接调用 `refresh`。

- [ ] **Step 4: 运行 App 相关测试**

Run: `yarn jest packages/kit-bg/src/services/ServiceHardware/ServiceHardware.pro2DeviceManagement.test.ts packages/kit/src/states/jotai/contexts/deviceDetails/pro2DeviceManagement.test.ts --runInBand`

Expected: 两个测试文件全部通过。

### Task 4: 最终验证与差异审计

**Files:**
- Verify only: SDK 与 App 本次修改文件

- [ ] **Step 1: 运行格式与差异检查**

Run: `git diff --check`

Run in App: `git diff --check`

Expected: 两个仓库均无空白错误。

- [ ] **Step 2: 运行 SDK 类型/构建验证**

Run: `yarn workspace @onekeyfe/hd-transport build && yarn workspace @onekeyfe/hd-core build`

Expected: 命令退出码为 0。

- [ ] **Step 3: 运行最终定向测试**

Run: `yarn workspace @onekeyfe/hd-core test protocol-v2.test.ts --runInBand`

Run in App: `yarn jest packages/kit-bg/src/services/ServiceHardware/ServiceHardware.pro2DeviceManagement.test.ts packages/kit/src/states/jotai/contexts/deviceDetails/pro2DeviceManagement.test.ts --runInBand`

Expected: 所有定向测试通过，0 failures。

- [ ] **Step 4: 审计工作树**

Run: `git status --short && git diff --stat && git -C submodules/firmware-pro2 status --short`

Run in App: `git status --short && git diff --stat`

Expected: 仅包含本计划文件、协议生成物、子模块指针、SDK/App 行为与测试变更；用户原有 multisig 与 session protobuf 修改仍在。
