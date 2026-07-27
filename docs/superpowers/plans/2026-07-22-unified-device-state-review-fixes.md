# Unified Device State Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复统一 DeviceState 重构审查中发现的事件时序、V1 刷新兼容、物理设备并发队列和未知状态语义问题。

**Architecture:** SDK 继续以 DeviceState 为唯一状态源，但 V1 `getFeatures` 显式刷新；显式 section 刷新保持严格错误语义。App 使用 `DEVICE.STATE` payload 直接更新详情页 snapshot，数据库写入按稳定物理标识串行，依赖数据库的通知在持久化完成后发送。

**Tech Stack:** TypeScript、Jest、EventEmitter、Jotai、Realm/IndexedDB、Yarn。

---

### Task 1: 恢复 SDK V1 getFeatures 刷新语义

**Files:**

- Modify: `packages/core/__tests__/public-device-state-api.test.ts`
- Modify: `packages/core/src/api/GetFeatures.ts`

- [ ] 增加失败测试，断言 V1 `GetFeatures.run()` 使用 `refresh: ['identity']` 与 `includeRaw: true`。
- [ ] 运行 `yarn --cwd packages/core jest __tests__/public-device-state-api.test.ts --runInBand`，确认旧实现因缺少 refresh 失败。
- [ ] 修改 `GetFeatures.run()`，让 V1 兼容调用触发真实设备刷新。
- [ ] 重跑测试并确认通过。

### Task 2: 保持显式 settings 刷新的严格错误语义

**Files:**

- Modify: `packages/core/__tests__/get-device-state.test.ts`
- Modify: `packages/core/src/device/Device.ts`

- [ ] 将锁定 settings 测试改为断言 `DeviceLocked` 向调用方返回，同时缓存不被修改。
- [ ] 运行测试确认当前吞错实现失败。
- [ ] 删除 `DeviceSettingsGet` 的 DeviceLocked 静默捕获。
- [ ] 重跑相关 SDK 测试。

### Task 3: 修复 App 事件、持久化与 snapshot 时序

**Files:**

- Modify: `packages/kit-bg/src/services/ServiceHardware/ServiceHardware.pro2DeviceManagement.test.ts`
- Modify: `packages/kit-bg/src/services/ServiceHardware/ServiceHardware.ts`
- Modify: `packages/kit/src/states/jotai/contexts/deviceDetails/actions.ts`
- Modify: `packages/kit/src/views/DeviceManagement/pages/DeviceDetailsModal/index.tsx`

- [ ] 增加失败测试，断言 DB 写入完成后才发送依赖 DB 的 `HardwareDeviceStateUpdate`，DB 失败仍发送。
- [ ] 增加状态 action，使详情页可直接用事件 payload 更新 Pro2 snapshot。
- [ ] 修改详情页事件监听，传入完整 `DeviceStateEvent`，不再用旧 snapshot 覆盖新状态。
- [ ] 使用 `serialNo || deviceId || connectId` 作为状态持久化队列键。
- [ ] 重跑 ServiceHardware 与详情页状态测试。

### Task 4: 保留未知动态状态

**Files:**

- Modify: `packages/kit/src/states/jotai/contexts/deviceDetails/atoms.ts`
- Modify: `packages/kit/src/states/jotai/contexts/deviceDetails/pro2DeviceManagement.ts`
- Modify: `packages/kit/src/states/jotai/contexts/deviceDetails/pro2DeviceManagement.test.ts`

- [ ] 增加失败测试，断言 `null` 状态映射为 `undefined`，而不是 `false`。
- [ ] 将需要表达未知的动态字段改为 `boolean | undefined`。
- [ ] 修正 Pro2 meta state 映射和相关消费方。
- [ ] 重跑详情页状态测试与 TypeScript 检查。

### Task 5: 统一公开文档并完成验证

**Files:**

- Modify: `packages/connect-examples/developer-portal/content/zh/hardware-sdk/basic-api/get-features.mdx`
- Modify: `docs/sdk/pro2-field-migration.md`

- [ ] 标记 `getFeatures/DEVICE.FEATURES` 仅供 Protocol V1。
- [ ] 删除把 `targets.status=true` 描述为公共调试能力的内容。
- [ ] 运行 SDK Core 全量测试、lint 和 build。
- [ ] 同步 SDK dist 到 App 本地依赖，运行 App targeted Jest、oxlint 与 `yarn tsc:only`。
- [ ] 分别提交 SDK 和 App 修复。
