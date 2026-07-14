# Protocol V2 Passphrase Session Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 Pro2 的解锁、隐藏钱包识别、Attach-to-PIN 和钱包 session 复用行为与 Protocol V1 保持一致。

**Architecture:** SDK 直接消费 `DeviceSessionPinResult`，钱包 session helper 负责一次失效缓存重试；固件复用现有 foreground passphrase 状态机和 `seed_session_manager`，让 `DeviceSessionGet` 走完整地址派生并返回最终 session。Protocol V2 InvalidSession 使用 common Failure 的 `subcode=14` 表达。

**Tech Stack:** TypeScript、Jest、C、FreeRTOS、nanopb、Yarn workspaces、CMake/Ninja

---

### Task 1: 对齐 firmware-pro2 最新开发基线

**Files:**

- Update submodule checkout: `submodules/firmware-pro2`

- [ ] **Step 1: 确认官方最新提交**

Run:

```bash
git -C submodules/firmware-pro2 fetch origin --prune
git -C submodules/firmware-pro2 rev-parse origin/dev
```

Expected: `d9382b0d7...` 或更新提交，并确认新增提交未包含本计划的 DeviceSession 完整流程。

- [ ] **Step 2: 从最新 dev 创建本地实现分支**

Run:

```bash
git -C submodules/firmware-pro2 switch -c codex/protocol-v2-passphrase-session origin/dev
```

Expected: 子模块工作区干净，并位于最新 `origin/dev` 基线。

### Task 2: Protocol V2 解锁直接消费 PinResult

**Files:**

- Modify: `packages/core/__tests__/protocol-v2.test.ts`
- Modify: `packages/core/src/device/Device.ts`

- [ ] **Step 1: 写失败测试**

把现有 Protocol V2 unlock 用例改为只允许一次调用，并断言返回值和 raw status 都来自
`DeviceSessionPinResult`：

```ts
expect(typedCall.mock.calls).toEqual([['DeviceSessionAskPin', 'DeviceSessionPinResult']]);
expect(features).toMatchObject({
  unlocked: true,
  unlockedAttachPin: true,
  passphraseProtection: true,
});
expect(features.raw?.protocolV2DeviceInfo?.status).toMatchObject({
  unlocked: true,
  unlocked_by_attach_to_pin: true,
  passphrase_enabled: true,
});
```

- [ ] **Step 2: 运行测试确认 RED**

Run:

```bash
yarn workspace @onekeyfe/hd-core test protocol-v2.test.ts --runInBand
```

Expected: FAIL，原因是 `unlockDevice()` 仍调用 `DeviceStatusGet`。

- [ ] **Step 3: 最小实现**

在 `Device.unlockDevice()` 的 Protocol V2 分支中保存响应，并把已出现的字段映射为
`DeviceStatus` 后调用 `updateProtocolV2Status()`：

```ts
const { message } = await this.commands.typedCall('DeviceSessionAskPin', 'DeviceSessionPinResult');
const status: DeviceStatus = {};
if (message.unlocked != null) status.unlocked = message.unlocked;
if (message.unlocked_attach_pin != null) {
  status.unlocked_by_attach_to_pin = message.unlocked_attach_pin;
}
if (message.passphrase_protection != null) {
  status.passphrase_enabled = message.passphrase_protection;
}
return this.updateProtocolV2Status(status);
```

保留现有 `Failure_UnexpectedMessage -> DeviceNotSupportMethod` 映射，不增加其他旧 API
守卫。

- [ ] **Step 4: 运行测试确认 GREEN**

Run: `yarn workspace @onekeyfe/hd-core test protocol-v2.test.ts --runInBand`

Expected: Protocol V2 与 Protocol V1 unlock 用例全部 PASS。

### Task 3: SDK 对失效缓存 session 自动重试

**Files:**

- Modify: `packages/core/__tests__/protocol-v2.test.ts`
- Modify: `packages/core/src/protocols/protocol-v2/walletSession.ts`

- [ ] **Step 1: 写失败测试**

将现有“invalid session 后清缓存并抛错”用例改为：第一次带缓存调用失败，第二次无
session 调用成功：

```ts
const typedCall = jest
  .fn()
  .mockRejectedValueOnce(new Error('Failure_ProcessError,Failure_InvalidSession'))
  .mockResolvedValueOnce({
    type: 'DeviceSession',
    message: { session_id: 'session-b', btc_test_address: 'state-a' },
  });

await expect(getProtocolV2WalletSession(device)).resolves.toMatchObject({
  passphraseState: 'state-a',
  newSession: 'session-b',
});
expect(typedCall.mock.calls).toEqual([
  ['DeviceSessionGet', 'DeviceSession', { session_id: 'session-a' }],
  ['DeviceSessionGet', 'DeviceSession', {}],
]);
expect(device.getInternalState()).toBe('session-b');
```

另保留一个无缓存首次请求失败的用例，证明不会无限重试。

- [ ] **Step 2: 运行测试确认 RED**

Run: `yarn workspace @onekeyfe/hd-core test protocol-v2.test.ts --runInBand`

Expected: FAIL，当前 helper 清缓存后直接抛错。

- [ ] **Step 3: 最小实现**

在 `getProtocolV2WalletSession()` 内提取一次请求函数。仅当本次确实携带了缓存
`session_id` 且错误满足 `isProtocolV2InvalidSessionError()` 时清理缓存，并使用空
payload 重试一次；后续地址校验和缓存更新只执行一次。

