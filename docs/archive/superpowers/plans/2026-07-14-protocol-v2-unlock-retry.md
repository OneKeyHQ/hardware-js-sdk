# Protocol V2 Unlock Retry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Core 统一处理 Protocol V2 `DeviceLocked` 错误，对显式声明的方法自动解锁并最多重试一次，同时删除基于 `features.unlocked` 的预判断。

**Architecture:** DeviceCommands 将 `Failure_ProcessError/subcode=9` 映射为结构化 `HardwareErrorCode.DeviceLocked`；BaseMethod 提供 opt-in 的 `unlockPolicy`；Core 在同一次 `device.run` 中执行首次调用、解锁和单次重试。Protocol V1 与未声明方法保持原行为。

**Tech Stack:** TypeScript、Jest、Rollup、Protocol V2 protobuf Failure 消息。

---

### Task 1: 保留 DeviceLocked 结构化错误

**Files:**
- Modify: `packages/shared/src/HardwareError.ts`
- Modify: `packages/core/src/device/DeviceCommands.ts`
- Test: `packages/core/__tests__/DeviceCommands.test.ts`

- [ ] 新增失败测试，构造 `Failure_ProcessError`、`subcode: 9`、`message: 'Device locked'`，断言得到 `HardwareErrorCode.DeviceLocked` 且 params 保留 `failureCode/subcode/firmwareMessage`。
- [ ] 运行 `yarn --cwd packages/core test DeviceCommands.test.ts --runInBand`，确认测试因错误码不存在或仍返回 RuntimeError 而失败。
- [ ] 在 `HardwareErrorCode`、默认错误文案和 DeviceCommands Failure 映射中加入 `DeviceLocked`，以 subcode 9 为主判断。
- [ ] 再次运行定向测试并确认通过。

### Task 2: 新增 Method 解锁策略和 Core 单次重试执行器

**Files:**
- Modify: `packages/core/src/api/BaseMethod.ts`
- Modify: `packages/core/src/core/index.ts`
- Test: `packages/core/__tests__/protocol-v2.test.ts`

- [ ] 新增 Core 行为测试：首次 `method.run()` 抛 DeviceLocked，随后调用 `device.unlockDevice()`，再执行一次原方法。
- [ ] 覆盖未声明策略、Protocol V1、解锁取消、第二次仍锁定和首次成功等边界。
- [ ] 运行定向测试，确认统一执行器尚不存在时失败。
- [ ] 在 BaseMethod 增加 `unlockPolicy: 'none' | 'retry-on-locked' = 'none'`。
- [ ] 在 Core 的统一 `method.run()` 调用点引入局部单次重试包装，不把请求重新放回公共队列。
- [ ] 运行定向测试并确认全部通过。

### Task 3: Settings 方法接入策略并删除预判断

**Files:**
- Modify: `packages/core/src/api/protocol-v2/DeviceSettingsGet.ts`
- Modify: `packages/core/src/api/protocol-v2/DeviceSettingsSet.ts`
- Modify: `packages/core/src/api/protocol-v2/DeviceSettingsPageShow.ts`
- Test: `packages/core/__tests__/protocol-v2.test.ts`

- [ ] 将三个 Settings Method 的 `unlockPolicy` 设置为 `retry-on-locked`。
- [ ] 删除 `DeviceSettingsPageShow.run()` 中对 `this.device.features?.unlocked` 的判断和直接 `unlockDevice()` 调用。
- [ ] 调整测试，使 Method 单元测试只验证协议调用，自动解锁顺序由 Core 调度测试验证。
- [ ] 运行 `yarn --cwd packages/core test protocol-v2.test.ts --runInBand` 并确认通过。

### Task 4: 完整验证

**Files:**
- Verify all changed source and test files.

- [ ] 运行 `yarn --cwd packages/core test DeviceCommands.test.ts protocol-v2.test.ts --runInBand`，预期全部通过。
- [ ] 运行 `yarn --cwd packages/core build`，预期退出码 0；记录已有非阻塞 Rollup 警告。
- [ ] 运行 `git diff --check`，预期无空白错误。
- [ ] 审查最终 diff，确认 Protocol V1 路径未改变、自动重试最多一次、其他错误不重试。
