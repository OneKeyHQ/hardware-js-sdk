# Pro2 UI Interaction Coordinator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Pro2 增加统一的 SDK UI 交互协调器，完整接入自动解锁、Change PIN 和设置页，并保证 Portfolio 不产生新的交互或进度 Event。

**Architecture:** `BaseMethod` 只声明可选的 Protocol V2 交互元数据；`ProtocolV2UiInteractionCoordinator` 统一生成非阻塞 `REQUEST_PIN/REQUEST_BUTTON`、处理阶段切换和幂等关闭；Core 将协调器注入自动解锁包装器。Protocol V1 保持旧 firmware Event/ACK 链路，Portfolio 不声明交互元数据且继续关闭文件进度事件。

**Tech Stack:** TypeScript、Jest、现有 `@onekeyfe/hd-core` Event 与 Protocol V2 Device API。

---

### Task 1: 扩展公共 UI Event 类型并实现协调器

**Files:**
- Create: `packages/core/src/protocols/protocol-v2/uiInteraction.ts`
- Create: `packages/core/__tests__/protocolV2UiInteraction.test.ts`
- Modify: `packages/core/src/events/ui-request.ts`
- Modify: `packages/core/src/api/BaseMethod.ts`

- [ ] **Step 1: 编写协调器失败测试**

覆盖 V1 不发 Event、V2 方法提示、解锁提示、相同阶段去重、解锁后恢复方法提示、未打开 UI 时关闭不发 Event、打开后幂等关闭。

```ts
const coordinator = new ProtocolV2UiInteractionCoordinator(device, postMessage);
coordinator.enterMethodInteraction({
  request: 'button',
  source: 'method-lifecycle',
  reason: 'change-pin',
  completion: 'page-accepted',
  deviceOnly: true,
});
expect(postMessage).toHaveBeenCalledWith(
  expect.objectContaining({
    type: UI_REQUEST.REQUEST_BUTTON,
    payload: expect.objectContaining({ reason: 'change-pin', deviceOnly: true }),
  })
);
```

- [ ] **Step 2: 运行测试并确认因模块不存在而失败**

Run: `pnpm --filter @onekeyfe/hd-core test -- protocolV2UiInteraction.test.ts --runInBand`

Expected: FAIL，提示无法找到 `uiInteraction` 模块或导出。

- [ ] **Step 3: 扩展 Event payload 类型**

在 `ui-request.ts` 增加：

```ts
export type ProtocolV2UiEventSource =
  | 'unlock-coordinator'
  | 'wallet-session-coordinator'
  | 'method-lifecycle';

export type ProtocolV2UiCompletion = 'page-accepted' | 'operation-completed';

export type ProtocolV2UiEventMetadata = {
  source?: ProtocolV2UiEventSource;
  reason?: string;
  deviceOnly?: boolean;
  completion?: ProtocolV2UiCompletion;
  method?: string;
  page?: string | number;
  operation?: string;
};
```

让 `UiRequestDeviceAction` 和 `UiRequestButton` payload 兼容这些可选字段，不改变 V1 现有字段。

- [ ] **Step 4: 在 BaseMethod 增加可选交互元数据**

```ts
protocolV2UiInteraction?: ProtocolV2InteractionDescriptor;
```

默认 `undefined` 表示该方法不产生 SDK 合成交互 Event。

- [ ] **Step 5: 实现协调器最小功能**

协调器保存最近阶段和方法描述；只有 Protocol V2 且存在描述时发送 Event。`close()` 仅在协调器实际打开过 UI 后发送一次 `CLOSE_UI_WINDOW`，防止 Portfolio 等无交互方法被新增关闭事件。

- [ ] **Step 6: 运行协调器测试并确认通过**

Run: `pnpm --filter @onekeyfe/hd-core test -- protocolV2UiInteraction.test.ts --runInBand`

Expected: PASS。

### Task 2: 将协调器接入 Core 自动解锁生命周期

**Files:**
- Modify: `packages/core/src/protocols/protocol-v2/unlockRetry.ts`
- Modify: `packages/core/src/core/index.ts`
- Modify: `packages/core/__tests__/protocol-v2.test.ts`

- [ ] **Step 1: 编写自动解锁阶段切换失败测试**

