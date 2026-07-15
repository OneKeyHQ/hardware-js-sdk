# Pro 2 Wallpaper Device Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 Pro 2 壁纸上传复用公共 `fileWrite` 的底层分片实现，并通过 `DeviceSettingsSet.settings.wallpaper_path` 激活壁纸。

**Architecture:** 新建一个只负责 Protocol V2 文件分片写入的内部 helper，`FileWrite` 负责公共参数校验和 UI 进度消息适配，`DeviceUploadWallpaper` 负责图片编码、目录准备和壁纸设置。壁纸文件完全上传成功后才调用 `DeviceSettingsSet`，旧 `SetWallpaper` protobuf 定义保留但不再用于该流程。

**Tech Stack:** TypeScript、Jest、Protocol V2 protobuf、Yarn workspaces、ESLint/Rollup。

---

## 文件结构

- 新建 `packages/core/src/api/helpers/protocolV2FileWrite.ts`：统一数据转换、分片大小、偏移推进、进度计算、取消检查和 `FilesystemFileWrite` 调用。
- 新建 `packages/core/__tests__/protocolV2FileWrite.test.ts`：直接验证共享 helper 的分片与异常语义。
- 修改 `packages/core/src/api/FileWrite.ts`：保留公共 API 校验和 UI 事件，委托共享 helper 执行写入。
- 修改 `packages/core/src/api/protocol-v2/DeviceUploadWallpaper.ts`：委托共享 helper 上传并通过 `DeviceSettingsSet` 设置路径。
- 修改 `packages/core/__tests__/protocol-v2.test.ts`：回归验证新壁纸链路和失败边界。
- 修改 `docs/business/device-customization/wallpaper.md`：更新当前用户文档。
- 修改 `packages/connect-examples/expo-playground/app/routes/pro2-debug.tsx`：更新调试页协议说明。

### Task 1: 为共享 Protocol V2 文件写入 helper 建立失败测试

**Files:**
- Create: `packages/core/__tests__/protocolV2FileWrite.test.ts`

- [ ] **Step 1: 编写共享 helper 的失败测试**

```ts
import { HardwareErrorCode } from '@onekeyfe/hd-shared';

import { writeProtocolV2File } from '../src/api/helpers/protocolV2FileWrite';

describe('writeProtocolV2File', () => {
  test('按分片写入并只在首片设置 overwrite', async () => {
    const data = new Uint8Array(4097);
    const typedCall = jest.fn().mockResolvedValue({ message: {} });
    const onProgress = jest.fn();

    const result = await writeProtocolV2File({
      commands: { typedCall } as any,
      path: 'vol0:/wallpapers/user/test.bin',
      data,
      totalSize: data.byteLength,
      overwrite: true,
      onProgress,
    });

    expect(typedCall).toHaveBeenCalledTimes(2);
    expect(typedCall.mock.calls[0][2]).toMatchObject({
      file: { offset: 0, total_size: 4097, data: data.slice(0, 4000) },
      overwrite: true,
      append: false,
      ui_percentage: 0,
    });
    expect(typedCall.mock.calls[1][2]).toMatchObject({
      file: { offset: 4000, total_size: 4097, data: data.slice(4000) },
      overwrite: false,
      append: false,
      ui_percentage: 100,
    });
    expect(result).toMatchObject({ processed_byte: 4097, chunks: 2 });
    expect(onProgress).toHaveBeenLastCalledWith(
      expect.objectContaining({ progress: 100, transferredBytes: 4097, totalBytes: 4097 })
    );
  });

  test('拒绝越过文件末尾的 processed_byte', async () => {
    const typedCall = jest.fn().mockResolvedValue({ message: { processed_byte: 10 } });

    await expect(
      writeProtocolV2File({
        commands: { typedCall } as any,
        path: 'vol0:/wallpapers/user/test.bin',
        data: new Uint8Array([1]),
      })
    ).rejects.toMatchObject({ errorCode: HardwareErrorCode.RuntimeError });
  });
});
```

