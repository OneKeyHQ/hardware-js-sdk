# Protocol V2 USB Transport Base Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增统一的 `ProtocolV2UsbTransportBase<Key>`，迁移 Node USB 与 WebUSB，并依次完成 Node USB 真机和 WebUSB 验证。

**Architecture:** 共享基类位于 `@onekeyfe/hd-transport`，内部组合 `ProtocolV2LinkManager`，独占 per-key generation、Sequence Cursor 和 frame assembler。Node USB 与 WebUSB 继承基类，只实现平台 packet I/O、原生连接 reset、schema/logger 和 timeout error hook；Protocol V1、枚举、授权与平台设备结构保持在子类。

**Tech Stack:** TypeScript、Jest、protobufjs、node-usb/libusb、WebUSB、Yarn workspaces、Rollup、OneKey Hardware CLI。

---

## 执行约束

- 当前分支：`feat/pro2-usb-ble`。
- 不创建 worktree，不修改 Pro2 固件或协议定义。
- 工作区已有用户改动；每次提交必须使用 `git commit --only` 并逐项列出本任务文件。
- 每项行为变更先写失败测试并确认 RED，再写生产代码。
- Protocol V2 业务命令不得在 Transport 内自动重发。
- Node USB 验证通过前不开始 WebUSB 生产代码迁移。
- WebUSB 生产代码迁移完成前必须先有 mock `USBDevice` 失败测试。

## 文件结构

### 新增

- `packages/hd-transport/src/protocols/v2/usb-transport-base.ts`：共享 USB Protocol V2 生命周期基类。
- `packages/hd-transport/__tests__/protocol-v2-usb-transport-base.test.js`：基类状态、SEQ、generation 和 timeout 测试。
- `packages/hd-transport-usb/__tests__/protocol-v2-link.test.ts`：Node USB 集成测试。
- `packages/hd-transport-web-device/__tests__/webusb-protocol-v2-link.test.ts`：WebUSB 集成测试。

### 修改

- `packages/hd-transport/src/index.ts`：导出基类和类型。
- `packages/hd-transport-usb/src/index.ts`：继承基类并删除 V2 Session Map/timeout side-channel。
- `packages/hd-transport-web-device/src/webusb.ts`：继承基类并删除 V2 Session Map/timeout side-channel。
- `docs/superpowers/specs/2026-07-13-protocol-v2-usb-transport-base-design.md`：仅在真机结果要求调整设计时更新。

## Task 1：共享 USB Protocol V2 基类

**Files:**

- Create: `packages/hd-transport/__tests__/protocol-v2-usb-transport-base.test.js`
- Create: `packages/hd-transport/src/protocols/v2/usb-transport-base.ts`
- Modify: `packages/hd-transport/src/index.ts`

- [ ] **Step 1：写 Fake USB 基类失败测试**

测试文件创建最小 protobuf schema，并定义只暴露测试入口的子类：

```js
class FakeUsbTransport extends ProtocolV2UsbTransportBase {
  constructor() {
    super({
      router: PROTOCOL_V2_CHANNEL_USB,
      maxFrameBytes: PROTOCOL_V2_FRAME_MAX_BYTES,
      logPrefix: 'ProtocolV2 FakeUSB',
    });
    this.generations = new Map();
    this.sentSeqs = [];
    this.readContexts = [];
    this.frames = new Map();
    this.nativeResets = [];
  }

  configureSchemas(protocolV1, protocolV2) {
    this.schemas = { protocolV1, protocolV2 };
  }

  callDevice(key, name, data, options) {
    return this.callProtocolV2Usb(key, name, data, options);
  }

  rotate(key, reason = 'test connection rotated') {
    return this.rotateProtocolV2UsbGeneration(key, reason);
  }

  invalidate(key, reason) {
    return this.invalidateProtocolV2UsbLink(key, reason);
  }

  dispose(reason) {
    return this.disposeProtocolV2UsbLinks(reason);
  }

  getProtocolV2UsbSchemas() {
    return this.schemas;
  }

  getProtocolV2UsbLogger() {
    return undefined;
  }

  async writeProtocolV2UsbPacket(key, frame) {
    this.sentSeqs.push([key, frame[6]]);
    const response = ProtocolV2.encodeFrame(
      this.schemas,
      'Success',
      { message: 'ok' },
      {
        router: PROTOCOL_V2_CHANNEL_USB,
        seq: frame[6],
      }
    );
    this.frames.set(key, [response]);
  }

  async readProtocolV2UsbPacket(key, context) {
    this.readContexts.push([key, context.timeoutMs]);
    return this.frames.get(key).shift();
  }

  async resetProtocolV2UsbNativeLink(key, reason) {
    this.nativeResets.push([key, reason]);
  }

  createProtocolV2UsbTimeoutError(name, timeoutMs) {
    return new Error(`USB timeout after ${timeoutMs}ms for ${name}`);
  }
}
```