- [ ] **Step 4: 运行测试确认 GREEN**

Run: `yarn workspace @onekeyfe/hd-core test protocol-v2.test.ts --runInBand`

Expected: 缓存恢复、无缓存错误和 passphraseState 不匹配用例全部 PASS。

### Task 4: 为固件 DeviceSession 完整流程建立失败契约测试

**Files:**

- Modify: `packages/hd-transport/__tests__/messages.test.js`

- [ ] **Step 1: 加载 firmware-pro2 foreground 源码**

使用 `fs.readFileSync` 和 `path.resolve(__dirname, '../../../submodules/firmware-pro2/tasks/task_foreground/foreground_access_flow.c')` 加载源码，并增加函数体提取 helper。

- [ ] **Step 2: 写契约断言**

断言：

```js
expect(sendDeviceSessionBody).toContain('response.has_btc_test_address = true');
expect(sendDeviceSessionBody).toContain('response.btc_test_address');
expect(afterSessionReadyBody).toContain('passphrase_state_request_addr();');
expect(afterSessionReadyBody).toContain('passphrase_state_request_space();');
expect(afterSessionReadyBody).not.toContain('device_session_only');
expect(maybeSendBody).toContain('g_passphrase_state_ctx.addr_ready');
expect(maybeSendBody).toContain('send_device_session_response(');
expect(firmwareFlowSource).toContain('Failure_InvalidSession');
expect(firmwareFlowSource).toContain('failure.subcode = 14');
```

- [ ] **Step 3: 运行测试确认 RED**

Run:

```bash
yarn workspace @onekeyfe/hd-transport test messages.test.js --runInBand
```

Expected: FAIL，因为最新固件仍提前返回且不填 `btc_test_address`。

### Task 5: 补全 firmware-pro2 DeviceSession 状态机

**Files:**

- Modify: `submodules/firmware-pro2/tasks/task_foreground/foreground_access_flow.c`

- [ ] **Step 1: 增加 InvalidSession 响应**

增加专用函数，发送：

```c
Failure failure = Failure_init_zero;
failure.code = FailureType_Failure_ProcessError;
failure.has_subcode = true;
failure.subcode = 14;
failure.has_message = true;
strncpy(failure.message, "Failure_InvalidSession", sizeof(failure.message) - 1);
```

仅在 host 提供的 session ID 已成功投递给 SE、但 `SE_MSG_SESSION_OPEN` 返回失败时
使用该响应。SE 队列投递失败仍是普通 ProcessError。

- [ ] **Step 2: 让 DeviceSession 等待完整上下文**

删除 `passphrase_state_after_session_ready()` 的 `device_session_only` 提前返回；无
session ID 时走 `GET_CURRENT_ID -> SESSION_NEW`，而不是无条件创建新 session。

- [ ] **Step 3: 返回地址和最终 session**

把 `send_device_session_response` 改为接收地址：

```c
static void send_device_session_response(
    const char* btc_test_address,
    const uint8_t* session_id,
    IpcSource_t source
)
```

地址非空时设置 `has_btc_test_address` 并复制到 nanopb 固定字符串字段。统一
`passphrase_state_maybe_send()` 的 readiness 条件为 `addr_ready && space_ready &&
session_ready`，DeviceSession 分支返回地址和刷新后的 session。

- [ ] **Step 4: 运行契约测试确认 GREEN**

Run: `yarn workspace @onekeyfe/hd-transport test messages.test.js --runInBand`

Expected: 12 项测试全部 PASS。

- [ ] **Step 5: 编译 foreground 目标**

Run:

```bash
cmake --build submodules/firmware-pro2/.build/dev_debug --target task_foreground_obj -j2
```

Expected: exit 0，无新增编译错误。

### Task 6: 更新文档与最终验证

**Files:**

- Modify: `docs/superpowers/specs/2026-07-13-protocol-v2-wallet-session-and-unlock-design.md`
- Modify: `docs/pro-init-session-passphrase.md`
- Modify: `docs/protocol-v2.md`

- [ ] **Step 1: 修正文档事实**

文档必须明确：

- 解锁是 `DeviceSessionAskPin -> DeviceSessionPinResult`，不跟随 `DeviceStatusGet`；
- `DeviceSessionGet` 返回 `session_id + btc_test_address`；
- `PassphraseRequest/Ack` 在 Pro2 seed session 流程中仍使用；
- 缓存 session 失效时 SDK 清缓存并重试一次；
- `allowCreateAttachPin` 暂不接入 V2 host；
- 不增加旧 API 守卫。

- [ ] **Step 2: 完整验证**

Run:

```bash
yarn workspace @onekeyfe/hd-core test protocol-v2.test.ts --runInBand
yarn workspace @onekeyfe/hd-transport test messages.test.js --runInBand
yarn eslint packages/core/src/device/Device.ts packages/core/src/protocols/protocol-v2/walletSession.ts packages/core/__tests__/protocol-v2.test.ts packages/hd-transport/__tests__/messages.test.js
cmake --build submodules/firmware-pro2/.build/dev_debug --target task_foreground_obj -j2
```

Expected: 所有命令 exit 0。

- [ ] **Step 3: 审查差异**

Run:

```bash
git diff --check
git status --short
git -C submodules/firmware-pro2 diff --check
git -C submodules/firmware-pro2 status --short
```

Expected: 无空白错误，只包含本计划目标文件和用户原有改动。