- [ ] **Step 2: 运行测试并确认因 helper 尚不存在而失败**

Run: `yarn workspace @onekeyfe/hd-core test protocolV2FileWrite.test.ts --runInBand`

Expected: FAIL，错误包含 `Cannot find module '../src/api/helpers/protocolV2FileWrite'`。

### Task 2: 提取共享文件写入实现并保持 FileWrite 行为

**Files:**
- Create: `packages/core/src/api/helpers/protocolV2FileWrite.ts`
- Modify: `packages/core/src/api/FileWrite.ts`
- Test: `packages/core/__tests__/protocolV2FileWrite.test.ts`
- Test: `packages/core/__tests__/protocol-v2.test.ts`

- [ ] **Step 1: 新建共享文件写入 helper**

在 `packages/core/src/api/helpers/protocolV2FileWrite.ts` 中实现以下接口和行为：

```ts
import {
  PROTOCOL_V2_BLE_FILE_CHUNK_SIZE,
  PROTOCOL_V2_WEBUSB_FILE_CHUNK_SIZE,
} from '@onekeyfe/hd-transport';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { DataManager } from '../../data-manager';

import type { DeviceCommands } from '../../device/DeviceCommands';

export type ProtocolV2FileWriteData = ArrayBuffer | Uint8Array | Blob | string;

export type ProtocolV2FileWriteProgress = {
  progress: number;
  transferredBytes: number;
  totalBytes: number;
  rateBytesPerSecond?: number;
  elapsedMs: number;
};

export type ProtocolV2FileWriteOptions = {
  commands: Pick<DeviceCommands, 'typedCall'>;
  path: string;
  data: ProtocolV2FileWriteData;
  offset?: number;
  totalSize?: number;
  chunkSize?: number;
  chunkLen?: number;
  overwrite?: boolean;
  append?: boolean;
  uiPercentage?: number;
  timeoutMs?: number;
  throwIfAborted?: () => void;
  onProgress?: (progress: ProtocolV2FileWriteProgress) => void;
};

const MIN_FILE_CHUNK_SIZE = 64;

function getProtocolV2FileChunkLimit() {
  const env = DataManager.getSettings('env');
  return env && DataManager.isBleConnect(env)
    ? PROTOCOL_V2_BLE_FILE_CHUNK_SIZE
    : PROTOCOL_V2_WEBUSB_FILE_CHUNK_SIZE;
}

async function dataToUint8Array(data: ProtocolV2FileWriteData): Promise<Uint8Array> {
  if (typeof data === 'string') return new TextEncoder().encode(data);
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    return new Uint8Array(await data.arrayBuffer());
  }
  throw ERRORS.TypedError(
    HardwareErrorCode.CallMethodInvalidParameter,
    'Unsupported FilesystemFileWrite data'
  );
}

function normalizeChunkSize(value: unknown, maxChunkSize: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return maxChunkSize;
  return Math.min(Math.max(Math.floor(numeric), MIN_FILE_CHUNK_SIZE), maxChunkSize);
}

function getDeviceTransferProgress(before: number, after: number, total: number) {
  if (!Number.isFinite(total) || total <= 0) return 100;
  if (before <= 0 && after < total) return 0;
  if (after >= total) return 100;
  return Math.min(Math.max(Math.ceil((after / total) * 100), 1), 99);
}

function getConfirmedProgress(processed: number, total: number, written: number, length: number) {
  if (Number.isFinite(processed) && Number.isFinite(total) && total > 0) {
    if (processed >= total) return 100;
    return Math.min(Math.max(Math.floor((processed / total) * 100), 0), 99);
  }
  if (length > 0) return written >= length ? 100 : Math.floor((written / length) * 100);
  return 100;
}

export async function writeProtocolV2File(options: ProtocolV2FileWriteOptions) {
  options.throwIfAborted?.();
  const data = await dataToUint8Array(options.data);
  const dataLength = data.byteLength;
  const startOffset = Number.isFinite(options.offset) && Number(options.offset) > 0
    ? Number(options.offset)
    : 0;
  const totalSize = Number.isFinite(options.totalSize) && Number(options.totalSize) > 0
    ? Number(options.totalSize)
    : startOffset + dataLength;

  if (totalSize < startOffset + dataLength) {
    throw ERRORS.TypedError(
      HardwareErrorCode.RuntimeError,
      `FilesystemFileWrite totalSize ${totalSize} is smaller than offset + data length ${startOffset + dataLength}`
    );
  }

  const chunkSize = normalizeChunkSize(
    options.chunkSize ?? options.chunkLen,
    getProtocolV2FileChunkLimit()
  );
  let written = 0;
  let chunks = 0;
  let lastMessage: Record<string, unknown> | undefined;
  const startTime = Date.now();

  while (written < dataLength) {
    options.throwIfAborted?.();
    const chunk = data.slice(written, Math.min(written + chunkSize, dataLength));
    const offset = startOffset + written;
    const progress = options.uiPercentage
      ?? getDeviceTransferProgress(offset, offset + chunk.byteLength, totalSize);
    const response = await options.commands.typedCall(
      'FilesystemFileWrite',
      'FilesystemFile',
      {
        file: { path: options.path, offset, total_size: totalSize, data: chunk },
        overwrite: chunks === 0 ? options.overwrite ?? false : false,
        append: options.append ?? false,
        ui_percentage: progress,
      },
      { timeoutMs: options.timeoutMs }
    );
    options.throwIfAborted?.();
    lastMessage = response.message;
    const processedByte = Number(response.message?.processed_byte);
    written = Number.isFinite(processedByte) && processedByte > offset
      ? processedByte - startOffset
      : written + chunk.byteLength;
    if (written > dataLength) {
      throw ERRORS.TypedError(
        HardwareErrorCode.RuntimeError,
        `FilesystemFileWrite invalid processed_byte ${processedByte}`
      );
    }
    chunks += 1;
    const elapsedMs = Date.now() - startTime;
    const transferredBytes = Math.min(written, dataLength);
    options.onProgress?.({
      progress: getConfirmedProgress(startOffset + written, totalSize, written, dataLength),
      transferredBytes,
      totalBytes: dataLength,
      rateBytesPerSecond: elapsedMs > 0
        ? Math.round((transferredBytes / elapsedMs) * 1000)
        : undefined,
      elapsedMs,
    });
  }

  return {
    ...lastMessage,
    path: options.path,
    offset: startOffset,
    total_size: totalSize,
    processed_byte: startOffset + written,
    chunks,
  };
}
```