至少添加以下测试：

```js
test('keeps seq across USB generation rotation', async () => {
  await fake.rotate('a');
  await fake.callDevice('a', 'Ping', { message: '1' });
  await fake.rotate('a', 'reconnect');
  await fake.callDevice('a', 'Ping', { message: '2' });
  expect(fake.sentSeqs).toEqual([
    ['a', 1],
    ['a', 2],
  ]);
});

test('passes each queued call its own timeout context', async () => {
  await fake.rotate('a');
  await Promise.all([
    fake.callDevice('a', 'Ping', { message: '1' }, { timeoutMs: 111 }),
    fake.callDevice('a', 'Ping', { message: '2' }, { timeoutMs: 222 }),
  ]);
  expect(fake.readContexts).toEqual([
    ['a', 111],
    ['a', 222],
  ]);
});

test('invalidates an in-flight generation before it can read', async () => {
  // write hook 阻塞，rotation 后释放 write，断言 read hook 不会消费旧 generation。
});

test('disposes cursors and restarts seq from one', async () => {
  await fake.rotate('a');
  await fake.callDevice('a', 'Ping', {});
  await fake.dispose('transport disposed');
  await fake.rotate('a');
  await fake.callDevice('a', 'Ping', {});
  expect(fake.sentSeqs.map(([, seq]) => seq)).toEqual([1, 1]);
});
```

- [ ] **Step 2：运行测试确认 RED**

Run:

```bash
yarn jest packages/hd-transport/__tests__/protocol-v2-usb-transport-base.test.js --runInBand
```

Expected: FAIL，原因是 `ProtocolV2UsbTransportBase` 尚未导出。

- [ ] **Step 3：实现共享基类**

`usb-transport-base.ts` 实现以下结构：

