# Protocol V2 BLE Link Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不修改 Pro2 固件协议和固件代码的前提下，为三种 BLE Transport 接入共享、按 Transport 实例隔离的 `ProtocolV2LinkManager`，保证 Protocol V2 Session/SEQ 在连续调用和重连中被正确管理，并完成 Pro2 6136 的稳定性与固件升级速率验证。

**Architecture:** 在 `@onekeyfe/hd-transport` 增加可注入的 `ProtocolV2SequenceCursor`、调用上下文和 `ProtocolV2LinkManager<Key>`。每个 BLE Transport 持有自己的 Manager；Manager 按设备 key 持久化 Sequence Cursor，按活动连接 generation 管理 Link/Session。同设备调用串行、不同设备并行；链路级错误使 Link 失效并清理原生接收状态，但保留 Cursor。Node USB 与 WebUSB 保留现有 Session Map，仅做兼容回归。

**Tech Stack:** TypeScript、Jest、protobufjs、Noble BLE、react-native-ble-plx、Electron Noble bridge、Yarn workspaces、Rollup、OneKey Hardware CLI。

---

## 执行约束

- 设计基线：`docs/superpowers/specs/2026-07-13-protocol-v2-ble-link-manager-design.md`。
- 不修改 `submodules/firmware-pro2`、`submodules/firmware` 或任何 Pro2 固件协议定义。
- 不迁移 Node USB/WebUSB 到 Link Manager；共享 Session API 必须向后兼容。
- 当前工作区含用户已有改动；每次提交只包含本任务文件，使用 `git commit --only <paths>`。
- 所有行为改动必须先有失败测试；真机验证在单元测试、构建与静态检查通过后进行。

## Task 1：让 ProtocolV2Session 支持外部 Sequence Cursor 和调用上下文

**Files:**

- Create: `packages/hd-transport/src/protocols/v2/sequence-cursor.ts`
- Modify: `packages/hd-transport/src/protocols/v2/session.ts`
- Modify: `packages/hd-transport/src/index.ts`
- Test: `packages/hd-transport/__tests__/protocol-v2.test.js`

- [ ] **Step 1：添加失败测试，覆盖外部 Cursor、回绕和上下文透传**

在 `protocol-v2.test.js` 增加：

```js
test('session reuses an injected sequence cursor across recreated sessions', async () => {
  const cursor = new ProtocolV2SequenceCursor();
  const seqs = [];
  const createSession = () =>
    new ProtocolV2Session({
      schemas,
      router: 2,
      sequenceCursor: cursor,
      writeFrame: (frame, context) => {
        seqs.push(protocolV2.decodeFrame(frame).seq);
        expect(context).toEqual(
          expect.objectContaining({ messageName: 'Ping', highVolume: false })
        );
        return Promise.resolve();
      },
      readFrame: _context => Promise.resolve(successFrame),
    });

  await createSession().call('Ping', { message: '1' });
  await createSession().call('Ping', { message: '2' });
  expect(seqs).toEqual([1, 2]);
});
```

另加 Cursor 从 `255` 回绕到 `1`、默认未注入 Cursor 时仍按 Session 从 `1` 开始的测试。

- [ ] **Step 2：运行共享层测试，确认测试先失败**

Run:

```bash
yarn jest packages/hd-transport/__tests__/protocol-v2.test.js --runInBand
```

Expected: FAIL，提示 `ProtocolV2SequenceCursor` 不存在或 `sequenceCursor`/context 尚未实现。

- [ ] **Step 3：实现最小的 Cursor 与向后兼容 Session API**

核心接口：

```ts
export class ProtocolV2SequenceCursor {
  private current = 0;

  next(): number {
    this.current = nextProtoSeq(this.current);
    return this.current;
  }
}

export type ProtocolV2CallContext = {
  messageName: string;
  timeoutMs?: number;
  highVolume: boolean;
  generation: number;
};
```

`ProtocolV2SessionOptions` 新增可选 `sequenceCursor`、`generation`；`writeFrame`/`readFrame` 增加可选第二/第一参数。Session 未注入 Cursor 时自行创建，保持 USB/WebUSB 行为不变。`highVolume` 由现有高频命令集合计算。