- [ ] **Step 2: 让 FileWrite 委托共享 helper**

删除 `FileWrite.ts` 中已经迁移的分片辅助函数和传输常量导入，新增：

```ts
import { writeProtocolV2File } from './helpers/protocolV2FileWrite';
```

将 `run()` 替换为：

```ts
async run() {
  return writeProtocolV2File({
    commands: this.device.commands,
    path: this.params.path,
    data: this.params.data,
    offset: this.params.offset,
    totalSize: this.params.totalSize,
    chunkSize: this.params.chunkSize,
    chunkLen: this.params.chunkLen,
    overwrite: this.params.overwrite,
    append: this.params.append,
    uiPercentage: this.params.uiPercentage,
    timeoutMs: this.params.timeoutMs === undefined ? undefined : Number(this.params.timeoutMs),
    throwIfAborted: () => this.throwIfAborted(),
    onProgress: payload => {
      if (typeof this.postMessage === 'function') {
        this.postMessage(createUiMessage(UI_REQUEST.DEVICE_PROGRESS, payload));
      }
    },
  });
}
```

- [ ] **Step 3: 运行共享 helper 和现有 FileWrite 测试**

Run: `yarn workspace @onekeyfe/hd-core test protocolV2FileWrite.test.ts protocol-v2.test.ts --runInBand`