把现有 retry 测试扩展为验证：

```ts
expect(calls).toEqual([
  'method-prompt',
  'run-1',
  'unlock-prompt',
  'unlock',
  'method-prompt',
  'run-2',
]);
```

同时验证解锁失败不恢复方法提示、第二次 locked 不再次解锁。

- [ ] **Step 2: 运行测试并确认缺少协调器调用而失败**

Run: `pnpm --filter @onekeyfe/hd-core test -- protocol-v2.test.ts --runInBand -t "Protocol V2 protected method execution"`

Expected: FAIL，调用顺序缺少 UI 阶段。

- [ ] **Step 3: 扩展 runMethodWithUnlockRetry 参数**

```ts
runMethodWithUnlockRetry(method, device, uiCoordinator)
```

执行顺序：

```ts
uiCoordinator.enterMethodInteraction(method.protocolV2UiInteraction);
try {
  return await method.run();
} catch (error) {
  if (!shouldUnlock(error)) throw error;
  uiCoordinator.enterUnlockInteraction(method.name);
  await device.unlockDevice();
  uiCoordinator.resumeMethodInteraction();
  return method.run();
}
```

- [ ] **Step 4: Core 为每次设备调用创建协调器并统一关闭**

在协议识别完成后创建协调器，传给 retry wrapper；在该方法运行的 `finally` 中调用 `coordinator.close()`。保留现有全局 `closePopup()` 作为旧 V1 兼容兜底。

- [ ] **Step 5: 运行自动解锁测试并确认通过**

Run: `pnpm --filter @onekeyfe/hd-core test -- protocol-v2.test.ts --runInBand -t "Protocol V2 protected method execution"`

Expected: PASS。

### Task 3: 完整接入 Change PIN 与设置页

**Files:**
- Modify: `packages/core/src/api/device/DeviceChangePin.ts`
- Modify: `packages/core/src/api/protocol-v2/DeviceSettingsPageShow.ts`
- Modify: `packages/core/__tests__/protocol-v2.test.ts`

- [ ] **Step 1: 编写协议路由和元数据失败测试**

测试要求：

```ts
expect(v1TypedCall).toHaveBeenCalledWith('ChangePin', 'Success', { remove: false });
expect(v2TypedCall).toHaveBeenCalledWith('DeviceSettingsPageShow', 'Success', {
  page: DeviceSettingsPage.DevicePinChange,
});
expect(method.protocolV2UiInteraction).toMatchObject({
  reason: 'change-pin',
  completion: 'page-accepted',
  deviceOnly: true,
});
```

并验证 Pro2 `remove=true` 返回 `CallMethodInvalidParameter`，不得静默忽略参数。

- [ ] **Step 2: 运行测试并确认旧 ChangePin 路由失败**

Run: `pnpm --filter @onekeyfe/hd-core test -- protocol-v2.test.ts --runInBand -t "Change PIN|settings pages"`

Expected: FAIL，Pro2 仍调用 `ChangePin` 或缺少元数据。

- [ ] **Step 3: 实现 deviceChangePin V1/V2 路由**

`init()` 声明 `change-pin/page-accepted` 元数据；`run()` 在 Protocol V2 下校验 `remove !== true` 并发送 `DeviceSettingsPageShow(DevicePinChange)`，V1 保持原命令。

- [ ] **Step 4: 为 DeviceSettingsPageShow 声明页面元数据**

```ts
this.protocolV2UiInteraction = {
  request: 'button',
  source: 'method-lifecycle',
  reason: 'settings-page',
  completion: 'page-accepted',
  deviceOnly: true,
  page: this.params.page,
};
```

- [ ] **Step 5: 运行 Change PIN 和设置页测试并确认通过**

Run: `pnpm --filter @onekeyfe/hd-core test -- protocol-v2.test.ts --runInBand -t "Change PIN|settings pages"`

Expected: PASS。

### Task 4: 明确 Portfolio 无交互 Event 契约

**Files:**
- Modify: `packages/core/src/api/UploadPortfolio.ts`
- Modify: `packages/core/__tests__/protocol-v2.test.ts`
- Modify: `packages/core/__tests__/protocolV2UiInteraction.test.ts`
- Modify: `docs/superpowers/specs/2026-07-20-pro2-ui-interaction-coordinator-design.md`