```ts
export type ProtocolV2UsbTransportBaseOptions = {
  router: number;
  maxFrameBytes: number;
  logPrefix: string;
};

export abstract class ProtocolV2UsbTransportBase<Key> {
  private readonly protocolV2UsbLinks: ProtocolV2LinkManager<Key>;
  private readonly protocolV2UsbAssemblers = new Map<Key, ProtocolV2FrameAssembler>();
  private readonly protocolV2UsbGenerations = new Map<Key, number>();

  protected constructor(private readonly protocolV2UsbOptions: ProtocolV2UsbTransportBaseOptions) {
    this.protocolV2UsbLinks = new ProtocolV2LinkManager<Key>({
      getSchemas: () => this.getProtocolV2UsbSchemas(),
      classifyError: () => 'link-fatal',
      onLinkInvalidated: async (key, reason) => {
        this.protocolV2UsbAssemblers.get(key)?.reset();
        await this.resetProtocolV2UsbNativeLink(key, reason);
        await this.onProtocolV2UsbLinkInvalidated(key, reason);
      },
    });
  }

  protected abstract getProtocolV2UsbSchemas(): ProtocolV2Schemas;
  protected abstract getProtocolV2UsbLogger(): ProtocolV2SessionOptions['logger'];
  protected abstract writeProtocolV2UsbPacket(
    key: Key,
    frame: Uint8Array,
    context: ProtocolV2CallContext
  ): Promise<void>;
  protected abstract readProtocolV2UsbPacket(
    key: Key,
    context: ProtocolV2CallContext
  ): Promise<Uint8Array>;
  protected abstract resetProtocolV2UsbNativeLink(key: Key, reason: string): Promise<void>;
  protected abstract createProtocolV2UsbTimeoutError(name: string, timeoutMs: number): Error;

  protected onProtocolV2UsbLinkInvalidated(_key: Key, _reason: string): Promise<void> | void {}

  protected async rotateProtocolV2UsbGeneration(key: Key, reason: string) {
    await this.protocolV2UsbLinks.invalidateLink(key, reason);
    const generation = (this.protocolV2UsbGenerations.get(key) ?? 0) + 1;
    this.protocolV2UsbGenerations.set(key, generation);
    this.protocolV2UsbAssemblers.set(
      key,
      new ProtocolV2FrameAssembler(this.protocolV2UsbOptions.maxFrameBytes)
    );
    return generation;
  }

  protected callProtocolV2Usb(
    key: Key,
    name: string,
    data: Record<string, unknown>,
    options?: TransportCallOptions
  ) {
    return this.protocolV2UsbLinks.call(
      key,
      () => this.createProtocolV2UsbAdapter(key),
      name,
      data,
      options
    );
  }
}
```

`createProtocolV2UsbAdapter` 必须：

- 捕获当前 generation；
- `prepareCall` 在队列内 reset assembler；
- write/read 前后校验 generation；
- read 循环把 packet 输入 assembler，直到得到完整 frame；
- `reset` 只 reset assembler，原生 close 由 `onLinkInvalidated` 执行；
- timeout error 调用子类 hook。

在 `packages/hd-transport/src/index.ts` 导出：

```ts
export * from './protocols/v2/usb-transport-base';
```

- [ ] **Step 4：运行共享测试确认 GREEN**

Run:

```bash
yarn jest packages/hd-transport/__tests__/protocol-v2-usb-transport-base.test.js packages/hd-transport/__tests__/protocol-v2-link-manager.test.js --runInBand
yarn workspace @onekeyfe/hd-transport build
```

Expected: 两个测试套件通过，构建 exit 0。

- [ ] **Step 5：提交共享基类**

```bash
git commit --only -m "feat(transport): add Protocol V2 USB transport base" -- \
  packages/hd-transport/src/protocols/v2/usb-transport-base.ts \
  packages/hd-transport/src/index.ts \
  packages/hd-transport/__tests__/protocol-v2-usb-transport-base.test.js
```

## Task 2：Node USB 接入共享基类

**Files:**

- Create: `packages/hd-transport-usb/__tests__/protocol-v2-link.test.ts`
- Modify: `packages/hd-transport-usb/src/index.ts`

- [ ] **Step 1：写 Node USB 失败测试**

mock `usb` 模块，构造一个带 vendor interface、IN/OUT endpoint 和 serial descriptor 的设备。测试至少覆盖：

```ts
test('keeps seq across probe, call and reacquire', async () => {
  const transport = createTransportHarness();
  await transport.acquire({ path: '6136', expectedProtocol: 'V2' });
  await transport.call('6136', 'Ping', { message: 'first' });
  await transport.release('6136');
  await transport.acquire({ path: '6136', expectedProtocol: 'V2' });
  await transport.call('6136', 'Ping', { message: 'second' });
  expect(harness.sentSeqs).toEqual([1, 2]);
});

test('does not resend a Protocol V2 frame after transferOut fails', async () => {
  harness.epOut.transfer.mockImplementationOnce((_data, callback) =>
    callback(new Error('LIBUSB_ERROR_IO'))
  );
  await expect(transport.call('6136', 'Ping', {})).rejects.toThrow('LIBUSB_ERROR_IO');
  expect(harness.epOut.transfer).toHaveBeenCalledTimes(1);
});

test('closes the old handle when a Protocol V2 response times out', async () => {
  harness.holdNextRead();
  await expect(transport.call('6136', 'Ping', {}, { timeoutMs: 20 })).rejects.toThrow('20ms');
  expect(harness.device.close).toHaveBeenCalled();
});
```

