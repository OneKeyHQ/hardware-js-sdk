# Pro2 Wallpaper Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Protocol V2/Pro2 增加 RGBA 到 LVGL v9 bin 的编码与壁纸上传高层 API，并在 Expo Playground Pro2 Debug 中支持 PNG、JPEG 和 WebP 上传测试。

**Architecture:** core 中使用纯 TypeScript 编码器处理固定 604×1024 RGBA，上传方法通过 Protocol V2 文件系统写入 `vol0:/wallpapers/user` 并设置 `wallpaper_path`。Playground 使用浏览器 Canvas 解码通用图片并按 cover 规则裁剪，避免 core 依赖 DOM 或平台图片库。

**Tech Stack:** TypeScript、Jest、Protocol V2 `FilesystemFileWrite`/`DeviceSettingsSet`、React 18、Canvas API。

---

### Task 1: LVGL v9 壁纸编码器

**Files:**
- Create: `packages/core/src/utils/pro2Wallpaper.ts`
- Create: `packages/core/__tests__/pro2Wallpaper.test.ts`

- [ ] **Step 1: 写编码器失败测试**

覆盖输入长度校验、不透明像素选择 RGB565、透明像素选择 RGB565A8、12 字节 header、RGB565 字节序及 alpha 平面布局。测试导入尚不存在的 `encodePro2Wallpaper`，因此首次运行必须失败。

- [ ] **Step 2: 验证红灯**

Run: `yarn workspace @onekeyfe/hd-core test pro2Wallpaper.test.ts --runInBand`

Expected: FAIL，原因是 `../src/utils/pro2Wallpaper` 不存在或导出缺失。

- [ ] **Step 3: 实现最小编码器**

实现并导出：

```ts
export const PRO2_WALLPAPER_WIDTH = 604;
export const PRO2_WALLPAPER_HEIGHT = 1024;

export function encodePro2Wallpaper(options: {
  width: number;
  height: number;
  rgba: Uint8Array | ArrayBuffer;
}): {
  data: Uint8Array;
  colorFormat: 'RGB565' | 'RGB565A8';
};
```

编码规则严格对齐 firmware-pro2 `LVGLImage.py`：LVGL v9 magic `0x19`、AUTO RGB565/RGB565A8、4 字节 stride、主平面后接 A8、RGB565 dithering。

- [ ] **Step 4: 验证绿灯**

Run: `yarn workspace @onekeyfe/hd-core test pro2Wallpaper.test.ts --runInBand`

Expected: PASS。

### Task 2: 抽取可复用 Protocol V2 文件写入 helper

**Files:**
- Modify: `packages/core/src/api/FileWrite.ts`
- Create: `packages/core/src/api/helpers/protocolV2FileWrite.ts`
- Modify: `packages/core/__tests__/protocol-v2.test.ts`

- [ ] **Step 1: 写 helper 行为失败测试**

增加测试，要求公开 `FileWrite` 仍保持现有分块、overwrite 只出现在首块、processed_byte 校验和进度行为；壁纸方法可复用同一 helper。

- [ ] **Step 2: 验证红灯**

Run: `yarn workspace @onekeyfe/hd-core test protocol-v2.test.ts --runInBand`

Expected: 新增 helper 相关断言 FAIL。

- [ ] **Step 3: 最小重构**

将 `dataToUint8Array`、chunk 大小归一化和写入循环提取为无状态 helper；`FileWrite.run()` 仅传入 commands、参数与进度回调。不得改变公开 `fileWrite` 行为。

- [ ] **Step 4: 验证回归**

Run: `yarn workspace @onekeyfe/hd-core test protocol-v2.test.ts --runInBand`

Expected: PASS。

### Task 3: Pro2 壁纸上传 API

**Files:**
- Create: `packages/core/src/api/protocol-v2/DeviceUploadWallpaper.ts`
- Modify: `packages/core/src/api/index.ts`
- Modify: `packages/core/src/core/index.ts`
- Modify: `packages/core/src/inject.ts`
- Modify: `packages/core/src/types/api/index.ts`
- Modify: `packages/core/src/types/api/protocolV2.ts`
- Modify: `packages/core/__tests__/protocol-v2.test.ts`

- [ ] **Step 1: 写上传编排失败测试**