Expected: PASS；`Protocol V2 file write method` 现有分片、BLE 限制和进度断言保持通过。

- [ ] **Step 4: 提交共享写入重构**

```bash
git add packages/core/src/api/helpers/protocolV2FileWrite.ts packages/core/src/api/FileWrite.ts packages/core/__tests__/protocolV2FileWrite.test.ts
git commit -m "refactor(core): share protocol v2 file writer"
```

### Task 3: 用 DeviceSettingsSet 激活壁纸

**Files:**
- Modify: `packages/core/__tests__/protocol-v2.test.ts`
- Modify: `packages/core/src/api/protocol-v2/DeviceUploadWallpaper.ts`

- [ ] **Step 1: 先修改壁纸回归测试**

将成功测试中的 mock 和末尾断言改为：

```ts
if (request === 'DeviceSettingsSet') return { message: { message: 'wallpaper applied' } };

expect(typedCall).toHaveBeenLastCalledWith('DeviceSettingsSet', 'Success', {
  settings: { wallpaper_path: result.path },
});
expect(typedCall.mock.calls.some(call => call[0] === 'SetWallpaper')).toBe(false);
```

再增加上传失败测试：

```ts
test('文件上传失败时不修改 wallpaper_path', async () => {
  const typedCall = jest.fn().mockImplementation(request => {
    if (request === 'FilesystemDirMake') return { message: {} };
    if (request === 'FilesystemFileWrite') throw new Error('write failed');
    return { message: {} };
  });
  const method = new DeviceUploadWallpaper({
    id: 1,
    payload: {
      method: 'deviceUploadWallpaper',
      width: 604,
      height: 1024,
      rgba: new Uint8Array(604 * 1024 * 4),
    },
  });
  (method as any).device = stubDevice({ commands: { typedCall } });
  method.init();

  await expect(method.run()).rejects.toThrow('write failed');
  expect(typedCall.mock.calls.some(call => call[0] === 'DeviceSettingsSet')).toBe(false);
});
```

- [ ] **Step 2: 运行壁纸测试并确认旧实现失败**

Run: `yarn workspace @onekeyfe/hd-core test protocol-v2.test.ts --runInBand -t DeviceUploadWallpaper`

Expected: FAIL；旧实现仍发送 `SetWallpaper`，成功测试出现 `Unexpected request: SetWallpaper`。

- [ ] **Step 3: 修改 DeviceUploadWallpaper 使用共享 helper 和 DeviceSettingsSet**

移除 `WallpaperTarget`、文件分片常量和 `DataManager` 导入，新增：

```ts
import { writeProtocolV2File } from '../helpers/protocolV2FileWrite';
```

删除 `getDefaultChunkSize()`，将 `upload()` 替换为：

```ts
private async upload() {
  if (this.uploaded) return;
  const encoded = this.encoded;
  if (!encoded) throw invalidParameter('Wallpaper data has not been initialized.');

  await writeProtocolV2File({
    commands: this.device.commands,
    path: this.path,
    data: encoded.data,
    totalSize: encoded.data.byteLength,
    chunkSize: this.params.chunkSize,
    overwrite: true,
    append: false,
    throwIfAborted: () => this.throwIfAborted(),
  });
  this.uploaded = true;
}
```

将 `run()` 中最后一次设备调用替换为：

```ts
const response = await this.device.commands.typedCall('DeviceSettingsSet', 'Success', {
  settings: { wallpaper_path: this.path },
});
```

- [ ] **Step 4: 运行壁纸与文件写入测试并确认通过**

Run: `yarn workspace @onekeyfe/hd-core test protocolV2FileWrite.test.ts protocol-v2.test.ts pro2Wallpaper.test.ts --runInBand`