- [ ] **Step 2：运行测试确认 RED**

Run:

```bash
yarn jest packages/hd-transport-usb/__tests__/protocol-v2-link.test.ts --runInBand
```

Expected: FAIL，当前 Node USB 仍使用 Session Map，且 transferOut 会自动重试。

- [ ] **Step 3：迁移 NodeUsbTransport**

修改类定义：

```ts
export default class NodeUsbTransport extends ProtocolV2UsbTransportBase<string> {
  constructor() {
    super({
      router: PROTOCOL_V2_CHANNEL_USB,
      maxFrameBytes: PROTOCOL_V2_FRAME_MAX_BYTES,
      logPrefix: 'ProtocolV2 NodeUSB',
    });
  }
}
```

删除：

- `protocolV2Assemblers`；
- `protocolV2Sessions`；
- `protocolV2ReadTimeouts`；
- `writeProtocolV2Frame` 的 V2 reconnect/retry；
- `receiveProtocolV2Frame`；
- V2 timeout 中的 `resetConnectionAfterProbe` side effect。

实现 hook：

```ts
protected getProtocolV2UsbSchemas() {
  if (!this.messages || !this.messagesV2) {
    throw ERRORS.TypedError(HardwareErrorCode.TransportNotConfigured);
  }
  return { protocolV1: this.messages, protocolV2: this.messagesV2 };
}

protected async writeProtocolV2UsbPacket(path: string, frame: Uint8Array) {
  await transferOutOnce(this.getOpenDevice(path).epOut, Buffer.from(frame));
}

protected async readProtocolV2UsbPacket(path: string) {
  for (;;) {
    try {
      const packet = await transferInOnce(
        this.getOpenDevice(path).epIn,
        PROTOCOL_V2_FRAME_MAX_BYTES
      );
      return new Uint8Array(packet.buffer.slice(packet.byteOffset, packet.byteOffset + packet.length));
    } catch (error) {
      if (this.isUsbTransferTimeout(error)) continue;
      throw error;
    }
  }
}

protected async resetProtocolV2UsbNativeLink(path: string) {
  await this.closeOpenDevice(path);
}
```

连接变化规则：

- `acquire` 在 close/open 前调用 `rotateProtocolV2UsbGeneration`；
- `reconnectForRetry` 只服务 V1，执行原生 reconnect 前 rotation；
- `resetConnectionAfterProbe` 先 invalidate/rotate，再 reopen；
- `release` 先 invalidate Link，再 raw close；
- `configureProtocolV2` 调用 `invalidateAllProtocolV2UsbLinks`；
- `callProtocolV2` 只调用 `callProtocolV2Usb`。

- [ ] **Step 4：运行 Node USB 测试确认 GREEN**

Run:

```bash
yarn workspace @onekeyfe/hd-transport build
yarn jest packages/hd-transport-usb/__tests__/protocol-v2-link.test.ts --runInBand
yarn workspace @onekeyfe/hd-transport-usb build
```

Expected: 测试通过，两个包构建 exit 0。

- [ ] **Step 5：提交 Node USB 迁移**

```bash
git commit --only -m "refactor(usb): manage Protocol V2 links through shared base" -- \
  packages/hd-transport-usb/src/index.ts \
  packages/hd-transport-usb/__tests__/protocol-v2-link.test.ts
```

## Task 3：Node USB 真机验证

**Files:**