覆盖固定尺寸校验、文件名安全校验、创建目录、目录已存在容错、分块上传、设置 `wallpaper_path`、Protocol V2 守卫、`retry-on-locked` 声明及上传检查点。

- [ ] **Step 2: 验证红灯**

Run: `yarn workspace @onekeyfe/hd-core test protocol-v2.test.ts --runInBand`

Expected: FAIL，原因是 `deviceUploadWallpaper` 方法尚不存在。

- [ ] **Step 3: 实现方法并接入公共导出**

公开类型：

```ts
export type DeviceUploadWallpaperParams = {
  width: number;
  height: number;
  rgba: Uint8Array | ArrayBuffer;
  fileName?: string;
  chunkSize?: number;
};

export type DeviceUploadWallpaperResponse = {
  path: string;
  size: number;
  colorFormat: 'RGB565' | 'RGB565A8';
  message?: string;
};
```

方法使用 `retry-on-locked`，保存 encoded/directoryReady/uploaded 检查点；文件写入成功后调用 `DeviceSettingsSet`，设置失败不删除文件。

- [ ] **Step 4: 验证方法测试与类型**

Run: `yarn workspace @onekeyfe/hd-core test protocol-v2.test.ts --runInBand`

Expected: PASS。

### Task 4: Playground 图片解码与裁剪工具

**Files:**
- Create: `packages/connect-examples/expo-playground/app/utils/pro2WallpaperImage.ts`
- Create: `packages/connect-examples/expo-playground/app/utils/pro2WallpaperImage.test.ts`

- [ ] **Step 1: 写 cover 计算与 MIME 校验失败测试**

覆盖横图、竖图、同宽高比、PNG/JPEG/WebP 接受及其他格式拒绝。

- [ ] **Step 2: 验证红灯**

Run: `yarn workspace onekey-demo-playground jest app/utils/pro2WallpaperImage.test.ts --runInBand`

若该 workspace 没有 Jest script，则使用仓库 Jest 配置直接运行对应测试；Expected: FAIL，原因是工具模块不存在。

- [ ] **Step 3: 实现浏览器适配器**

导出纯函数 `calculateCoverCrop`、`isSupportedWallpaperMimeType`，以及使用 `createImageBitmap`/`HTMLImageElement`、Canvas 输出 604×1024 RGBA 和预览 URL 的异步解码函数。

- [ ] **Step 4: 验证工具测试**

Run: 使用 Step 2 确认可用的同一 Jest 命令。

Expected: PASS。

### Task 5: Pro2 Debug 壁纸上传界面

**Files:**
- Modify: `packages/connect-examples/expo-playground/app/routes/pro2-debug.tsx`
- Modify: `packages/connect-examples/expo-playground/app/data/methods/device.ts`

- [ ] **Step 1: 注册方法配置**

在 device 方法数据中加入 `deviceUploadWallpaper`，并在 Pro2 Settings 分组展示 `Upload Wallpaper`。

- [ ] **Step 2: 增加专用上传卡片**

添加文件选择器 `accept="image/png,image/jpeg,image/webp"`、cover 预览、原始尺寸/MIME/透明度/预计 bin 大小、上传按钮和阶段错误信息。调用现有硬件执行 hook 或 SDK instance 的 `deviceUploadWallpaper`。

- [ ] **Step 3: 类型检查**

Run: `yarn workspace onekey-demo-playground typecheck`

Expected: exit 0。

- [ ] **Step 4: 生产构建**

Run: `yarn workspace onekey-demo-playground build`

Expected: exit 0。

### Task 6: 完整回归验证

**Files:**
- Verify only

- [ ] **Step 1: core 定向测试**

Run: `yarn workspace @onekeyfe/hd-core test pro2Wallpaper.test.ts protocol-v2.test.ts DeviceCommands.test.ts --runInBand`

Expected: 全部 PASS。

- [ ] **Step 2: shared/core 构建**

Run: `yarn workspace @onekeyfe/hd-shared build && yarn workspace @onekeyfe/hd-core build`

Expected: exit 0。

- [ ] **Step 3: Playground 验证**

Run: `yarn workspace onekey-demo-playground typecheck && yarn workspace onekey-demo-playground build`

Expected: exit 0。

- [ ] **Step 4: 检查变更范围**

Run: `git diff --check && git status --short`

Expected: 无空白错误；只包含既有用户改动和本计划相关文件。