Expected: PASS；壁纸测试明确没有 `SetWallpaper` 调用。

- [ ] **Step 5: 提交壁纸链路修正**

```bash
git add packages/core/src/api/protocol-v2/DeviceUploadWallpaper.ts packages/core/__tests__/protocol-v2.test.ts
git commit -m "fix(core): set pro2 wallpaper through device settings"
```

### Task 4: 同步当前文档和 Playground 描述

**Files:**
- Modify: `docs/business/device-customization/wallpaper.md`
- Modify: `packages/connect-examples/expo-playground/app/routes/pro2-debug.tsx`

- [ ] **Step 1: 更新壁纸用户文档**

将上传流程第 6 步改为：

```md
6. 上传完成后调用 `DeviceSettingsSet`，将 `settings.wallpaper_path` 设置为上传路径。
```

将恢复默认壁纸说明改为：

```md
通过 `deviceSettingsSet({ settings: { wallpaper_path: '' } })` 可恢复设备内置默认壁纸。
```

在关键代码中补充：

```md
- `packages/core/src/api/helpers/protocolV2FileWrite.ts`
- `packages/core/src/api/protocol-v2/DeviceSettingsSet.ts`
```

- [ ] **Step 2: 更新 Playground 协议展示**

将 `deviceUploadWallpaper.tx` 改为：

```ts
tx: 'FilesystemDirMake + FilesystemFileWrite + DeviceSettingsSet(wallpaper_path)',
```

- [ ] **Step 3: 验证当前文档和示例没有旧链路描述**

Run: `rg -n -S "SetWallpaper|FilesystemDirMake \\+ FilesystemFileWrite \\+ SetWallpaper" docs/business packages/connect-examples/expo-playground/app/routes packages/core/src/api/protocol-v2/DeviceUploadWallpaper.ts`

Expected: 无输出；归档文档和 protobuf 定义不在本次扫描范围内。

- [ ] **Step 4: 提交文档和示例更新**

```bash
git add docs/business/device-customization/wallpaper.md packages/connect-examples/expo-playground/app/routes/pro2-debug.tsx
git commit -m "docs: update pro2 wallpaper settings flow"
```

### Task 5: 完整验证

**Files:**
- Verify: `packages/core/src/api/helpers/protocolV2FileWrite.ts`
- Verify: `packages/core/src/api/FileWrite.ts`
- Verify: `packages/core/src/api/protocol-v2/DeviceUploadWallpaper.ts`
- Verify: `packages/core/__tests__/protocolV2FileWrite.test.ts`
- Verify: `packages/core/__tests__/protocol-v2.test.ts`

- [ ] **Step 1: 运行 core 相关测试**

Run: `yarn workspace @onekeyfe/hd-core test protocolV2FileWrite.test.ts protocol-v2.test.ts pro2Wallpaper.test.ts --runInBand`

Expected: PASS，0 个失败测试。

- [ ] **Step 2: 运行 core lint**

Run: `yarn workspace @onekeyfe/hd-core lint`

Expected: exit code 0，无 ESLint error。

- [ ] **Step 3: 运行 core build/type check**

Run: `yarn workspace @onekeyfe/hd-core build`

Expected: exit code 0，Rollup 和 TypeScript 构建成功。

- [ ] **Step 4: 检查差异和工作树边界**

Run: `git diff --check && git status --short`

Expected: `git diff --check` 无输出；状态只包含用户原有改动和本计划产生但尚未提交的预期文件。

- [ ] **Step 5: 汇总验收证据**

确认以下项目均有测试或命令输出支持：

- `deviceUploadWallpaper` 不发送 `SetWallpaper`。
- `FileWrite` 和 `DeviceUploadWallpaper` 共享同一个分片写入 helper。
- 上传完成后发送 `DeviceSettingsSet.settings.wallpaper_path`。
- 上传失败时不发送 `DeviceSettingsSet`。
- 当前文档和 Playground 不再描述旧链路。