- Modify only if test evidence requires: shared base or Node USB files from Tasks 1–2.

- [ ] **Step 1：构建 CLI**

```bash
yarn workspace @onekeyfe/hd-transport build
yarn workspace @onekeyfe/hd-transport-usb build
yarn --cwd packages/hd-cli build
```

- [ ] **Step 2：搜索并确认 Pro2 6136**

```bash
node packages/hd-cli/dist/cli.js --transport usb search
```

Expected: 返回设备 path/connectId，并能够定位 Pro2 6136。

- [ ] **Step 3：独立调用 Ping 与 DeviceInfoGet**

使用 CLI 现有 USB 命令或 SDK 脚本分别执行 Ping、DeviceInfoGet，记录：

- acquire 和 protocol type；
- TX seq；
- 响应耗时；
- release 后下一次 acquire 的 TX seq。

Expected: 两个命令成功，连续 seq 不重复。

- [ ] **Step 4：执行 100 轮稳定性测试**

复用同一 Transport 实例执行 100 轮：

```text
Ping -> DeviceInfoGet
```

输出成功率、min、p50、p95、p99、max、avg 和总耗时。

Expected: 100/100 成功，无 seq 重复，无旧 read 吞响应。

- [ ] **Step 5：执行 firmwareUpdateV4**

固件目录：

```text
/Users/caikaisheng/Downloads/pro2-dev
```

Run:

```bash
node packages/hd-cli/dist/cli.js --transport usb firmware-update-v4 \
  --resource-bundle \
  /Users/caikaisheng/Downloads/pro2-dev/images.okpkg:vol0:/bundles/images/images.okpkg \
  /Users/caikaisheng/Downloads/pro2-dev/animation.okpkg:vol0:/bundles/images/animation.okpkg \
  /Users/caikaisheng/Downloads/pro2-dev/wallpaper.okpkg:vol0:/bundles/images/wallpaper.okpkg \
  /Users/caikaisheng/Downloads/pro2-dev/translations.okpkg:vol0:/bundles/translations/translations.okpkg \
  /Users/caikaisheng/Downloads/pro2-dev/roobert.okpkg:vol0:/bundles/font/roobert.okpkg \
  /Users/caikaisheng/Downloads/pro2-dev/noto.okpkg:vol0:/bundles/font/noto.okpkg \
  --bootloader /Users/caikaisheng/Downloads/pro2-dev/bootloader.okpkg \
  --application-p1 /Users/caikaisheng/Downloads/pro2-dev/core_p1.okpkg \
  --application-p2 /Users/caikaisheng/Downloads/pro2-dev/core_p2.okpkg \
  --coprocessor /Users/caikaisheng/Downloads/pro2-dev/coprocessor.okpkg.bin \
  --se01 /Users/caikaisheng/Downloads/pro2-dev/se01.pp.bin \
  --se02 /Users/caikaisheng/Downloads/pro2-dev/se02.pp.bin \
  --se03 /Users/caikaisheng/Downloads/pro2-dev/se03.pp.bin \
  --se04 /Users/caikaisheng/Downloads/pro2-dev/se04.pp.bin \
  --forced-update-res
```

记录连接、bootloader 重连、传输字节数、传输耗时、速率和最终结果。

- [ ] **Step 6：真机修正遵循 TDD**

如果真机暴露问题：先在共享基类或 Node USB 测试中复现为失败测试，再修改生产代码并重新执行 Task 3。

- [ ] **Step 7：提交真机修正**

仅在存在修正时提交：

```bash
git commit --only -m "fix(usb): harden Protocol V2 link lifecycle" -- \
  packages/hd-transport/src/protocols/v2/usb-transport-base.ts \
  packages/hd-transport/__tests__/protocol-v2-usb-transport-base.test.js \
  packages/hd-transport-usb/src/index.ts \
  packages/hd-transport-usb/__tests__/protocol-v2-link.test.ts
```