- [ ] **Step 1: 编写 Portfolio 无 Event 失败保护测试**

测试验证：

- `UploadPortfolio.protocolV2UiInteraction` 为 `undefined`。
- `emitProgress` 继续为 `false`。
- 通过协调器执行 Portfolio 时不产生 `REQUEST_PIN` 或 `REQUEST_BUTTON`。
- firmware `PortfolioUpdate` 仍是直接处理并返回最终 `Success`，SDK 不为其模拟设备确认页面。

- [ ] **Step 2: 运行测试确认保护断言状态**

Run: `pnpm --filter @onekeyfe/hd-core test -- protocol-v2.test.ts protocolV2UiInteraction.test.ts --runInBand -t "Portfolio"`

Expected: 若默认无交互行为已满足则 PASS；该测试作为未来统一层误接入的回归保护。若失败，只修改元数据策略，不增加 Portfolio Event。

- [ ] **Step 3: 在代码和设计文档中显式记录 Portfolio 例外**

在 `UploadPortfolio.init()` 保留中文注释，说明该方法是后台数据写入和应用，不需要设备确认 UI；设计文档增加“Portfolio 不生成交互/进度 Event”的约束。

- [ ] **Step 4: 再次运行 Portfolio 测试**

Run: `pnpm --filter @onekeyfe/hd-core test -- protocol-v2.test.ts protocolV2UiInteraction.test.ts --runInBand -t "Portfolio"`

Expected: PASS。

### Task 5: 更新 SDK 与开发者文档

**Files:**
- Modify: `docs/sdk/events.md`
- Modify: `docs/sdk/pro2-eventless-migration.md`
- Modify: `docs/business/pro2-device-management.md`
- Modify: `packages/connect-examples/developer-portal/content/zh/hardware-sdk/concepts/pin.mdx`
- Modify: `packages/connect-examples/developer-portal/content/zh/hardware-sdk/device-api/devicechangepin.mdx`

- [ ] **Step 1: 更新自动解锁 Event 说明**

明确 Pro2 `REQUEST_PIN` 来源为 `unlock-coordinator`、不调用 `uiResponse()`、解锁后原 API 自动继续。

- [ ] **Step 2: 更新 Change PIN page-accepted 语义**

明确 Pro2 成功只表示设备页面已打开，App 不能显示“PIN 修改成功”；`remove=true` 当前不支持。

- [ ] **Step 3: 更新 Portfolio 例外**

记录 Portfolio 上传不生成设备交互 Event，也不生成文件分片进度 Event；最终结果以 `PortfolioUpdate` 返回为准。

- [ ] **Step 4: 检查文档格式**

Run: `git diff --check`

Expected: 无空白和 Markdown 格式错误。

### Task 6: 全量验证与差异审查

**Files:**
- Test: `packages/core/__tests__/protocolV2UiInteraction.test.ts`
- Test: `packages/core/__tests__/protocol-v2.test.ts`
- Test: `packages/core/__tests__/DeviceCommands.test.ts`

- [ ] **Step 1: 运行相关测试集**

Run: `pnpm --filter @onekeyfe/hd-core test -- protocolV2UiInteraction.test.ts protocol-v2.test.ts DeviceCommands.test.ts --runInBand`

Expected: 全部 PASS，0 failed。

- [ ] **Step 2: 运行 Core 类型构建**

Run: `pnpm --filter @onekeyfe/hd-core build`

Expected: exit 0。

- [ ] **Step 3: 运行 Core lint**

Run: `pnpm --filter @onekeyfe/hd-core lint`

Expected: exit 0；若仓库已有无关 lint 问题，记录精确文件和错误，确保本次修改文件无新增错误。

- [ ] **Step 4: 审查最终差异和 Portfolio Event 边界**

Run:

```bash
git diff --check
git diff --stat
rg -n "protocolV2UiInteraction|REQUEST_BUTTON|REQUEST_PIN" packages/core/src/api/UploadPortfolio.ts
```

Expected: Portfolio 文件中没有交互描述或 Event emit；仅保留 `emitProgress: false` 和说明注释。