- [ ] **Step 4：运行测试与构建**

Run:

```bash
yarn jest packages/hd-transport/__tests__/protocol-v2.test.js --runInBand
yarn workspace @onekeyfe/hd-transport build
```

Expected: PASS。

- [ ] **Step 5：提交共享 Session 基础能力**

```bash
git add packages/hd-transport/src/protocols/v2/sequence-cursor.ts packages/hd-transport/src/protocols/v2/session.ts packages/hd-transport/src/index.ts packages/hd-transport/__tests__/protocol-v2.test.js
git commit --only packages/hd-transport/src/protocols/v2/sequence-cursor.ts packages/hd-transport/src/protocols/v2/session.ts packages/hd-transport/src/index.ts packages/hd-transport/__tests__/protocol-v2.test.js -m "feat(transport): add Protocol V2 sequence cursor"
```

## Task 2：实现共享 ProtocolV2LinkManager

**Files:**

- Create: `packages/hd-transport/src/protocols/v2/link-manager.ts`
- Modify: `packages/hd-transport/src/index.ts`
- Test: `packages/hd-transport/__tests__/protocol-v2-link-manager.test.js`

- [ ] **Step 1：添加 Manager 生命周期与并发失败测试**

覆盖以下行为：

- 同 key 连续调用复用同一 Link/Session，SEQ 为 `1,2`。
- `invalidateLink()` 后新 Adapter 使用旧 Cursor，下一次为 `3`。
- 不同 key 从各自 `1` 开始且可并行。
- 同 key 两个并发调用严格按提交顺序执行。
- 正常 `Failure` 不使 Link 失效。
- `classifyError()` 返回 `link-fatal` 时调用 Adapter `reset()` 和 `onLinkInvalidated()`。
- `invalidateAllLinks()` 保留 Cursor；`dispose()` 清除 Cursor。

示例：

```js
await manager.call('device-a', createAdapter, 'Ping', { message: '1' });
await manager.invalidateLink('device-a', 'reconnect');
await manager.call('device-a', createAdapter, 'Ping', { message: '2' });
expect(sentSeqs).toEqual([1, 2]);
expect(adapters[0].reset).toHaveBeenCalledWith('reconnect');
```

- [ ] **Step 2：运行新测试，确认失败**

```bash
yarn jest packages/hd-transport/__tests__/protocol-v2-link-manager.test.js --runInBand
```

Expected: FAIL，Manager 尚不存在。

- [ ] **Step 3：实现 Link、Manager 和错误失效流程**

实现公开接口：

```ts
export interface ProtocolV2LinkAdapter {
  router: number;
  maxFrameBytes?: number;
  generation: number;
  prepareCall(context: ProtocolV2CallContext): Promise<void> | void;
  writeFrame(frame: Uint8Array, context: ProtocolV2CallContext): Promise<void>;
  readFrame(context: ProtocolV2CallContext): Promise<Uint8Array>;
  reset(reason: string): Promise<void> | void;
}

export class ProtocolV2LinkManager<Key> {
  call(/* key, createAdapter, name, data, options */): Promise<MessageFromOneKey>;
  invalidateLink(key: Key, reason: string): Promise<void>;
  invalidateAllLinks(reason: string): Promise<void>;
  dispose(reason: string): Promise<void>;
}
```

Manager 创建 Link 时读取 `getSchemas()`；Adapter `generation` 写入 Session context。链路失效必须去重，避免调用异常和断连回调重复清理同一 Link。

- [ ] **Step 4：运行共享测试、构建和 lint**

```bash
yarn jest packages/hd-transport/__tests__/protocol-v2-link-manager.test.js packages/hd-transport/__tests__/protocol-v2.test.js --runInBand
yarn workspace @onekeyfe/hd-transport build
yarn eslint packages/hd-transport/src/protocols/v2/link-manager.ts packages/hd-transport/src/protocols/v2/sequence-cursor.ts packages/hd-transport/src/protocols/v2/session.ts
```

Expected: PASS。

- [ ] **Step 5：提交 Manager**