## Task 4：WebUSB 接入共享基类

**Files:**

- Create: `packages/hd-transport-web-device/__tests__/webusb-protocol-v2-link.test.ts`
- Modify: `packages/hd-transport-web-device/src/webusb.ts`

- [ ] **Step 1：写 WebUSB 失败测试**

mock `navigator.usb`、`USBDevice`、configuration/interface/endpoints 和 transfer 结果。测试至少覆盖：

```ts
test('keeps seq across WebUSB release and reacquire', async () => {
  await transport.acquire({ path, expectedProtocol: 'V2' });
  await transport.call(path, 'Ping', { message: 'first' });
  await transport.release(path);
  await transport.acquire({ path, expectedProtocol: 'V2' });
  await transport.call(path, 'Ping', { message: 'second' });
  expect(harness.sentSeqs).toEqual([1, 2]);
});

test('isolates a late transferIn result after release', async () => {
  const call = transport.call(path, 'Ping', {}, { timeoutMs: 20 });
  await transport.release(path);
  harness.resolveOldTransfer(responseForSeq(1));
  await expect(call).rejects.toThrow();
  await transport.acquire({ path, expectedProtocol: 'V2' });
  await expect(transport.call(path, 'Ping', {})).resolves.toMatchObject({ type: 'Success' });
});
```

- [ ] **Step 2：运行测试确认 RED**

```bash
yarn jest packages/hd-transport-web-device/__tests__/webusb-protocol-v2-link.test.ts --runInBand
```

Expected: FAIL，当前 WebUSB 没有统一 generation/invalidation 语义。

- [ ] **Step 3：迁移 WebUsbTransport**

类定义：

```ts
export default class WebUsbTransport extends ProtocolV2UsbTransportBase<string> {
  constructor() {
    super({
      router: PROTOCOL_V2_CHANNEL_USB,
      maxFrameBytes: PROTOCOL_V2_FRAME_MAX_BYTES,
      logPrefix: 'ProtocolV2 WebUSB',
    });
  }
}
```

删除 V2 Session Map、timeout Map、自定义 V2 frame receive 和 V2 迟到 Promise 永久挂起逻辑。实现：

```ts
protected async writeProtocolV2UsbPacket(path: string, frame: Uint8Array) {
  await this.transferOutOnce(path, frame);
}

protected async readProtocolV2UsbPacket(path: string) {
  const device = await this.findDevice(path);
  const endpoints = this.deviceEndpoints.get(path);
  const endpointIn = endpoints?.endpointIn ?? this.endpointId;
  const result = await device.transferIn(endpointIn, PROTOCOL_V2_FRAME_MAX_BYTES);
  const data = this.getTransferInData(result);
  return new Uint8Array(
    this.toArrayBuffer(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength))
  );
}

protected async resetProtocolV2UsbNativeLink(path: string) {
  await this.closeOpenDevice(path);
}
```

`acquire`、`connect`、probe reset、release 和 schema configure 使用与 Node USB 相同的基类生命周期方法。V1 的 `transferInWithRetry`、`transferOutWithRetry` 保持不变。

- [ ] **Step 4：运行 WebUSB 测试确认 GREEN**

```bash
yarn workspace @onekeyfe/hd-transport build
yarn jest \
  packages/hd-transport-web-device/__tests__/webusb-protocol-v2-link.test.ts \
  packages/hd-transport-web-device/__tests__/electron-ble-transport.test.ts \
  --runInBand
yarn workspace @onekeyfe/hd-transport-web-device build
```

Expected: 两个测试套件通过，构建 exit 0。

- [ ] **Step 5：提交 WebUSB 迁移**

```bash
git commit --only -m "refactor(webusb): manage Protocol V2 links through shared base" -- \
  packages/hd-transport-web-device/src/webusb.ts \
  packages/hd-transport-web-device/__tests__/webusb-protocol-v2-link.test.ts
```

## Task 5：整体验证、自审与推送

