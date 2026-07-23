# CLI Unified Device State and Disposal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 Pro2 CLI 使用统一设备状态、消除版本硬编码，并完整释放 SDK 的连接与 Transport 资源。

**Architecture:** CLI 以 `getDeviceState` 作为新入口，旧 `get-features` 只在 CLI 边界做协议分流。生命周期清理由 Core、Transport 和 common-connect 各自释放自己持有的资源，不依赖 CLI 强制退出掩盖泄漏。

**Tech Stack:** TypeScript、Commander、Jest、OneKey Core/Transport、Node USB

---

### Task 1: CLI 状态命令与旧命令兼容

**Files:**
- Create: `packages/hd-cli/src/deviceStateCommands.ts`
- Create: `packages/hd-cli/src/__tests__/device-state-commands.test.ts`
- Modify: `packages/hd-cli/src/cli.ts`

- [ ] **Step 1: 编写 V1/V2 分流和状态 scope 的失败测试**

```ts
test('Protocol V2 不调用 getFeatures', async () => {
  const sdk = createSdkMock({ protocol: 'V2' });
  await getCompatibleFeatures(sdk, 'pro2');
  expect(sdk.getFeatures).not.toHaveBeenCalled();
});

test('get-state 将 firmware scope 传给 SDK', async () => {
  const sdk = createSdkMock({ protocol: 'V2' });
  await getCanonicalDeviceState(sdk, 'pro2', 'firmware');
  expect(sdk.getDeviceState).toHaveBeenCalledWith('pro2', { scope: 'firmware' });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `yarn workspace @onekeyfe/hardware-cli test device-state-commands.test.ts --runInBand`

Expected: FAIL，提示 `deviceStateCommands` 或导出函数不存在。

- [ ] **Step 3: 实现设备解析、V1/V2 分流和 get-state 命令**

```ts
export async function getCanonicalDeviceState(sdk, connectId, scope) {
  return sdk.getDeviceState(connectId, { scope });
}

export async function getCompatibleFeatures(sdk, connectId) {
  const device = await findSearchDevice(sdk, connectId);
  if (device.state?.protocol === 'V2') {
    return { success: true, payload: device.features };
  }
  return sdk.getFeatures(device.connectId ?? '');
}
```

- [ ] **Step 4: 运行 CLI 定向测试**

Run: `yarn workspace @onekeyfe/hardware-cli test device-state-commands.test.ts --runInBand`

Expected: PASS。

### Task 2: CLI 版本单一来源

**Files:**
- Modify: `packages/hd-cli/src/cli.ts`
- Create: `packages/hd-cli/src/__tests__/cli-version.test.ts`

- [ ] **Step 1: 编写 Commander 版本与 package.json 一致的失败测试**

```ts
import packageJson from '../../package.json';
import { program } from '../cli';

test('使用 package.json 版本', () => {
  expect(program.version()).toBe(packageJson.version);
});
```

- [ ] **Step 2: 运行测试并确认硬编码版本导致失败**

Run: `yarn workspace @onekeyfe/hardware-cli test cli-version.test.ts --runInBand`

Expected: FAIL，实际值为 `1.1.26-alpha.1`。

- [ ] **Step 3: 从发布包 manifest 读取版本**

```ts
const { version: cliVersion } = require('../package.json') as { version: string };
program.version(cliVersion);
```

- [ ] **Step 4: 运行版本测试与构建**

Run: `yarn workspace @onekeyfe/hardware-cli test cli-version.test.ts --runInBand && yarn workspace @onekeyfe/hardware-cli build`

Expected: PASS，构建成功，`node packages/hd-cli/dist/cli.js --version` 输出 package.json 版本。

### Task 3: SDK 生命周期完整清理

**Files:**
- Modify: `packages/hd-transport/src/types/transport.ts`
- Modify: `packages/hd-transport-usb/src/index.ts`
- Modify: `packages/core/src/core/index.ts`
- Modify: `packages/hd-common-connect-sdk/src/index.ts`
- Modify: `packages/hd-cli/src/sdk.ts`
- Create: `packages/core/__tests__/core-dispose.test.ts`
- Create: `packages/hd-transport-usb/src/__tests__/dispose.test.ts`

- [ ] **Step 1: 编写 Core 和 Node USB 清理的失败测试**

```ts
test('Core.dispose 停止连接与 Transport 并重置设备池', async () => {
  core.dispose();
  expect(connector.stop).toHaveBeenCalledTimes(1);
  expect(transport.stop).toHaveBeenCalledTimes(1);
  expect(DevicePool.resetState).toHaveBeenCalledTimes(1);
});

test('NodeUsbTransport.stop 关闭全部打开设备', async () => {
  await transport.stop();
  expect(closeDevice).toHaveBeenCalled();
});
```

- [ ] **Step 2: 运行测试并确认资源未被释放**

Run: `yarn workspace @onekeyfe/hd-core test core-dispose.test.ts --runInBand`

Expected: FAIL，stop/reset mock 未调用。

- [ ] **Step 3: 在资源所有者层实现幂等清理**

```ts
async dispose() {
  pollingManager.stopAll();
  _connector?.stop();
  await Promise.resolve(TransportManager.getTransport()?.stop());
  DevicePool.resetState();
}
```

Node USB 的 `stop()` 同时取消调用、dispose Protocol V2 links、关闭 `openDevices`，common-connect 清空 `_core`。

- [ ] **Step 4: 运行生命周期测试和相关构建**

Run: `yarn workspace @onekeyfe/hd-core test core-dispose.test.ts --runInBand && yarn workspace @onekeyfe/hd-transport-usb build && yarn workspace @onekeyfe/hd-common-connect-sdk build`

Expected: PASS，所有包构建成功。

### Task 4: 集成验证

**Files:**
- Modify: `docs/superpowers/plans/2026-07-23-cli-unified-device-state-and-disposal.md`

- [ ] **Step 1: 运行定向测试、lint 和构建**

Run: `yarn workspace @onekeyfe/hardware-cli test --runInBand && yarn workspace @onekeyfe/hd-core test public-device-state-api.test.ts get-device-state.test.ts core-dispose.test.ts --runInBand && yarn workspace @onekeyfe/hardware-cli build`

Expected: PASS。

- [ ] **Step 2: 使用当前 Pro2 执行真实设备测试**

Run: `node packages/hd-cli/dist/cli.js search && node packages/hd-cli/dist/cli.js get-state --connect-id <serial> && node packages/hd-cli/dist/cli.js get-state --connect-id <serial> --scope firmware && node packages/hd-cli/dist/cli.js get-features --connect-id <serial>`

Expected: 均成功；Pro2 的 `get-features` 不再返回 415；每个 CLI 进程在输出后立即退出。

- [ ] **Step 3: 检查工作区变更并提交**

Run: `git diff --check && git status --short`

Expected: 无空白错误，只包含本计划范围内的文件。