```bash
git add packages/hd-transport/src/protocols/v2/link-manager.ts packages/hd-transport/src/index.ts packages/hd-transport/__tests__/protocol-v2-link-manager.test.js
git commit --only packages/hd-transport/src/protocols/v2/link-manager.ts packages/hd-transport/src/index.ts packages/hd-transport/__tests__/protocol-v2-link-manager.test.js -m "feat(transport): add Protocol V2 link manager"
```

## Task 3：接入 LowlevelTransport，并让协议探测与业务调用共享 Link

**Files:**

- Modify: `packages/hd-transport-lowlevel/src/index.ts`
- Modify: `packages/hd-transport-lowlevel/__tests__/protocol-v2.test.js`

- [ ] **Step 1：添加连续调用和 Link 重建失败测试**

在 Lowlevel 测试中从 `plugin.send` 解码完整 TX 帧，验证：

```js
expect(sentSeqs).toEqual([1, 2]); // probe Ping, then ProtocolInfoRequest
```

再验证 `release/acquire` 后同一个 Transport 实例的下一条 V2 命令不回到 `1`；不同 UUID 各自从 `1` 开始。

- [ ] **Step 2：运行测试，复现当前 probe 后业务调用重复 seq=1**

```bash
yarn jest packages/hd-transport-lowlevel/__tests__/protocol-v2.test.js --runInBand
```

Expected: FAIL，当前 `callProtocolV2()` 每次新建 Session。

- [ ] **Step 3：以 Transport 成员接入 Manager**

改动要点：

- `LowlevelTransport` 构造时创建独立 `ProtocolV2LinkManager<string>`。
- `callProtocolV2()` 改为 `manager.call(uuid, createAdapter, ...)`。
- Adapter 按 UUID 动态调用 plugin，不捕获旧连接对象。
- `prepareCall/reset` 只清理当前 UUID 的 assembler/receiver。
- `release()`、探测重连、schema reconfigure 调用对应 invalidate API。
- 链路级错误包括接收超时、写入失败、帧组装/CRC 错误和断连。

- [ ] **Step 4：运行 Lowlevel 与 V1 回归**

```bash
yarn jest packages/hd-transport-lowlevel/__tests__/protocol-v2.test.js --runInBand
yarn workspace @onekeyfe/hd-transport-lowlevel build
yarn eslint packages/hd-transport-lowlevel/src/index.ts packages/hd-transport-lowlevel/__tests__/protocol-v2.test.js
```

Expected: PASS，V1 Initialize 测试保持不变。

- [ ] **Step 5：提交 Lowlevel 接入**

```bash
git add packages/hd-transport-lowlevel/src/index.ts packages/hd-transport-lowlevel/__tests__/protocol-v2.test.js
git commit --only packages/hd-transport-lowlevel/src/index.ts packages/hd-transport-lowlevel/__tests__/protocol-v2.test.js -m "fix(lowlevel): persist Protocol V2 BLE links"
```

## Task 4：把 Noble 通知与 receiver 改为按设备、按 generation 隔离

**Files:**

- Modify: `packages/hd-transport/src/types.ts`
- Modify: `packages/hd-cli/src/transports/nobleBlePlugin.ts`
- Create: `packages/hd-cli/src/__tests__/noble-ble-plugin.test.ts`

- [ ] **Step 1：为 Lowlevel plugin receive 增加 device key**

将共享插件接口从：

```ts
receive(): Promise<string>;
```

调整为兼容形式：

```ts
receive(uuid?: string): Promise<string>;
```

Lowlevel BLE 必须传 UUID；其他已有插件若忽略参数仍可工作。

- [ ] **Step 2：添加 Noble 双设备隔离和断连清理失败测试**

通过 mock Noble Peripheral/Characteristic 验证：

- A 的通知只能 resolve A 的 receiver。
- 断开 A 不清空 B 的队列。
- 旧 generation listener 触发后数据被丢弃。
- unsubscribe 不回调时，断开仍在限定时间内完成且 JS 状态已清除。

- [ ] **Step 3：运行测试，确认全局队列导致失败**