**Files:**

- All files committed in Tasks 1–4.

- [ ] **Step 1：运行完整相关测试**

```bash
yarn jest \
  packages/hd-transport/__tests__/protocol-v2.test.js \
  packages/hd-transport/__tests__/protocol-v2-link-manager.test.js \
  packages/hd-transport/__tests__/protocol-v2-usb-transport-base.test.js \
  packages/hd-transport-usb/__tests__/protocol-v2-link.test.ts \
  packages/hd-transport-lowlevel/__tests__/protocol-v2.test.js \
  packages/hd-transport-react-native/src/__tests__/bleStrategy.test.ts \
  packages/hd-transport-react-native/src/__tests__/protocolV2Link.test.ts \
  packages/hd-transport-web-device/__tests__/electron-ble-transport.test.ts \
  packages/hd-transport-web-device/__tests__/webusb-protocol-v2-link.test.ts \
  packages/hd-cli/src/__tests__/noble-ble-plugin.test.ts \
  --runInBand
```

- [ ] **Step 2：运行静态检查**

```bash
yarn eslint \
  packages/hd-transport/src/protocols/v2/usb-transport-base.ts \
  packages/hd-transport/__tests__/protocol-v2-usb-transport-base.test.js \
  packages/hd-transport-usb/src/index.ts \
  packages/hd-transport-usb/__tests__/protocol-v2-link.test.ts \
  packages/hd-transport-web-device/src/webusb.ts \
  packages/hd-transport-web-device/__tests__/webusb-protocol-v2-link.test.ts

yarn prettier --check \
  packages/hd-transport/src/protocols/v2/usb-transport-base.ts \
  packages/hd-transport/__tests__/protocol-v2-usb-transport-base.test.js \
  packages/hd-transport-usb/src/index.ts \
  packages/hd-transport-usb/__tests__/protocol-v2-link.test.ts \
  packages/hd-transport-web-device/src/webusb.ts \
  packages/hd-transport-web-device/__tests__/webusb-protocol-v2-link.test.ts
```

- [ ] **Step 3：运行构建**

```bash
yarn workspace @onekeyfe/hd-transport build
yarn workspace @onekeyfe/hd-transport-usb build
yarn workspace @onekeyfe/hd-transport-web-device build
yarn workspace @onekeyfe/hd-transport-lowlevel build
yarn workspace @onekeyfe/hd-transport-react-native build
yarn --cwd packages/hd-cli build
```

- [ ] **Step 4：代码自审**

检查：

- 基类是否引用 Node `usb` 或浏览器 `USBDevice` 类型；
- V1 行为是否被意外改动；
- V2 是否仍存在 Session Map、timeout side-channel 或队列外 assembler reset；
- V2 write 是否仍会自动 reconnect/retry；
- release、schema reset、generation rotation 是否全部失效 Link；
- pending read 是否在 timeout/release 后被旧 generation 隔离；
- 不同 path 是否没有全局串行锁；
- 工作区用户改动是否保持不变。

- [ ] **Step 5：WebUSB 真机验证**

使用本地浏览器测试页和用户手势授权 Pro2 6136，执行：

- Ping；
- DeviceInfoGet；
- 连续调用；
- release/reacquire；
- firmwareUpdateV4 前置探测；
- Node USB 完整升级已成功时，再执行 WebUSB 完整升级和测速。

如果浏览器授权必须由用户点击，先完成所有自动化验证并明确报告仅剩的人工手势步骤，不以单元测试替代真机结论。

- [ ] **Step 6：确认提交和远端差异**

```bash
git diff --check origin/feat/pro2-usb-ble..HEAD
git log --oneline origin/feat/pro2-usb-ble..HEAD
git status --short
```

- [ ] **Step 7：推送**

```bash
git push origin feat/pro2-usb-ble
```

Expected: push 成功，`origin/feat/pro2-usb-ble...HEAD` 为 `0 0`。