```bash
yarn jest packages/hd-cli/src/__tests__/noble-ble-plugin.test.ts --runInBand
```

Expected: FAIL，当前为进程级 `notificationQueue/pendingReceivers`。

- [ ] **Step 4：实现按 UUID 的 NobleNotificationState**

```ts
type NobleNotificationState = {
  generation: number;
  queue: string[];
  pendingReceivers: Set<(data: string) => void>;
};

const notificationStates = new Map<string, NobleNotificationState>();
```

Notify listener 绑定 `{ uuid, generation }`；`receive(uuid)` 只消费对应状态。disconnect 先从 Map 删除状态，再以有界等待执行 unsubscribe/peripheral disconnect，避免原生回调不返回时永久挂起。

- [ ] **Step 5：运行 CLI/Lowlevel 测试与构建**

```bash
yarn jest packages/hd-cli/src/__tests__/noble-ble-plugin.test.ts packages/hd-transport-lowlevel/__tests__/protocol-v2.test.js --runInBand
yarn workspace @onekeyfe/hd-cli build
yarn workspace @onekeyfe/hd-transport-lowlevel build
```

Expected: PASS。

- [ ] **Step 6：提交 Noble 隔离改动**

```bash
git add packages/hd-transport/src/types.ts packages/hd-cli/src/transports/nobleBlePlugin.ts packages/hd-cli/src/__tests__/noble-ble-plugin.test.ts
git commit --only packages/hd-transport/src/types.ts packages/hd-cli/src/transports/nobleBlePlugin.ts packages/hd-cli/src/__tests__/noble-ble-plugin.test.ts -m "fix(cli): isolate Noble BLE notifications per device"
```

## Task 5：接入 React Native BLE Transport

**Files:**

- Modify: `packages/hd-transport-react-native/src/index.ts`
- Create: `packages/hd-transport-react-native/src/__tests__/protocolV2Link.test.ts`
- Keep: `packages/hd-transport-react-native/src/__tests__/bleStrategy.test.ts`

- [ ] **Step 1：添加持久 Link、pacing 和旧 generation 失败测试**

测试覆盖：

- 同 UUID 连续 `Ping`、`DeviceInfoGet` 的 TX SEQ 为 `1,2`。
- `FilesystemFileWrite` context 的 `highVolume=true`，普通调用为 `false`。
- 重连后写入从当前 transport map 获取 Characteristic，不使用旧引用。
- 旧 monitor token/generation 的通知不会 resolve 新 Link reader。
- V1 的 `runPromise` 行为保持原测试结果。

- [ ] **Step 2：运行 RN 测试，确认失败**

```bash
yarn jest packages/hd-transport-react-native/src/__tests__/protocolV2Link.test.ts packages/hd-transport-react-native/src/__tests__/bleStrategy.test.ts --runInBand
```

Expected: FAIL，当前 V2 每次调用新建 Session 且 pacing 由单次闭包捕获。

- [ ] **Step 3：接入独立 Manager 并移除 V2 全局 runPromise 串行职责**

改动要点：

- V1 保留原 `runPromise`。
- V2 委托 Manager/Session 做同设备串行。
- Adapter `writeFrame` 根据 `context.highVolume` 动态选择写入节奏。
- Adapter 每次按 UUID 读取当前 Device/Characteristic。
- monitor token 与连接 generation 一起校验。
- release、原生断连、monitor 替换与 schema reconfigure 使 Link 失效。

- [ ] **Step 4：运行 RN 测试、构建和 lint**

```bash
yarn jest packages/hd-transport-react-native/src/__tests__/protocolV2Link.test.ts packages/hd-transport-react-native/src/__tests__/bleStrategy.test.ts --runInBand
yarn workspace @onekeyfe/hd-transport-react-native build
yarn eslint packages/hd-transport-react-native/src/index.ts packages/hd-transport-react-native/src/__tests__/protocolV2Link.test.ts
```

Expected: PASS。

- [ ] **Step 5：提交 RN 接入**

```bash
git add packages/hd-transport-react-native/src/index.ts packages/hd-transport-react-native/src/__tests__/protocolV2Link.test.ts
git commit --only packages/hd-transport-react-native/src/index.ts packages/hd-transport-react-native/src/__tests__/protocolV2Link.test.ts -m "fix(react-native): manage Protocol V2 BLE links"
```

## Task 6：接入 Electron BLE Transport

**Files:**

- Modify: `packages/hd-transport-web-device/src/electron-ble-transport.ts`
- Modify: `packages/hd-transport-web-device/__tests__/electron-ble-transport.test.ts`

- [ ] **Step 1：添加连续调用、双 UUID 和旧通知测试**

扩展现有 Electron BLE 测试：

- probe Ping 后首个业务调用使用下一个 SEQ。
- 同 UUID 连续调用复用 Link。
- 不同 UUID 的通知、reader、Session 不串线。
- `cleanupDeviceState/release` 后旧 callback 不可投递新连接。
- V1 协议探测和 V1 call 行为不变。

- [ ] **Step 2：运行测试，确认失败**

```bash
yarn jest packages/hd-transport-web-device/__tests__/electron-ble-transport.test.ts --runInBand
```

Expected: FAIL，当前 V2 每次调用新建 Session，并由全局 `runPromise/activeProtocolV2Call` 管理。

- [ ] **Step 3：接入独立 Manager**

改动要点：

- V2 不再依赖 Transport 全局 `runPromise` 做主串行化；V1 保持不变。
- Adapter 按 UUID/generation 使用现有 `writeWithChunking`、frame queue 和 assembler。
- notification token 与 Adapter generation 绑定。
- cleanup、release、native disconnect、schema reconfigure 使 Link 失效。
- 某 UUID 的错误和清理不得影响其他 UUID。

- [ ] **Step 4：运行 Electron BLE 测试、构建和 lint**

```bash
yarn jest packages/hd-transport-web-device/__tests__/electron-ble-transport.test.ts --runInBand
yarn workspace @onekeyfe/hd-transport-web-device build
yarn eslint packages/hd-transport-web-device/src/electron-ble-transport.ts packages/hd-transport-web-device/__tests__/electron-ble-transport.test.ts
```

Expected: PASS。

- [ ] **Step 5：提交 Electron BLE 接入**

```bash
git add packages/hd-transport-web-device/src/electron-ble-transport.ts packages/hd-transport-web-device/__tests__/electron-ble-transport.test.ts
git commit --only packages/hd-transport-web-device/src/electron-ble-transport.ts packages/hd-transport-web-device/__tests__/electron-ble-transport.test.ts -m "fix(electron): manage Protocol V2 BLE links"
```

## Task 7：USB/WebUSB 兼容回归与整体验证

**Files:**

- Modify only if a compatibility failure is found: existing USB/WebUSB tests and Session typing call sites.
- Do not migrate USB/WebUSB transports to `ProtocolV2LinkManager` in this task.

- [ ] **Step 1：确认 USB/WebUSB 仍按 path 复用 Session**

只读检查 Session Map、release 和 schema reconfigure 路径；若已有测试未覆盖连续 SEQ，仅补回归测试，不改架构。

- [ ] **Step 2：运行目标包测试**

```bash
yarn jest packages/hd-transport/__tests__/protocol-v2.test.js packages/hd-transport/__tests__/protocol-v2-link-manager.test.js packages/hd-transport-lowlevel/__tests__/protocol-v2.test.js packages/hd-cli/src/__tests__/noble-ble-plugin.test.ts packages/hd-transport-react-native/src/__tests__/bleStrategy.test.ts packages/hd-transport-react-native/src/__tests__/protocolV2Link.test.ts packages/hd-transport-web-device/__tests__/electron-ble-transport.test.ts --runInBand
```

Expected: PASS。

- [ ] **Step 3：运行包构建**

```bash
yarn workspace @onekeyfe/hd-transport build
yarn workspace @onekeyfe/hd-transport-lowlevel build
yarn workspace @onekeyfe/hd-transport-react-native build
yarn workspace @onekeyfe/hd-transport-web-device build
yarn workspace @onekeyfe/hd-cli build
```

Expected: PASS。

- [ ] **Step 4：对本任务文件执行 lint 和 Prettier 检查**

```bash
yarn eslint packages/hd-transport/src/protocols/v2 packages/hd-transport-lowlevel/src/index.ts packages/hd-cli/src/transports/nobleBlePlugin.ts packages/hd-transport-react-native/src/index.ts packages/hd-transport-web-device/src/electron-ble-transport.ts
yarn prettier --check docs/superpowers/specs/2026-07-13-protocol-v2-ble-link-manager-design.md docs/superpowers/plans/2026-07-13-protocol-v2-ble-link-manager.md packages/hd-transport/src/protocols/v2 packages/hd-transport-lowlevel/src/index.ts packages/hd-cli/src/transports/nobleBlePlugin.ts packages/hd-transport-react-native/src/index.ts packages/hd-transport-web-device/src/electron-ble-transport.ts
```

Expected: PASS。

- [ ] **Step 5：自审变更范围和风险**

```bash
git diff --check
git diff --stat HEAD~6..HEAD
git status --short
```

重点审查：

- 是否意外修改 V1、USB/WebUSB 语义或 Pro2 固件。
- 是否存在超时后仍存活的 pending reader。
- 是否存在跨 UUID 全局队列或全局 V2 串行锁。
- 是否有 Adapter 捕获旧 Device/Characteristic。
- 是否会在应用层 `Failure` 后错误断开链路。

## Task 8：Pro2 6136 真机稳定性与 firmwareUpdateV4 验收

**Files:**

- Firmware input (read-only): `/Users/caikaisheng/Downloads/pro2-dev`
- Device: `Pro2 6136` / UUID `e3f3b8b04b75cdc43c798112b55f538a`
- Modify only if needed: CLI test/diagnostic scripts under `packages/hd-cli`，且需单独提交。

- [ ] **Step 1：构建真机所需 SDK 与 CLI**

```bash
yarn workspace @onekeyfe/hd-common-connect-sdk build
yarn workspace @onekeyfe/hd-transport build
yarn workspace @onekeyfe/hd-transport-lowlevel build
yarn workspace @onekeyfe/hd-cli build
```

Expected: PASS。

- [ ] **Step 2：单独验证 Ping 与 DeviceInfoGet**

使用本地 SDK/CLI 对指定 UUID 在同一连接执行 `Ping -> DeviceInfoGet`，记录 TX SEQ、耗时和结果。Expected: `seq=1` 后为 `seq=2`，两者均成功。

- [ ] **Step 3：执行 100 轮稳定性测试**

同一 Transport 实例和连接连续执行 100 轮：

```text
Ping -> DeviceInfoGet
```

记录成功数、超时数、P50/P95/P99、最小/最大耗时。Expected: 200 次调用零超时、零串线。

- [ ] **Step 4：执行断开/重连测试**

快速 release/acquire 后再次执行 `Ping -> DeviceInfoGet`，确认旧通知不被消费、Link 重建成功，并记录重连后的第一个 TX SEQ。

- [ ] **Step 5：执行完整 BLE firmwareUpdateV4**

使用 `/Users/caikaisheng/Downloads/pro2-dev` 中的本地固件，通过本地 CLI 的 BLE Transport 对 `Pro2 6136` 完整升级。记录：

- 固件文件与字节数。
- transfer、install、total 时间。
- 平均 KiB/s 和有效载荷 KiB/s。
- 重试、超时、断连次数。
- 每阶段设备响应和最终状态。

- [ ] **Step 6：升级后恢复验证**

重新扫描并连接 `Pro2 6136`，执行 DeviceInfoGet，确认固件版本、设备状态和 BLE 通讯正常。

- [ ] **Step 7：输出验收报告并最终自审**

报告必须区分：

- 共享 Manager 单元测试结论。
- 三种 BLE Transport 回归结论。
- WebUSB 是否需要迁移的最终结论。
- 真机连续调用稳定性。
- firmwareUpdateV4 成功/失败阶段和实测速率。
- 尚未覆盖的移动端/桌面端实机风险。

最后执行 `superpowers:verification-before-completion`，仅在所有声明均有命令输出或真机日志证据时报告完成。
